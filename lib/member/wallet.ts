// ============================================================
// 次数钱包 / 订单账本（服务端权威）
// ------------------------------------------------------------
// 存储位置：public.users.pending_plan (TEXT)
// 该字段历史上用来传递 "credits:N / granted:N / 1day" 之类的握手标记，
// 现在升级为一份 JSON 小账本，同时保留对旧格式的解析，做到平滑迁移：
//
//   {
//     "v": 3,
//     "granted": 12,          // 累计核发次数（只增，管理员调整可增减）
//     "used": 5,              // 累计消耗次数
//     "orders": [ ... ],      // 该用户的订单流水（最近 N 条）
//     "lastConsume": {...}    // 最近一次扣减（幂等用）
//   }
//
// 余额 = granted - used（下限 0），由服务端计算并下发。
// ============================================================

export type OrderStatus = "pending" | "approved" | "rejected" | "revoked";

export type CreditOrder = {
  id: string;
  packId: string;
  credits: number;
  amount: number;
  channel: string;
  status: OrderStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
};

/**
 * 用户自己的账本（存在 public.users.pending_plan，用户/服务端可写自己的行）
 * - used          已消耗的付费次数
 * - orders        用户提交的购买申请（审核结论以 registry 为准）
 * - legacyGranted 旧版遗留 / 迁移进来的次数（不再新增）
 */
export type WalletDoc = {
  v: 3;
  used: number;
  legacyGranted: number;
  orders: CreditOrder[];
  lastConsume?: { key: string; at: string };
  legacy?: string;
};

/**
 * 管理端核发账本（存在 public.site_config，仅管理员可写，所有人可读）
 * - granted  累计核发的付费次数
 * - entries  管理端的审核结论 / 手动调整流水
 */
export type GrantRegistry = {
  v: 3;
  granted: number;
  entries: CreditOrder[];
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
  revoked: "已撤销",
};

/**
 * 每个账号的免费体验次数：与账号绑定，由服务端按"已完成面试条数"计算，
 * 清浏览器缓存 / 换设备都不会重置。
 */
export const FREE_TRIAL_LIMIT = 1;

/**
 * 由服务端事实（已完成面试总数）推导额度使用情况。
 * totalInterviews 来自 interviews 表：用户可以新增、但删不掉（没有 DELETE 策略），
 * 所以它是一份"只会变大"的可信计数，用来做免费/付费的前 N 次划分。
 */
export function deriveUsage(totalInterviews: number, rowUsed: number) {
  const total = Math.max(0, Math.floor(totalInterviews));
  const paidFloor = Math.max(0, total - FREE_TRIAL_LIMIT);
  return {
    freeUsed: Math.min(total, FREE_TRIAL_LIMIT),
    freeLeft: Math.max(0, FREE_TRIAL_LIMIT - total),
    /** 实际扣费的场次：取"账本已扣"与"按面试数推导"的较大值，防止被改小 */
    paidUsed: Math.max(Math.max(0, Math.floor(rowUsed)), paidFloor),
  };
}

/** 订单流水保留条数：优先丢弃最旧的已处理订单，pending 永不丢弃 */
const MAX_ORDERS = 40;

export function emptyWallet(): WalletDoc {
  return { v: 3, used: 0, legacyGranted: 0, orders: [] };
}

export function emptyRegistry(): GrantRegistry {
  return { v: 3, granted: 0, entries: [] };
}

/**
 * 余额 = 管理端核发 − 已消耗
 * 注意：doc.legacyGranted 只用于历史兼容展示，**不参与余额计算**，
 * 因为它写在"用户自己也能改"的行里，不能作为发次数的依据。
 * 旧版遗留次数统一走"迁移申请 → 管理员核发"的链路进入 registry。
 */
export function walletBalance(doc: WalletDoc, registry?: GrantRegistry): number {
  return Math.max(0, Math.floor(registry?.granted || 0) - Math.floor(doc.used));
}

export function totalGranted(doc: WalletDoc, registry?: GrantRegistry): number {
  return Math.max(0, Math.floor(registry?.granted || 0));
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return value === "pending" || value === "approved" || value === "rejected" || value === "revoked";
}

function normalizeOrder(raw: unknown): CreditOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : "";
  if (!id) return null;
  const credits = toInt(o.credits, 0);
  if (credits <= 0 || credits > 100000) return null;
  return {
    id,
    packId: typeof o.packId === "string" && o.packId ? o.packId : `c${credits}`,
    credits,
    amount: Number.isFinite(Number(o.amount)) ? Number(o.amount) : credits * 2,
    channel: typeof o.channel === "string" && o.channel ? o.channel : "wechat",
    status: isOrderStatus(o.status) ? o.status : "pending",
    appliedAt: typeof o.appliedAt === "string" ? o.appliedAt : new Date(0).toISOString(),
    reviewedAt: typeof o.reviewedAt === "string" ? o.reviewedAt : undefined,
    reviewedBy: typeof o.reviewedBy === "string" ? o.reviewedBy : undefined,
    note: typeof o.note === "string" ? o.note : undefined,
  };
}

/**
 * 解析 pending_plan：支持 v3 JSON 账本 + 全部历史格式。
 * 历史格式：
 *   "credits:N"  用户申请 N 次（待审核）
 *   "granted:N"  旧版已核发 N 次（等待客户端领取）
 *   "1day/3day/30day"  遗留限时会员申请
 */
