import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { planId, amount } = await request.json();
    if (!planId || !amount) return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    const orderId = `AP${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return NextResponse.json({ success: true, orderId, amount });
  } catch { return NextResponse.json({ error: "创建订单失败" }, { status: 500 }); }
}
