import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { orderId, planId } = await request.json();
  if (!orderId || !planId) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

  // Save pending application on the users table (member_until column)
  const { error } = await supabase
    .from("users")
    .update({ pending_plan: planId })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
