import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/member/member-storage";

const PLANS: Record<string, { days: number; label: string }> = {
  "1day": { days: 1, label: "1天会员" },
  "3day": { days: 3, label: "3天会员" },
  "30day": { days: 30, label: "30天会员" },
};
const SECRET = process.env.PAYMENT_SECRET || "aeroprep-dev-secret-2026";

export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { email, planId } = await request.json();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "无效邮箱" }, { status: 400 });
  const plan = PLANS[planId as PlanId];
  if (!plan) return NextResponse.json({ error: "无效套餐" }, { status: 400 });

  const payload = JSON.stringify({ email: email.toLowerCase(), plan: planId, days: plan.days, ts: Date.now() });
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(payload);
  const token = hmac.digest("hex");

  const activateUrl = `${request.headers.get("origin") || "https://www.aeroprep.top"}/activate?plan=${planId}&email=${encodeURIComponent(email.toLowerCase())}&token=${token}`;

  return NextResponse.json({ success: true, url: activateUrl, token });
}
