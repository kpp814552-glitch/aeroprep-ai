import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_DAYS: Record<string, number> = {
  "1day": 1, "3day": 3, "30day": 30,
};

export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "无效的请求数据" }, { status: 400 }); }
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

  // First get the user's pending_plan
  const { data: target, error: fetchError } = await supabase
    .from("users")
    .select("id, email, pending_plan")
    .eq("id", userId)
    .single();

  if (fetchError || !target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (!target.pending_plan) return NextResponse.json({ error: "该用户没有待审核的申请" }, { status: 400 });

  const days = PLAN_DAYS[target.pending_plan];
  if (!days) return NextResponse.json({ error: "无效套餐" }, { status: 400 });

  // Set member_until from NOW (admin's click time)
  const memberUntil = new Date(Date.now() + days * 86400000).toISOString();

  const { error: updateError } = await supabase
    .from("users")
    .update({ member_until: memberUntil, pending_plan: null })
    .eq("id", userId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true, member_until: memberUntil, email: target.email });
}
