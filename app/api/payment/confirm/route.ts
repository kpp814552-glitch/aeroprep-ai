import { NextResponse } from "next/server";
import crypto from "crypto";
import { PACKS } from "@/lib/member/wallet-server";

const PAYMENT_SECRET = process.env.PAYMENT_SECRET || "aeroprep-dev-secret-2026";

export async function POST(request: Request) {
  try {
    const { orderId, packId } = await request.json();
    const pack = packId ? PACKS[packId] : undefined;
    if (!orderId || !pack) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

    // In production: verify with Alipay API here
    // const alipay = new AlipaySdk({...});
    // const result = await alipay.execute("alipay.trade.query", { out_trade_no: orderId });
    // if (result.tradeStatus !== "TRADE_SUCCESS") throw new Error("支付未完成");

    const amount = pack.amount;
    const credits = pack.credits;
    const payload = JSON.stringify({ orderId, packId, credits, amount, confirmedAt: Date.now() });
    const hmac = crypto.createHmac("sha256", PAYMENT_SECRET);
    hmac.update(payload);
    const token = hmac.digest("hex");

    return NextResponse.json({ success: true, orderId, token, credits, amount });
  } catch {
    return NextResponse.json({ error: "支付确认失败,请稍后重试" }, { status: 500 });
  }
}