export function parseWalletDoc(raw: unknown): WalletDoc {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return emptyWallet();

  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const orders = Array.isArray(parsed.orders)
        ? parsed.orders.map(normalizeOrder).filter((o): o is CreditOrder => !!o)
        : [];
      const lastConsumeRaw = parsed.lastConsume as Record<string, unknown> | undefined;
      const doc: WalletDoc = {
        v: 3,
        used: Math.max(0, toInt(parsed.used, 0)),
        // 兼容上一版把 granted 直接写在用户行里的账本
        legacyGranted: Math.max(0, toInt(parsed.legacyGranted, toInt(parsed.granted, 0))),
        orders,
      };
      if (lastConsumeRaw && typeof lastConsumeRaw.key === "string") {
        doc.lastConsume = {
          key: lastConsumeRaw.key,
          at: typeof lastConsumeRaw.at === "string" ? lastConsumeRaw.at : new Date().toISOString(),
        };
      }
      if (typeof parsed.legacy === "string" && parsed.legacy) doc.legacy = parsed.legacy;
      return doc;
    } catch {
      // JSON 损坏：退化为一份带备注的空账本，避免把用户数据写坏
      return { ...emptyWallet(), legacy: text.slice(0, 200) };
    }
  }

  const creditsMatch = text.match(/^credits:(\d+)$/);
  if (creditsMatch) {
    const credits = toInt(creditsMatch[1], 0);
    const doc = emptyWallet();
    if (credits > 0 && credits <= 100000) {
      doc.orders.push({
        id: `LEGACY-${Date.now().toString(36).toUpperCase()}`,
        packId: `c${credits}`,
        credits,
        amount: credits * 2,
        channel: "wechat",
        status: "pending",
        appliedAt: new Date().toISOString(),
        note: "旧版申请记录（自动迁移）",
      });
    }
    return doc;
  }

  const grantedMatch = text.match(/^granted:(\d+)$/);
  if (grantedMatch) {
    const credits = toInt(grantedMatch[1], 0);
    const doc = emptyWallet();
    if (credits > 0 && credits <= 100000) {
      doc.legacyGranted = credits;
      doc.orders.push({
        id: `LEGACY-${Date.now().toString(36).toUpperCase()}`,
        packId: `c${credits}`,
        credits,
        amount: credits * 2,
        channel: "wechat",
        status: "approved",
        appliedAt: new Date().toISOString(),
        note: "旧版核发记录（自动迁移）",
      });
    }
    return doc;
  }

  // 遗留限时会员标记原样保留，由 approve 流程处理
  return { ...emptyWallet(), legacy: text };
}

export function serializeWalletDoc(doc: WalletDoc): string {
  const orders = trimOrders(doc.orders);
  const out: WalletDoc = {
    v: 3,
    used: Math.max(0, toInt(doc.used, 0)),
    legacyGranted: Math.max(0, toInt(doc.legacyGranted, 0)),
    orders,
  };
  if (doc.lastConsume) out.lastConsume = doc.lastConsume;
  if (doc.legacy) out.legacy = doc.legacy;
  return JSON.stringify(out);
}

export function parseRegistry(raw: unknown): GrantRegistry {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text || !text.startsWith("{")) return emptyRegistry();
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.map(normalizeOrder).filter((o): o is CreditOrder => !!o)
      : [];
    return {
      v: 3,
      granted: Math.max(0, toInt(parsed.granted, 0)),
      entries,
    };
  } catch {
    return emptyRegistry();
  }
}

export function serializeRegistry(registry: GrantRegistry): string {
  return JSON.stringify({
    v: 3,
    granted: Math.max(0, toInt(registry.granted, 0)),
    entries: trimOrders(registry.entries),
  });
}

/** 合并"用户申请"与"管理端结论"，管理端结论优先 */
export function mergeOrders(userOrders: CreditOrder[], registry?: GrantRegistry): CreditOrder[] {
  const byId = new Map<string, CreditOrder>();
  for (const order of userOrders) byId.set(order.id, order);
  for (const entry of registry?.entries || []) {
    const existing = byId.get(entry.id);
    byId.set(entry.id, existing ? { ...existing, ...entry, appliedAt: existing.appliedAt } : entry);
  }
  return sortOrdersDesc([...byId.values()]);
}

function trimOrders(orders: CreditOrder[]): CreditOrder[] {
  if (orders.length <= MAX_ORDERS) return orders;
  const pending = orders.filter((o) => o.status === "pending");
  const rest = orders
    .filter((o) => o.status !== "pending")
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1))
    .slice(0, Math.max(0, MAX_ORDERS - pending.length));
  return [...pending, ...rest].sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}

export function findOrder(doc: WalletDoc, orderId: string): CreditOrder | undefined {
  return doc.orders.find((o) => o.id === orderId);
}

/** 用户尚未处理的申请（用于防止重复提交） */
export function findPendingOrder(doc: WalletDoc, packId?: string): CreditOrder | undefined {
  return doc.orders.find((o) => o.status === "pending" && (!packId || o.packId === packId));
}

export function sortOrdersDesc<T extends CreditOrder>(orders: T[]): T[] {
  return [...orders].sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}
