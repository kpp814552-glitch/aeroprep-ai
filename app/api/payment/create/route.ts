import { NextResponse } from "next/server";
import { PACKS } from "@/lib/member/wallet-server";

export async function POST(request: Request) {
  try {
    const { packId } = await request.json();
    const pack = packId ? PACKS[packId] : undefined;
    if (!pack) return NextResponse.json({ error: "无效的次数包" }, { status: 400 });

    // 金额由服务端计算（取自统一的次数包价目表），不信任前端传值
    const amount = pack.amount;
    const credits = pack.credits;
    const orderId = `AP${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return NextResponse.json({ success: true, orderId, amount, credits, packId });
  } catch {
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
