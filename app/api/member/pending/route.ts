import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { mergeOrders, parseRegistry, parseWalletDoc, type GrantRegistry } from "@/lib/member/wallet";
import { registryKey } from "@/lib/member/wallet-server";

/**
 * 兼容入口（旧版管理后台）：返回有待审核申请的用户列表。
 * 新版管理后台请使用 /api/admin/orders。
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db } = guard.ctx;

  const { data, error } = await db
    .from("users")
    .select("id, email, username, pending_plan, created_at")
    .not("pending_plan", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: registryRows } = await db
    .from("site_config")
    .select("key, value")
    .like("key", "credits:%");

  const registryMap = new Map<string, GrantRegistry>();
  for (const row of registryRows || []) {
    registryMap.set(row.key as string, parseRegistry(row.value));
  }

  const applicants = (data || [])
    .map((user) => {
      const doc = parseWalletDoc(user.pending_plan);
      const registry = registryMap.get(registryKey(user.id as string));
      const pending = mergeOrders(doc.orders, registry).find((o) => o.status === "pending");
      if (!pending) return null;
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: pending.appliedAt,
        pending_plan: `credits:${pending.credits}`,
        orderId: pending.id,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ applicants });
}
