import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import {
  mergeOrders,
  parseRegistry,
  parseWalletDoc,
  sortOrdersDesc,
  type CreditOrder,
  type GrantRegistry,
  type OrderStatus,
} from "@/lib/member/wallet";
import { registryKey } from "@/lib/member/wallet-server";

export type AdminOrderRow = CreditOrder & {
  userId: string;
  email: string;
  username: string;
};

const STATUS_SET = new Set(["pending", "approved", "rejected", "revoked"]);

/**
 * 管理端订单总览：把所有用户的订单聚成一张表
 * ?status=pending|approved|rejected|revoked  按状态筛选
 * ?q=关键词                                  按邮箱/用户名/订单号搜索
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, serviceRole, allowlistEnforced } = guard.ctx;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") || "all";
  const keyword = (url.searchParams.get("q") || "").trim().toLowerCase();

  const { data, error } = await db
    .from("users")
    .select("id, email, username, pending_plan, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 管理端核发账本（site_config 中以 credits: 开头的行）
  const { data: registryRows } = await db
    .from("site_config")
    .select("key, value")
    .like("key", "credits:%");

  const registryMap = new Map<string, GrantRegistry>();
  for (const row of registryRows || []) {
    registryMap.set(row.key as string, parseRegistry(row.value));
  }

  const rows: AdminOrderRow[] = [];
  const counts = { pending: 0, approved: 0, rejected: 0, revoked: 0 };
  let approvedAmount = 0;
  let approvedCredits = 0;

  for (const user of data || []) {
    const doc = parseWalletDoc(user.pending_plan);
    const registry = registryMap.get(registryKey(user.id as string));
    for (const order of mergeOrders(doc.orders, registry)) {
      counts[order.status] += 1;
      if (order.status === "approved") {
        approvedAmount += order.amount;
        approvedCredits += order.credits;
      }
      rows.push({
        ...order,
        userId: user.id as string,
        email: (user.email as string) || "",
        username: (user.username as string) || "",
      });
    }
  }

  let filtered = sortOrdersDesc(rows);
  if (STATUS_SET.has(statusParam)) {
    filtered = filtered.filter((o) => o.status === (statusParam as OrderStatus));
  }
  if (keyword) {
    filtered = filtered.filter(
      (o) =>
        o.email.toLowerCase().includes(keyword) ||
        o.username.toLowerCase().includes(keyword) ||
        o.id.toLowerCase().includes(keyword),
    );
  }

  return NextResponse.json({
    orders: filtered.slice(0, 300),
    total: filtered.length,
    counts,
    summary: {
      approvedAmount: Math.round(approvedAmount * 100) / 100,
      approvedCredits,
    },
    meta: { serviceRole, allowlistEnforced, scannedUsers: (data || []).length },
  });
}
