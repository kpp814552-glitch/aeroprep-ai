import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const supabase = guard.ctx.db;

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
    { data: usageLogsToday },
    { data: usageLogs7d },
    { data: usageLogs30d },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("interviews").select("*", { count: "exact", head: true }),
    supabase.from("users").select("id").gte("last_login", todayStart),
    supabase.from("interviews").select("total_turns, score").gte("created_at", sevenDaysAgo),
    supabase.from("api_usage_logs").select("model, input_tokens, output_tokens, total_tokens, characters, cost").gte("created_at", todayStart),
    supabase.from("api_usage_logs").select("model, input_tokens, output_tokens, total_tokens, characters, cost").gte("created_at", sevenDaysAgo),
    supabase.from("api_usage_logs").select("model, input_tokens, output_tokens, total_tokens, characters, cost").gte("created_at", thirtyDaysAgo),
  ]);

  // 4. Compute all-time averages.
  // Prefer server-side aggregates (single row, no full-table transfer);
  // fall back to row fetching if PostgREST aggregates are unavailable.
  let avgScore = 0;
  let avgTurns = 0;

  const aggRes = await supabase
    .from("interviews")
    .select("avg_score:score.avg(),avg_turns:total_turns.avg()")
    .maybeSingle();

  if (!aggRes.error && aggRes.data) {
    const row = aggRes.data as unknown as {
      avg_score: number | string | null;
      avg_turns: number | string | null;
    };
    avgScore = Number(row.avg_score ?? 0) || 0;
    avgTurns = Number(row.avg_turns ?? 0) || 0;
  } else {
    const { data: allScores } = await supabase
      .from("interviews")
      .select("score, total_turns");
    if (allScores && allScores.length > 0) {
      avgScore =
        allScores.reduce((sum: number, r: { score: number }) => sum + (r.score || 0), 0) /
        allScores.length;
      avgTurns =
        allScores.reduce((sum: number, r: { total_turns: number }) => sum + (r.total_turns || 0), 0) /
        allScores.length;
    }
  }

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
