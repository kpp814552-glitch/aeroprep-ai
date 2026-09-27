import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 面试历史（跨设备同步）
 * - 带 ?sessionId=xxx：取单场，含完整报告与逐题问答
 * - 不带参数：返回最近若干场的摘要（列表用，不带大字段）
 *
 * 依赖 lib/supabase/interview-report-sync.sql 里新增的列；
 * 还没执行迁移时返回 migrated:false，前端自动退回"只读本机记录"。
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);

  if (sessionId) {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .limit(1);

    if (error) {
      return NextResponse.json({ records: [], migrated: false, reason: error.message });
    }
    return NextResponse.json({ records: data ?? [], migrated: true });
  }

  const { data, error } = await supabase
    .from("interviews")
    .select(
      "id, session_id, role, role_label, company, mode, persona, score, evaluation, strengths, weaknesses, started_at, ended_at, duration_seconds, total_turns, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ records: [], migrated: false, reason: error.message });
  }
  return NextResponse.json({ records: data ?? [], migrated: true });
}
