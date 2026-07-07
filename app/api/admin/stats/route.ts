import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient(request);

  // 1. Verify auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check admin
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Gather stats in parallel
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalInterviews },
    { data: todayUsers },
    { data: weeklyInterviews },
    { data: allScores },
    { data: usageLogsToday },
    { data: usageLogs7d },
    { data: usageLogs30d },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("interviews").select("*", { count: "exact", head: true }),
    supabase.from("users").select("id").gte("last_login", todayStart),
    supabase.from("interviews").select("total_turns, score, duration_seconds").gte("created_at", sevenDaysAgo),
    supabase.from("interviews").select("score, total_turns, duration_seconds"),
    supabase.from("api_usage_logs").select("model, input_tokens, output_tokens, total_tokens, characters, cost").gte("created_at", todayStart),
    supabase.from("api_usage_logs").select("model, input_tokens, output_tokens, total_tokens, characters, cost").gte("created_at", sevenDaysAgo),
    supabase.from("api_usage_logs").select("model, input_tokens, output_tokens, total_tokens, characters, cost").gte("created_at", thirtyDaysAgo),
  ]);

  // 4. Compute aggregates
  const avgScore = allScores && allScores.length > 0
    ? allScores.reduce((sum: number, r: { score: number }) => sum + (r.score || 0), 0) / allScores.length
    : 0;

  const avgTurns = allScores && allScores.length > 0
    ? allScores.reduce((sum: number, r: { total_turns: number }) => sum + (r.total_turns || 0), 0) / allScores.length
    : 0;

  const weeklyAvgTurns = weeklyInterviews && weeklyInterviews.length > 0
    ? weeklyInterviews.reduce((sum: number, r: { total_turns: number }) => sum + (r.total_turns || 0), 0) / weeklyInterviews.length
    : 0;

  const weeklyAvgScore = weeklyInterviews && weeklyInterviews.length > 0
    ? weeklyInterviews.reduce((sum: number, r: { score: number }) => sum + (r.score || 0), 0) / weeklyInterviews.length
    : 0;

  // 5. Aggregate token usage
  function sumTokens(logs: Array<{ model: string; input_tokens: number; output_tokens: number; total_tokens: number; characters: number; cost: number }> | null) {
    if (!logs) return { deepseekInput: 0, deepseekOutput: 0, deepseekTotal: 0, ttsCharacters: 0, totalCost: 0 };
    return logs.reduce(
      (acc, l) => {
        if (l.model === 'deepseek') {
          acc.deepseekInput += l.input_tokens || 0;
          acc.deepseekOutput += l.output_tokens || 0;
          acc.deepseekTotal += l.total_tokens || 0;
        } else if (l.model === 'volcengine-tts') {
          acc.ttsCharacters += l.characters || 0;
        }
        acc.totalCost += l.cost || 0;
        return acc;
      },
      { deepseekInput: 0, deepseekOutput: 0, deepseekTotal: 0, ttsCharacters: 0, totalCost: 0 }
    );
  }

  return NextResponse.json({
    users: {
      total: totalUsers ?? 0,
      activeToday: todayUsers?.length ?? 0,
    },
    interviews: {
      total: totalInterviews ?? 0,
      avgScore: Math.round(avgScore * 10) / 10,
      avgTurns: Math.round(avgTurns * 10) / 10,
      weeklyCount: weeklyInterviews?.length ?? 0,
      weeklyAvgScore: Math.round(weeklyAvgScore * 10) / 10,
      weeklyAvgTurns: Math.round(weeklyAvgTurns * 10) / 10,
    },
    usage: {
      today: sumTokens(usageLogsToday ?? []),
      last7d: sumTokens(usageLogs7d ?? []),
      last30d: sumTokens(usageLogs30d ?? []),
    },
  });
}
