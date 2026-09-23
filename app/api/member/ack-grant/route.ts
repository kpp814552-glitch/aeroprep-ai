import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 客户端确认已领取管理员核发的次数后调用，清除 granted:N 标记，
 * 避免同一笔次数被重复领取。
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("pending_plan")
    .eq("id", user.id)
    .single();

  if (!profile?.pending_plan || !String(profile.pending_plan).startsWith("granted:")) {
    return NextResponse.json({ success: true, cleared: false });
  }

  await supabase.from("users").update({ pending_plan: null }).eq("id", user.id);
  return NextResponse.json({ success: true, cleared: true });
}
