// ============================================================
// 会员 / 计费存储层
// 现行模式：按次收费（¥2/次），免费试用 3 次
// 遗留模式：限时会员（1天/3天/30天），保留兼容至过期
// ============================================================

// ---------- 遗留：限时会员 ----------
export type PlanId = "1day" | "3day" | "30day";

export type PlanInfo = {
  id: PlanId;
  label: string;
  price: string;
  priceNum: number;
  days: number;
  desc: string;
  recommended?: boolean;
};

/** @deprecated 仅用于遗留激活页与历史数据兼容 */
export const PLANS: PlanInfo[] = [
  { id: "1day", label: "1天限时会员", price: "3.99元", priceNum: 3.99, days: 1, desc: "24小时全站功能无限制开放" },
  { id: "3day", label: "3天限时会员", price: "5.99元", priceNum: 5.99, days: 3, desc: "72小时全站功能无限制开放" },
  { id: "30day", label: "30天月度会员", price: "9.99元", priceNum: 9.99, days: 30, desc: "30天全站不限次使用", recommended: true },
];

export type MemberInfo = { plan: PlanId; activatedAt: string; expiresAt: string } | null;

// ---------- 现行：按次收费 ----------
export const PRICE_PER_INTERVIEW = 2;
export const FREE_TRIAL_LIMIT = 3;

export type CreditPack = {
  id: string;
  credits: number;
  price: number;
  label: string;
  desc: string;
  recommended?: boolean;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "c1", credits: 1, price: 2, label: "1 次面试", desc: "单次体验，随时开练" },
  { id: "c5", credits: 5, price: 10, label: "5 次面试", desc: "适合面试前集中突击", recommended: true },
  { id: "c10", credits: 10, price: 20, label: "10 次面试", desc: "完整备战周期，长期陪伴" },
];

const MEMBER_KEY = "aeroprep_member";
const COUNT_KEY = "aeroprep_free_count";
const CREDIT_KEY = "aeroprep_credits";

// ---------- 遗留会员（只读兼容） ----------
export function getMember(): MemberInfo {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as NonNullable<MemberInfo>;
    if (new Date(m.expiresAt) < new Date()) {
      localStorage.removeItem(MEMBER_KEY);
      return null;
    }
    return m;
  } catch { return null; }
}

/** @deprecated 限时会员激活（遗留激活页使用） */
export function activateMember(planId: PlanId): MemberInfo {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const now = new Date();
  const expires = new Date(now.getTime() + plan.days * 86400000);
  const info: NonNullable<MemberInfo> = { plan: planId, activatedAt: now.toISOString(), expiresAt: expires.toISOString() };
  localStorage.setItem(MEMBER_KEY, JSON.stringify(info));
  localStorage.removeItem(COUNT_KEY);
  return info;
}

export function activateFromServer(expiresAt: string, planId?: PlanId): MemberInfo {
  if (new Date(expiresAt) < new Date()) return null;
  const planIdValue: PlanId = (planId && PLANS.some((p) => p.id === planId)) ? planId : "30day";
  const info: NonNullable<MemberInfo> = {
    plan: planIdValue,
    activatedAt: new Date().toISOString(),
    expiresAt,
  };
  localStorage.setItem(MEMBER_KEY, JSON.stringify(info));
  return info;
}

/** 是否持有有效的遗留限时会员 */
export function isMember(): boolean {
  return getMember() !== null;
}

export function getExpiresAt(): string | null {
  const m = getMember();
  return m ? m.expiresAt : null;
}

export function getMemberRemainingSeconds(): number {
  const m = getMember();
  if (!m) return 0;
  return Math.max(0, Math.floor((new Date(m.expiresAt).getTime() - Date.now()) / 1000));
}

// ---------- 按次计费 ----------
export function getCredits(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = parseInt(localStorage.getItem(CREDIT_KEY) || "0", 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch { return 0; }
}

export function addCredits(count: number): number {
  if (typeof window === "undefined" || !Number.isFinite(count) || count <= 0) return getCredits();
  const next = getCredits() + Math.floor(count);
  localStorage.setItem(CREDIT_KEY, String(next));
  return next;
}

export function setCredits(count: number): number {
  if (typeof window === "undefined") return 0;
  const next = Math.max(0, Math.floor(count));
  localStorage.setItem(CREDIT_KEY, String(next));
  return next;
}

// ---------- 免费试用 ----------
export function getFreeInterviewCount(): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem(COUNT_KEY) || "0", 10) || 0; } catch { return 0; }
}

export function incrementFreeInterviewCount(): number {
  const next = getFreeInterviewCount() + 1;
  localStorage.setItem(COUNT_KEY, String(next));
  return next;
}

export function getRemainingFreeInterviews(): number {
  return Math.max(0, FREE_TRIAL_LIMIT - getFreeInterviewCount());
}

// ---------- 资格与扣减 ----------
/** 是否还能开始一场面试（限时会员 / 免费额度 / 已购次数，任一即可） */
export function canStartInterview(): boolean {
  return isMember() || getRemainingFreeInterviews() > 0 || getCredits() > 0;
}

/**
 * 完成一场面试后扣减额度：优先消耗免费试用，再扣已购次数。
 * 限时会员不扣减。
 */
export function consumeInterviewQuota(): { ok: boolean; usedFree: boolean; creditsLeft: number } {
  if (typeof window === "undefined") return { ok: false, usedFree: false, creditsLeft: 0 };

  if (isMember()) {
    return { ok: true, usedFree: false, creditsLeft: getCredits() };
  }

  if (getRemainingFreeInterviews() > 0) {
    incrementFreeInterviewCount();
    return { ok: true, usedFree: true, creditsLeft: getCredits() };
  }

  const credits = getCredits();
  if (credits > 0) {
    const left = credits - 1;
    localStorage.setItem(CREDIT_KEY, String(left));
    return { ok: true, usedFree: false, creditsLeft: left };
  }

  return { ok: false, usedFree: false, creditsLeft: 0 };
}

/** 汇总当前额度，用于页面展示 */
export function getQuotaSummary(): { isMember: boolean; freeLeft: number; credits: number } {
  return {
    isMember: isMember(),
    freeLeft: getRemainingFreeInterviews(),
    credits: getCredits(),
  };
}

/**
 * 从服务端同步状态：
 * 1) 领取管理员已核发的次数（granted:N 握手协议）
 * 2) 兼容同步遗留限时会员
 */
export async function syncServerMember(): Promise<boolean> {
  try {
    const res = await fetch("/api/member/status");
    if (!res.ok) return false;
    const data = await res.json();
    let changed = false;

    // 管理员核发的次数：领取后通知服务端清除标记
    if (typeof data.grantedCredits === "number" && data.grantedCredits > 0) {
      addCredits(data.grantedCredits);
      fetch("/api/member/ack-grant", { method: "POST" }).catch(() => {});
      changed = true;
    }

    if (data.isMember && data.memberUntil) {
      const existing = getMember();
      if (!existing || new Date(existing.expiresAt) < new Date()) {
        if (activateFromServer(data.memberUntil, (data.planId && PLANS.some(p => p.id === data.planId) ? data.planId as PlanId : undefined))) {
          changed = true;
        }
      }
    }

    return changed;
  } catch {
    return false;
  }
}
