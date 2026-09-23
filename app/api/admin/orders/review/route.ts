import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { parseWalletDoc, walletBalance, type CreditOrder, type GrantRegistry } from "@/lib/member/wallet";
import { loadRegistry, mutateRegistry } from "@/lib/member/wallet-server";

type Action = "approve" | "reject" | "revoke";

function upsert(registry: GrantRegistry, entry: CreditOrder) {
  const index = registry.entries.findIndex((e) => e.id === entry.id);
  if (index >= 0) registry.entries[index] = entry;
  else registry.entries.push(entry);
}

/**
 * 审核订单（通过 / 拒绝 / 撤销已通过的订单）
 * 写入位置：site_config 里的核发账本 —— 管理员有写权限，且与用户行解耦。
 * 幂等 + 乐观锁：重复点击、并发点击都只会生效一次。
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, user: admin, serviceRole, allowlistEnforced } = guard.ctx;

  let body: { userId?: string; orderId?: string; action?: Action; note?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const { userId, orderId } = body;
  const action = body.action;
  if (!userId || !orderId || !action || !["approve", "reject", "revoke"].includes(action)) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const { data: target } = await db
    .from("users")
    .select("id, email, username, pending_plan")
    .eq("id", userId)
    .single();

  if (!target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const wallet = parseWalletDoc(target.pending_plan);
  const now = new Date().toISOString();
  const reviewer = admin.email || admin.id;
  const state: { failure?: { status: number; error: string }; entry?: CreditOrder } = {};

  const result = await mutateRegistry(db, userId, (registry) => {
    const decided = registry.entries.find((e) => e.id === orderId);
    const requested = wallet.orders.find((o) => o.id === orderId);
    const current = decided || requested;

    if (!current) {
      state.failure = { status: 404, error: "订单不存在" };
      return { commit: false, value: null };
    }

    if (action === "approve") {
      if (current.status !== "pending") {
        state.failure = { status: 409, error: `该订单已是「${current.status}」状态，无需重复通过` };
        return { commit: false, value: null };
      }
      const entry: CreditOrder = {
        ...current,
        status: "approved",
        reviewedAt: now,
        reviewedBy: reviewer,
        note: body.note ? String(body.note).slice(0, 200) : current.note,
      };
      registry.granted += entry.credits;
      upsert(registry, entry);
      state.entry = entry;
      return { commit: true, value: entry };
    }

    if (action === "reject") {
      if (current.status !== "pending") {
        state.failure = { status: 409, error: `该订单已是「${current.status}」状态，无法拒绝` };
        return { commit: false, value: null };
      }
      const entry: CreditOrder = {
        ...current,
        status: "rejected",
        reviewedAt: now,
        reviewedBy: reviewer,
        note: body.note ? String(body.note).slice(0, 200) : current.note,
      };
      upsert(registry, entry);
      state.entry = entry;
      return { commit: true, value: entry };
    }

    // revoke：撤销已通过的订单，扣回对应次数
    if (current.status !== "approved") {
      state.failure = { status: 409, error: "只有已通过的订单才能撤销" };
      return { commit: false, value: null };
    }
    const entry: CreditOrder = {
      ...current,
      status: "revoked",
      reviewedAt: now,
      reviewedBy: reviewer,
      note: body.note ? String(body.note).slice(0, 200) : "管理员撤销",
    };
    registry.granted = Math.max(0, registry.granted - entry.credits);
    upsert(registry, entry);
    state.entry = entry;
    return { commit: true, value: entry };
  });

  if (state.failure) {
    return NextResponse.json({ error: state.failure.error }, { status: state.failure.status });
  }

  if (!result.ok || !result.value) {
    return NextResponse.json(
      {
        error:
          "核发失败：数据库拒绝写入核发账本。请确认 site_config 表存在且管理员具备写入策略（详见 lib/supabase/admin-policies.sql）。",
        detail: result.error,
        meta: { serviceRole, allowlistEnforced },
      },
      { status: 500 },
    );
  }

  const fresh = await loadRegistry(db, userId);
  const left = "error" in fresh ? 0 : walletBalance(wallet, fresh.registry);

  return NextResponse.json({
    success: true,
    order: state.entry,
    wallet: { left },
    email: target.email,
  });
}
