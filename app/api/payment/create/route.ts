import { NextResponse } from "next/server";

const PRICE_PER_INTERVIEW = 2;
const ALLOWED_PACKS: Record<string, number> = { c1: 1, c5: 5, c10: 10 };

export async function POST(request: Request) {
  try {
    const { packId } = await request.json();
    const credits = ALLOWED_PACKS[packId];
    if (!credits) return NextResponse.json({ error: "无效的次数包" }, { status: 400 });

    // 金额由服务端计算，不信任前端传值
    const amount = credits * PRICE_PER_INTERVIEW;
    const orderId = `AP${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return NextResponse.json({ success: true, orderId, amount, credits, packId });
  } catch {
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
