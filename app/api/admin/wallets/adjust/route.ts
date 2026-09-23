import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { parseWalletDoc, walletBalance, type CreditOrder } from "@/lib/member/wallet";
import { loadRegistry, makeOrderId, mutateRegistry } from "@/lib/member/wallet-server";

/**
 * 管理员手动调整次数（线下转账补发 / 误核发扣回 / 活动赠送）
 * body: { email? userId? delta: number, note?: string }
 * delta > 0 补发，delta < 0 扣回
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, user: admin, serviceRole, allowlistEnforced } = guard.ctx;

  let body: { email?: string; userId?: string; delta?: number; note?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const delta = Math.trunc(Number(body.delta) || 0);
  if (!delta) return NextResponse.json({ error: "请填写调整次数" }, { status: 400 });
  if (Math.abs(delta) > 1000) return NextResponse.json({ error: "单次调整不能超过 1000 次" }, { status: 400 });
  if (!body.email && !body.userId) return NextResponse.json({ error: "请提供用户邮箱" }, { status: 400 });

  const baseQuery = db.from("users").select("id, email, username, pending_plan");
  const { data: target, error: findError } = await (body.userId
    ? baseQuery.eq("id", body.userId)
    : baseQuery.eq("email", String(body.email).trim().toLowerCase())
  ).maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "未找到该用户（请确认邮箱是否与注册邮箱一致）" }, { status: 404 });

  const userId = target.id as string;
  const wallet = parseWalletDoc(target.pending_plan);
  const now = new Date().toISOString();
  const reviewer = admin.email || admin.id;
  const state: { blocked?: string; wallet?: { left: number; granted: number } } = {};

  const result = await mutateRegistry(db, userId, (registry) => {
    let applied = delta;

    if (delta < 0) {
      // 扣回时最多扣到余额为 0
      const removable = Math.min(registry.granted, Math.abs(delta));
      if (removable <= 0) {
        state.blocked = "该用户当前可扣回次数为 0（余额可能来自历史迁移）";
        return { commit: false, value: null };
      }
      registry.granted -= removable;
      applied = -removable;
    } else {
      registry.granted += delta;
    }

    const entry: CreditOrder = {
      id: makeOrderId(),
      packId: "manual",
      credits: Math.abs(applied),
      amount: 0,
      channel: "manual",
      status: delta > 0 ? "approved" : "revoked",
      appliedAt: now,
      reviewedAt: now,
      reviewedBy: reviewer,
      note: body.note ? String(body.note).slice(0, 200) : delta > 0 ? "管理员补发" : "管理员扣回",
    };
    registry.entries.push(entry);

    return {
      commit: true,
      value: { left: walletBalance(wallet, registry), granted: registry.granted },
    };
  });

  if (state.blocked) return NextResponse.json({ error: state.blocked }, { status: 409 });

  if (!result.ok || !result.value) {
    return NextResponse.json(
      {
        error: "写入失败：数据库拒绝写入核发账本。请确认 site_config 表存在且管理员具备写入策略。",
        detail: result.error,
        meta: { serviceRole, allowlistEnforced },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, email: target.email, wallet: result.value });
}
