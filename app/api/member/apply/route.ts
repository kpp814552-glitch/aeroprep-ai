import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findOrder, type CreditOrder } from "@/lib/member/wallet";
import { PACKS, makeOrderId, mutateWallet } from "@/lib/member/wallet-server";

/**
 * 兼容入口：用户提交购买申请。
 * 现在统一写成一条服务端订单（pending），由管理端审核后核发。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { orderId?: string; packId?: string } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "无效的请求数据" }, { status: 400 }); }
  const { orderId, packId } = body;
  const pack = packId ? PACKS[packId] : undefined;
  if (!pack) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

  const id = (orderId && String(orderId).trim()) || makeOrderId();

  const result = await mutateWallet<CreditOrder | null>(supabase, user.id, (doc) => {
    const existing = findOrder(doc, id);
    if (existing) return { commit: false, value: existing };

    const order: CreditOrder = {
      id,
      packId: packId as string,
      credits: pack.credits,
      amount: pack.amount,
      channel: "wechat",
      status: "pending",
      appliedAt: new Date().toISOString(),
    };
    doc.orders.push(order);
    return { commit: true, value: order };
  });

  if (!result.ok) return NextResponse.json({ error: result.error || "提交失败" }, { status: 500 });

  return NextResponse.json({ success: true, credits: pack.credits, order: result.value });
}
