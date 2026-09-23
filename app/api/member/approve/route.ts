import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { parseWalletDoc, type CreditOrder } from "@/lib/member/wallet";
import { mutateRegistry } from "@/lib/member/wallet-server";

// 遗留限时会员天数（仅用于老申请单的兼容处理）
const PLAN_DAYS: Record<string, number> = {
  "1day": 1, "3day": 3, "30day": 30,
};

/**
 * 兼容入口：管理端一键通过某用户最早的一笔待审核申请。
 * 新版管理后台请使用 /api/admin/orders/review（按订单号操作，支持拒绝与撤销）。
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, user: admin } = guard.ctx;

  let body: { userId?: string } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "无效的请求数据" }, { status: 400 }); }
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

  const { data: target, error: fetchError } = await db
    .from("users")
    .select("id, email, pending_plan")
    .eq("id", userId)
    .single();

  if (fetchError || !target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const wallet = parseWalletDoc(target.pending_plan);
  const now = new Date().toISOString();
  const reviewer = admin.email || admin.id;
  const state: { approved?: CreditOrder; legacyDays?: number } = {};

  // 遗留限时会员
  const legacyDays = PLAN_DAYS[wallet.legacy || ""];
  if (legacyDays) {
    const memberUntil = new Date(Date.now() + legacyDays * 86400000).toISOString();
    const { error } = await db.from("users").update({ member_until: memberUntil }).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, member_until: memberUntil, email: target.email });
  }

  const pendingOrder = [...wallet.orders]
    .filter((o) => o.status === "pending")
    .sort((a, b) => (a.appliedAt < b.appliedAt ? -1 : 1))[0];

  if (!pendingOrder) {
    return NextResponse.json({ error: "该用户没有待审核的申请（可能已被处理）" }, { status: 400 });
  }

  const result = await mutateRegistry(db, userId, (registry) => {
    const decided = registry.entries.find((e) => e.id === pendingOrder.id);
    if (decided && decided.status !== "pending") {
      return { commit: false, value: null };
    }
    const entry: CreditOrder = {
      ...pendingOrder,
      status: "approved",
      reviewedAt: now,
      reviewedBy: reviewer,
    };
    registry.granted += entry.credits;
    registry.entries.push(entry);
    state.approved = entry;
    return { commit: true, value: entry };
  });

  if (!result.ok || !state.approved) {
    return NextResponse.json({ error: result.error || "核发失败，请重试" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    credits: state.approved.credits,
    orderId: state.approved.id,
    email: target.email,
  });
}
