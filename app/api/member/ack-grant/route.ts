import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 原子核销管理员核发标记：WHERE pending_plan = 'granted:N' 才会清空。
 * 并发请求只有一个能匹配成功，从而保证次数只入账一次。
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let credits = 0;
  try {
    const body = await request.json();
    credits = Math.floor(Number(body?.credits) || 0);
  } catch { /* ignore */ }

  if (!credits || credits <= 0) {
    return NextResponse.json({ success: true, cleared: false });
  }

  const { data: updated } = await supabase
    .from("users")
    .update({ pending_plan: null })
    .eq("id", user.id)
    .eq("pending_plan", `granted:${credits}`)
    .select("id");

  const cleared = Array.isArray(updated) && updated.length > 0;
  return NextResponse.json({ success: true, cleared, credits: cleared ? credits : 0 });
}
