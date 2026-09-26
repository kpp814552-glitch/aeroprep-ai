import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import {
  deriveUsage,
  mergeOrders,
  parseRegistry,
  parseWalletDoc,
  totalGranted,
  type GrantRegistry,
} from "@/lib/member/wallet";
import { registryKey } from "@/lib/member/wallet-server";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
const TREND_DAYS = 14;
const USAGE_LOOKBACK_DAYS = 30;
const MAX_ROWS = 50000;

type TokenSummary = {
  requests: number;
  deepseekInput: number;
  deepseekOutput: number;
  deepseekTotal: number;
  ttsCharacters: number;
  totalCost: number;
};

type UserRow = {
  id: string;
  created_at: string | null;
  last_login: string | null;
  interview_count: number | null;
  pending_plan: string | null;
};

type InterviewRow = {
  user_id: string;
  role: string | null;
  role_label: string | null;
  score: number | string | null;
  total_turns: number | null;
  duration_seconds: number | null;
  created_at: string | null;
};

type UsageLogRow = {
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  characters: number | null;
  cost: number | string | null;
  endpoint: string | null;
  created_at: string | null;
};

type DayBucket = {
  date: string;
  label: string;
  startMs: number;
};

const ENDPOINT_LABELS: Record<string, string> = {
  interview: "AI 面试",
  optimize: "AI 优化",
  chat: "追问助手",
  tts: "语音合成",
};

function asNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function chinaDateParts(ms: number) {
  const shifted = new Date(ms + CHINA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function chinaDayStartMs(daysAgo = 0): number {
  const now = Date.now();
  const parts = chinaDateParts(now);
  return Date.UTC(parts.year, parts.month - 1, parts.day) - CHINA_OFFSET_MS - daysAgo * DAY_MS;
}

function dayKey(ms: number): string {
  const parts = chinaDateParts(ms);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function buildDayBuckets(days: number): DayBucket[] {
  return Array.from({ length: days }, (_, index) => {
    const daysAgo = days - index - 1;
    const startMs = chinaDayStartMs(daysAgo);
    const parts = chinaDateParts(startMs);
    return {
      date: dayKey(startMs),
      label: `${parts.month}/${parts.day}`,
      startMs,
    };
  });
}

function createTokenSummary(): TokenSummary {
  return {
    requests: 0,
    deepseekInput: 0,
    deepseekOutput: 0,
    deepseekTotal: 0,
    ttsCharacters: 0,
    totalCost: 0,
  };
}

function addUsage(target: TokenSummary, log: UsageLogRow): void {
  const isTts = log.endpoint === "tts" || log.model === "volcengine-tts";
  target.requests += 1;
  if (isTts) {
    target.ttsCharacters += asNumber(log.characters);
  } else {
    target.deepseekInput += asNumber(log.input_tokens);
    target.deepseekOutput += asNumber(log.output_tokens);
    target.deepseekTotal += asNumber(log.total_tokens);
  }
  target.totalCost += asNumber(log.cost);
}

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += pageSize) {
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message || "读取统计数据失败");
    const page = result.data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, serviceRole, allowlistEnforced } = guard.ctx;

  const todayStart = chinaDayStartMs();
  const sevenDaysStart = chinaDayStartMs(6);
  const thirtyDaysStart = chinaDayStartMs(USAGE_LOOKBACK_DAYS - 1);
  const thirtyDaysIso = new Date(thirtyDaysStart).toISOString();
  const interviewBuckets = buildDayBuckets(TREND_DAYS);
  const usageBuckets = buildDayBuckets(TREND_DAYS);
  const commerceBuckets = buildDayBuckets(TREND_DAYS);

  const [
    totalUsersResult,
    totalInterviewsResult,
    users,
    recentInterviews,
    usageLogs,
    registryRows,
    aggregateResult,
  ] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("interviews").select("id", { count: "exact", head: true }),
    fetchAllRows<UserRow>((from, to) =>
      db
        .from("users")
        .select("id, created_at, last_login, interview_count, pending_plan")
        .order("created_at", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<InterviewRow>((from, to) =>
      db
        .from("interviews")
        .select("user_id, role, role_label, score, total_turns, duration_seconds, created_at")
        .gte("created_at", thirtyDaysIso)
        .order("created_at", { ascending: true })
        .range(from, to),
    ).catch(() => []),
    fetchAllRows<UsageLogRow>((from, to) =>
      db
        .from("api_usage_logs")
        .select("model, input_tokens, output_tokens, total_tokens, characters, cost, endpoint, created_at")
        .gte("created_at", thirtyDaysIso)
        .order("created_at", { ascending: true })
        .range(from, to),
    ).catch(() => []),
    fetchAllRows<{ key: string; value: string | null }>((from, to) =>
      db
        .from("site_config")
        .select("key, value")
        .like("key", "credits:%")
        .order("key", { ascending: true })
        .range(from, to),
    ).catch(() => []),
    db
      .from("interviews")
      .select("avg_score:score.avg(),avg_turns:total_turns.avg(),avg_duration:duration_seconds.avg()")
      .maybeSingle(),
  ]);

  const totalUsers = totalUsersResult.count ?? users.length;
  const totalInterviews = totalInterviewsResult.count ?? recentInterviews.length;

  let avgScore = 0;
  let avgTurns = 0;
  let avgDurationSeconds = 0;
  const aggregate = aggregateResult.error
    ? null
    : (aggregateResult.data as unknown as {
        avg_score: number | string | null;
        avg_turns: number | string | null;
        avg_duration: number | string | null;
      } | null);

  if (aggregate) {
    avgScore = asNumber(aggregate.avg_score);
    avgTurns = asNumber(aggregate.avg_turns);
    avgDurationSeconds = asNumber(aggregate.avg_duration);
  } else {
    const allInterviews = await fetchAllRows<InterviewRow>((from, to) =>
      db
        .from("interviews")
        .select("user_id, role, role_label, score, total_turns, duration_seconds, created_at")
        .order("created_at", { ascending: true })
        .range(from, to),
    ).catch(() => []);
    if (allInterviews.length > 0) {
      avgScore = allInterviews.reduce((sum, row) => sum + asNumber(row.score), 0) / allInterviews.length;
      avgTurns = allInterviews.reduce((sum, row) => sum + asNumber(row.total_turns), 0) / allInterviews.length;
      avgDurationSeconds =
        allInterviews.reduce((sum, row) => sum + asNumber(row.duration_seconds), 0) / allInterviews.length;
    }
  }

  const interviewTrend = interviewBuckets.map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    count: 0,
    scoreTotal: 0,
    avgScore: 0,
  }));
  const interviewTrendMap = new Map(interviewTrend.map((item) => [item.date, item]));
  const roleMap = new Map<string, { key: string; label: string; count: number; scoreTotal: number; avgScore: number }>();

  let interviewsToday = 0;
  let interviews7d = 0;
  let interviews30d = 0;
  let interviews7dScoreTotal = 0;
  let interviews7dTurns = 0;

  for (const row of recentInterviews) {
    const createdMs = row.created_at ? Date.parse(row.created_at) : NaN;
    if (!Number.isFinite(createdMs)) continue;
    const score = asNumber(row.score);
    const turns = asNumber(row.total_turns);

    if (createdMs >= todayStart) interviewsToday += 1;
    if (createdMs >= sevenDaysStart) {
      interviews7d += 1;
      interviews7dScoreTotal += score;
      interviews7dTurns += turns;
    }
    if (createdMs >= thirtyDaysStart) interviews30d += 1;

    const bucket = interviewTrendMap.get(dayKey(createdMs));
    if (bucket) {
      bucket.count += 1;
      bucket.scoreTotal += score;
    }

    if (createdMs >= thirtyDaysStart) {
      const roleKey = row.role || "unknown";
      const role = roleMap.get(roleKey) || {
        key: roleKey,
        label: row.role_label || row.role || "未标注岗位",
        count: 0,
        scoreTotal: 0,
        avgScore: 0,
      };
      role.count += 1;
      role.scoreTotal += score;
      roleMap.set(roleKey, role);
    }
  }

  for (const item of interviewTrend) {
    item.avgScore = item.count > 0 ? round(item.scoreTotal / item.count, 1) : 0;
  }
  const topRoles = [...roleMap.values()]
    .map((role) => ({
      ...role,
      avgScore: role.count > 0 ? round(role.scoreTotal / role.count, 1) : 0,
    }))
    .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
    .slice(0, 6);

  const usageToday = createTokenSummary();
  const usage7d = createTokenSummary();
  const usage30d = createTokenSummary();
  const usageTrend = usageBuckets.map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    requests: 0,
    totalTokens: 0,
    ttsCharacters: 0,
    totalCost: 0,
  }));
  const usageTrendMap = new Map(usageTrend.map((item) => [item.date, item]));
  const endpointMap = new Map<string, TokenSummary & { endpoint: string; label: string }>();

  for (const log of usageLogs) {
    const createdMs = log.created_at ? Date.parse(log.created_at) : NaN;
    if (!Number.isFinite(createdMs)) continue;
    addUsage(usage30d, log);
    if (createdMs >= sevenDaysStart) addUsage(usage7d, log);
    if (createdMs >= todayStart) addUsage(usageToday, log);

    const endpoint = log.endpoint || (log.model === "volcengine-tts" ? "tts" : "other");
    const endpointSummary = endpointMap.get(endpoint) || {
      endpoint,
      label: ENDPOINT_LABELS[endpoint] || "其他",
      ...createTokenSummary(),
    };
    addUsage(endpointSummary, log);
    endpointMap.set(endpoint, endpointSummary);

    const bucket = usageTrendMap.get(dayKey(createdMs));
    if (bucket) {
      bucket.requests += 1;
      bucket.totalTokens += asNumber(log.total_tokens);
      bucket.ttsCharacters += asNumber(log.characters);
      bucket.totalCost += asNumber(log.cost);
    }
  }

  const registryMap = new Map<string, GrantRegistry>();
  for (const row of registryRows) {
    registryMap.set(row.key, parseRegistry(row.value));
  }

  const commerceTrend = commerceBuckets.map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    amount: 0,
    orders: 0,
  }));
  const commerceTrendMap = new Map(commerceTrend.map((item) => [item.date, item]));
  const payingUsers = new Set<string>();

  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let revokedCount = 0;
  let paidOrderCount = 0;
  let manualAdjustmentCount = 0;
  let pendingAmount = 0;
  let pendingCredits = 0;
  let approvedAmount = 0;
  let approvedCredits = 0;
  let revokedAmount = 0;
  let todayAmount = 0;
  let last7dAmount = 0;
  let last30dAmount = 0;
  let todayPaidOrders = 0;
  let last7dPaidOrders = 0;
  let last30dPaidOrders = 0;
  let walletUsers = 0;
  let totalCreditsGranted = 0;
  let totalCreditsUsed = 0;
  let totalCreditsLeft = 0;
  let interviewedUsers = 0;

  for (const user of users) {
    const doc = parseWalletDoc(user.pending_plan);
    const registry = registryMap.get(registryKey(user.id));
    const orders = mergeOrders(doc.orders, registry);
    const used = deriveUsage(asNumber(user.interview_count), doc.used).paidUsed;
    const granted = totalGranted(doc, registry);
    const left = Math.max(0, granted - used);

    if (asNumber(user.interview_count) > 0) interviewedUsers += 1;
    totalCreditsGranted += granted;
    totalCreditsUsed += used;
    totalCreditsLeft += left;
    if (left > 0) walletUsers += 1;

    for (const order of orders) {
      if (order.status === "pending") {
        pendingCount += 1;
        if (order.channel !== "manual") {
          pendingAmount += asNumber(order.amount);
          pendingCredits += asNumber(order.credits);
        }
      } else if (order.status === "approved") {
        approvedCount += 1;
        approvedCredits += asNumber(order.credits);
        if (order.channel === "manual") manualAdjustmentCount += 1;
      } else if (order.status === "rejected") {
        rejectedCount += 1;
      } else if (order.status === "revoked") {
        revokedCount += 1;
        if (order.channel !== "manual") revokedAmount += asNumber(order.amount);
      }

      if (order.status !== "approved" || order.channel === "manual") continue;
      const reviewedMs = order.reviewedAt ? Date.parse(order.reviewedAt) : Date.parse(order.appliedAt);
      const amount = asNumber(order.amount);
      paidOrderCount += 1;
      approvedAmount += amount;
      payingUsers.add(user.id);

      if (Number.isFinite(reviewedMs)) {
        const bucket = commerceTrendMap.get(dayKey(reviewedMs));
        if (bucket) {
          bucket.amount += amount;
          bucket.orders += 1;
        }
        if (reviewedMs >= todayStart) {
          todayAmount += amount;
          todayPaidOrders += 1;
        }
        if (reviewedMs >= sevenDaysStart) {
          last7dAmount += amount;
          last7dPaidOrders += 1;
        }
        if (reviewedMs >= thirtyDaysStart) {
          last30dAmount += amount;
          last30dPaidOrders += 1;
        }
      }
    }
  }

  const dailyUsage = usageTrend.map((item) => ({
    ...item,
    totalCost: round(item.totalCost, 4),
  }));
  const dailyCommerce = commerceTrend.map((item) => ({
    ...item,
    amount: round(item.amount, 2),
  }));
  const endpointUsage = [...endpointMap.values()]
    .map((item) => ({
      endpoint: item.endpoint,
      label: item.label,
      requests: item.requests,
      totalTokens: item.deepseekTotal,
      ttsCharacters: item.ttsCharacters,
      totalCost: round(item.totalCost, 4),
    }))
    .sort((a, b) => b.totalCost - a.totalCost || b.requests - a.requests);

  const weeklyAvgScore = interviews7d > 0 ? interviews7dScoreTotal / interviews7d : 0;
  const weeklyAvgTurns = interviews7d > 0 ? interviews7dTurns / interviews7d : 0;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    meta: {
      serviceRole,
      allowlistEnforced,
      scannedUsers: users.length,
    },
    users: {
      total: totalUsers,
      activeToday: users.filter((user) => user.last_login && Date.parse(user.last_login) >= todayStart).length,
      active7d: users.filter((user) => user.last_login && Date.parse(user.last_login) >= sevenDaysStart).length,
      active30d: users.filter((user) => user.last_login && Date.parse(user.last_login) >= thirtyDaysStart).length,
      newToday: users.filter((user) => user.created_at && Date.parse(user.created_at) >= todayStart).length,
      new7d: users.filter((user) => user.created_at && Date.parse(user.created_at) >= sevenDaysStart).length,
      new30d: users.filter((user) => user.created_at && Date.parse(user.created_at) >= thirtyDaysStart).length,
      interviewedUsers,
      payingUsers: payingUsers.size,
    },
    interviews: {
      total: totalInterviews,
      today: interviewsToday,
      last7d: interviews7d,
      last30d: interviews30d,
      avgScore: round(avgScore, 1),
      avgTurns: round(avgTurns, 1),
      avgDurationSeconds: Math.round(avgDurationSeconds),
      weeklyAvgScore: round(weeklyAvgScore, 1),
      weeklyAvgTurns: round(weeklyAvgTurns, 1),
      daily: interviewTrend,
      topRoles,
    },
    commerce: {
      ordersTotal: pendingCount + approvedCount + rejectedCount + revokedCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      revokedCount,
      paidOrderCount,
      manualAdjustmentCount,
      pendingAmount: round(pendingAmount, 2),
      pendingCredits,
      approvedAmount: round(approvedAmount, 2),
      approvedCredits,
      revokedAmount: round(revokedAmount, 2),
      averageOrderValue: paidOrderCount > 0 ? round(approvedAmount / paidOrderCount, 2) : 0,
      todayAmount: round(todayAmount, 2),
      last7dAmount: round(last7dAmount, 2),
      last30dAmount: round(last30dAmount, 2),
      todayPaidOrders,
      last7dPaidOrders,
      last30dPaidOrders,
      walletUsers,
      totalCreditsGranted,
      totalCreditsUsed,
      totalCreditsLeft,
      daily: dailyCommerce,
    },
    usage: {
      today: {
        ...usageToday,
        totalCost: round(usageToday.totalCost, 4),
      },
      last7d: {
        ...usage7d,
        totalCost: round(usage7d.totalCost, 4),
      },
      last30d: {
        ...usage30d,
        totalCost: round(usage30d.totalCost, 4),
      },
      daily: dailyUsage,
      byEndpoint: endpointUsage,
      costPerInterview7d: interviews7d > 0 ? round(usage7d.totalCost / interviews7d, 4) : 0,
      tokensPerInterview7d: interviews7d > 0 ? Math.round(usage7d.deepseekTotal / interviews7d) : 0,
    },
  });
}
