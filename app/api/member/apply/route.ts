import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PACKS: Record<string, number> = { c1: 1, c5: 5, c10: 10 };

export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "无效的请求数据" }, { status: 400 }); }
  const { orderId, packId } = body;
  const credits = ALLOWED_PACKS[packId];
  if (!orderId || !credits) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

  // 待审核标记：credits:N（管理员通过后改为 granted:N 供客户端领取）
  const { error } = await supabase
    .from("users")
    .update({ pending_plan: `credits:${credits}` })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, credits });
}
