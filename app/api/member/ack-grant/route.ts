import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * @deprecated
 * 旧版"客户端领取次数"握手已废弃：次数现在由服务端钱包直接下发，
 * 客户端无需（也不应）再回写 pending_plan。
 * 保留该接口只为兼容仍在运行的旧页面，永远返回 cleared:false，
 * 避免旧客户端把服务端账本覆盖掉。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  return NextResponse.json({ success: true, cleared: false, credits: 0 });
}
