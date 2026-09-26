import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findOrder, walletBalance, type CreditOrder, type OrderStatus } from "@/lib/member/wallet";
import { PACKS, loadRegistry, loadWallet, makeOrderId, mutateWallet } from "@/lib/member/wallet-server";

const MAX_PENDING = 5;

/**
 * 用户提交购买申请 → 生成一条服务端订单（status=pending）
 * 管理员审核通过后，次数才会写入钱包。
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { packId?: string; orderId?: string; note?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const pack = body.packId ? PACKS[body.packId] : undefined;
  if (!pack) return NextResponse.json({ error: "无效的次数包" }, { status: 400 });

  const orderId = (body.orderId && String(body.orderId).trim()) || makeOrderId();

  // 管理端核发账本：用户账本里可能残留"已审核但没同步"的订单，
  // 必须先合并出真实状态，否则历史 pending 会一直占着待审核名额。
  const registryRow = await loadRegistry(supabase, user.id);
  const decidedById = new Map<string, OrderStatus>();
  for (const entry of ("error" in registryRow ? [] : registryRow.registry.entries)) {
    decidedById.set(entry.id, entry.status);
  }

  const result = await mutateWallet(supabase, user.id, (doc) => {
    // 自愈：把管理端已有结论的订单状态同步回用户账本
    let healed = false;
    for (const order of doc.orders) {
      const decided = decidedById.get(order.id);
      if (decided && decided !== order.status) {
        order.status = decided;
        healed = true;
      }
    }

    const existing = findOrder(doc, orderId);
    if (existing) return { commit: healed, value: existing };

    const pendingCount = doc.orders.filter((o) => o.status === "pending").length;
    if (pendingCount >= MAX_PENDING) {
      return { commit: healed, value: null };
    }

    const order: CreditOrder = {
      id: orderId,
      packId: body.packId as string,
      credits: pack.credits,
      amount: pack.amount,
      channel: "wechat",
      status: "pending",
      appliedAt: new Date().toISOString(),
      note: body.note ? String(body.note).slice(0, 200) : undefined,
    };
    doc.orders.push(order);
    return { commit: true, value: order };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "提交失败，请重试" }, { status: 500 });
  }
  if (!result.value) {
    return NextResponse.json({ error: "你有待审核的订单尚未处理，请等待管理员核对" }, { status: 429 });
  }

  const registry = "error" in registryRow ? undefined : registryRow.registry;
  const row = await loadWallet(supabase, user.id);
  const left = "error" in row ? 0 : walletBalance(row.doc, registry);

  return NextResponse.json({
    success: true,
    order: result.value,
    wallet: { left },
  });
}
