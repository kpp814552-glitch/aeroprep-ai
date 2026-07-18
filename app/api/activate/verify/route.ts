import { NextResponse } from "next/server";
import crypto from "crypto";
import type { PlanId } from "@/lib/member/member-storage";

const PLANS: Record<string, { days: number }> = {
  "1day": { days: 1 }, "3day": { days: 3 }, "30day": { days: 30 },
};
const SECRET = process.env.PAYMENT_SECRET || "aeroprep-dev-secret-2026";

export async function POST(request: Request) {
  try {
    const { plan, email, token } = await request.json();
    if (!plan || !email || !token) {
      return NextResponse.json({ success: false, error: "参数不完整" }, { status: 400 });
    }

    const planInfo = PLANS[plan as PlanId];
    if (!planInfo) {
      return NextResponse.json({ success: false, error: "无效套餐" }, { status: 400 });
    }

    // Verify HMAC signature
    const payload = JSON.stringify({ email: email.toLowerCase(), plan, days: planInfo.days, ts: "*" });
    const basePayload = payload.replace('"*"', '"*"');

    // We need to find the valid ts - try recent timestamps (within last 7 days)
    const now = Date.now();
    let valid = false;
    for (let offset = 0; offset < 7 * 24 * 60 * 60 * 1000; offset += 60000) {
      const ts = now - offset;
      const testPayload = JSON.stringify({ email: email.toLowerCase(), plan, days: planInfo.days, ts });
      const hmac = crypto.createHmac("sha256", SECRET);
      hmac.update(testPayload);
      if (hmac.digest("hex") === token) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      return NextResponse.json({ success: false, error: "激活链接无效或已过期" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "验证失败" }, { status: 500 });
  }
}
