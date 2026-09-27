import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 一场面试只保存一次；限制频率避免有人刷记录污染统计
  const limited = checkRateLimit(`save:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "保存过于频繁" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 120) : "";
  const report = body.report && typeof body.report === "object" ? body.report : null;
  const turns = Array.isArray(body.turns) ? body.turns : null;

  // 基础字段（老表结构也能写）
  const basePayload = {
    user_id: user.id,
    role: body.role || "",
    role_label: body.role_label || "",
    company: body.company || "",
    mode: body.mode || "",
    persona: body.persona || "",
    score: body.score || 0,
    evaluation: body.evaluation || "",
    strengths: body.strengths || [],
    weaknesses: body.weaknesses || [],
    started_at: body.started_at || new Date().toISOString(),
    ended_at: body.ended_at || new Date().toISOString(),
    duration_seconds: body.duration_seconds || 0,
    total_turns: body.total_turns || 0,
  };

  // ── 跨设备同步：额外写入 session_id / report / turns ──
  // 这三列需要先执行 lib/supabase/interview-report-sync.sql；
  // 没执行时下面的查询会报错，自动退回"只存摘要"的老逻辑，不影响面试流程。
  let supportsFullRecord = Boolean(sessionId);
  let existingId: string | null = null;

  if (sessionId) {
    const { data, error } = await supabase
      .from("interviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .limit(1)
      .maybeSingle();
    if (error) {
      supportsFullRecord = false;
    } else {
      existingId = (data?.id as string | undefined) ?? null;
    }
  }

  const fullPayload = {
    ...basePayload,
    session_id: sessionId || null,
    report,
    turns,
  };
  const isNewRow = !existingId;
  let interview: Record<string, unknown> | null = null;
  let writeError: string | null = null;

  if (existingId) {
    // 同一场面试重复保存（例如报告重试）：更新而不是新增，统计也不会重复累计
    const { data, error } = await supabase
      .from("interviews")
      .update(supportsFullRecord ? fullPayload : basePayload)
      .eq("id", existingId)
      .select()
      .single();
    interview = (data as Record<string, unknown> | null) ?? null;
    writeError = error?.message ?? null;
  } else {
    const first = await supabase
      .from("interviews")
      .insert(supportsFullRecord ? fullPayload : basePayload)
      .select()
      .single();
    interview = (first.data as Record<string, unknown> | null) ?? null;
    writeError = first.error?.message ?? null;

    // 迁移没执行时（缺少新列）退回基础字段再插一次
    if (writeError && supportsFullRecord) {
      const retry = await supabase.from("interviews").insert(basePayload).select().single();
      interview = (retry.data as Record<string, unknown> | null) ?? null;
      writeError = retry.error?.message ?? null;
      if (!writeError) supportsFullRecord = false;
    }
  }

  if (writeError) {
    return NextResponse.json({ error: writeError }, { status: 500 });
  }

  // 统计只在"新增一场"时累加，重复保存同一场不会把面试次数刷高
  if (isNewRow) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("interview_count, highest_score, average_score, total_duration, continuous_days, last_login")
      .eq("id", user.id)
      .single();

    if (userProfile) {
      const newCount = (userProfile.interview_count || 0) + 1;
      const prevTotal = (userProfile.average_score || 0) * (userProfile.interview_count || 0);
      const newAvg = newCount > 0 ? ((prevTotal + (body.score as number || 0)) / newCount) : 0;

      await supabase
        .from("users")
        .update({
          interview_count: newCount,
          highest_score: Math.max(userProfile.highest_score || 0, body.score as number || 0),
          average_score: Math.round(newAvg * 10) / 10,
          total_duration: (userProfile.total_duration || 0) + (body.duration_seconds as number || 0),
          last_login: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  }

  return NextResponse.json({ success: true, synced: supportsFullRecord && Boolean(report), interview });
}
