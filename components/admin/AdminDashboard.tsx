"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Database,
  LayoutDashboard,
  Loader2,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { useAuth } from "@/hooks/useAuth";
import AdminAnnouncements from "./AdminAnnouncements";
import AdminOrders from "./AdminOrders";

type TabKey = "overview" | "commerce" | "announcements";

type TokenSummary = {
  requests: number;
  deepseekInput: number;
  deepseekOutput: number;
  deepseekTotal: number;
  ttsCharacters: number;
  totalCost: number;
};

type StatsData = {
  generatedAt: string;
  meta: {
    serviceRole: boolean;
    allowlistEnforced: boolean;
    scannedUsers: number;
  };
  users: {
    total: number;
    activeToday: number;
    active7d: number;
    active30d: number;
    newToday: number;
    new7d: number;
    new30d: number;
    interviewedUsers: number;
    payingUsers: number;
  };
  interviews: {
    total: number;
    today: number;
    last7d: number;
    last30d: number;
    avgScore: number;
    avgTurns: number;
    avgDurationSeconds: number;
    weeklyAvgScore: number;
    weeklyAvgTurns: number;
    daily: Array<{
      date: string;
      label: string;
      count: number;
      avgScore: number;
    }>;
    topRoles: Array<{
      key: string;
      label: string;
      count: number;
      avgScore: number;
    }>;
  };
  commerce: {
    ordersTotal: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    revokedCount: number;
    paidOrderCount: number;
    manualAdjustmentCount: number;
    pendingAmount: number;
    pendingCredits: number;
    approvedAmount: number;
    approvedCredits: number;
    revokedAmount: number;
    averageOrderValue: number;
    todayAmount: number;
    last7dAmount: number;
    last30dAmount: number;
    todayPaidOrders: number;
    last7dPaidOrders: number;
    last30dPaidOrders: number;
    walletUsers: number;
    totalCreditsGranted: number;
    totalCreditsUsed: number;
    totalCreditsLeft: number;
    daily: Array<{
      date: string;
      label: string;
      amount: number;
      orders: number;
    }>;
  };
  usage: {
    today: TokenSummary;
    last7d: TokenSummary;
    last30d: TokenSummary;
    daily: Array<{
      date: string;
      label: string;
      requests: number;
      totalTokens: number;
      ttsCharacters: number;
      totalCost: number;
    }>;
    byEndpoint: Array<{
      endpoint: string;
      label: string;
      requests: number;
      totalTokens: number;
      ttsCharacters: number;
      totalCost: number;
    }>;
    costPerInterview7d: number;
    tokensPerInterview7d: number;
  };
};

const NAV: Array<{
  key: TabKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    key: "overview",
    label: "运营总览",
    description: "用户、面试、营收与成本",
    icon: LayoutDashboard,
  },
  {
    key: "commerce",
    label: "交易与次数",
    description: "审核订单、调整次数、收款设置",
    icon: CreditCard,
  },
  {
    key: "announcements",
    label: "公告运营",
    description: "发布、编辑与上下架公告",
    icon: Megaphone,
  },
];

const ACCENTS = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    value: "text-slate-950",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    value: "text-amber-700",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    value: "text-violet-700",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600",
    value: "text-rose-700",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-800",
  },
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("zh-CN");
}

function formatMoney(value: number): string {
  return `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${Math.round(seconds)} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 1000) / 10}%`;
}

function formatRefreshTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "blue",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  accent?: keyof typeof ACCENTS;
}) {
  const tone = ACCENTS[accent];
  return (
    <GlassCard className="px-4 py-4 md:px-5 md:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className={`mt-2 truncate text-2xl font-semibold tracking-tight ${tone.value}`}>{value}</p>
          <p className="mt-1.5 text-[11px] leading-5 text-slate-400">{sub}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </GlassCard>
  );
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function TrendBars({
  data,
  valueOf,
  formatValue,
  accentClass = "from-blue-500 to-sky-400",
}: {
  data: Array<{ date: string; label: string }>;
  valueOf: (item: { date: string; label: string }) => number;
  formatValue: (value: number) => string;
  accentClass?: string;
}) {
  const values = data.map(valueOf);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-slate-950">{formatValue(total)}</p>
        <p className="text-[11px] text-slate-400">近 14 天累计</p>
      </div>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="grid min-w-[560px] grid-cols-14 items-end gap-2">
          {data.map((item, index) => {
            const value = values[index];
            const height = value <= 0 ? 4 : Math.max(12, Math.round((value / max) * 112));
            return (
              <div key={item.date} className="group flex flex-col items-center">
                <div className="relative flex h-32 w-full items-end justify-center">
                  <div
                    title={`${item.label}：${formatValue(value)}`}
                    className={`w-full max-w-8 rounded-t-md bg-gradient-to-t ${accentClass} transition-all duration-500 group-hover:brightness-110`}
                    style={{ height }}
                  />
                  <span className="pointer-events-none absolute -top-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
                    {formatValue(value)}
                  </span>
                </div>
                <span className="mt-2 text-[9px] text-slate-400">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const width = total > 0 ? Math.max(value > 0 ? 4 : 0, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs text-slate-500">
          {value.toLocaleString("zh-CN")} <span className="text-slate-300">·</span> {percent(value, total)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function UsagePeriod({
  label,
  data,
}: {
  label: string;
  data: TokenSummary;
}) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/45 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <span className="text-[10px] text-slate-400">{data.requests} 次调用</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-950">{formatMoney(data.totalCost)}</p>
      <div className="mt-2 space-y-1 text-[10px] text-slate-400">
        <p>Token {formatNumber(data.deepseekTotal)} · TTS {formatNumber(data.ttsCharacters)} 字</p>
        <p>输入 {formatNumber(data.deepseekInput)} / 输出 {formatNumber(data.deepseekOutput)}</p>
      </div>
    </div>
  );
}

function LoadingOverview() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl border border-white/40 bg-white/50" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="h-72 animate-pulse rounded-3xl border border-white/40 bg-white/50" />
        <div className="h-72 animate-pulse rounded-3xl border border-white/40 bg-white/50" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: StatsData = await res.json();
      setStats(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchStats(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchStats]);

  if (!user) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-slate-500">请先登录后查看管理后台</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h2 className="text-xl font-semibold text-slate-900">无访问权限</h2>
        <p className="mt-2 text-sm text-slate-500">当前账号没有管理后台权限。</p>
      </div>
    );
  }

  const activeNav = NAV.find((item) => item.key === activeTab) || NAV[0];
  const totalUsers = stats?.users.total || 0;
  const interviewedUsers = stats?.users.interviewedUsers || 0;

  return (
    <div className="stagger-section space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">管理后台</h1>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {profile?.username || user.email} · {activeNav.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats ? (
            <span className="hidden text-[10px] text-slate-400 sm:inline">
              更新于 {formatRefreshTime(stats.generatedAt)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            刷新数据
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <GlassPanel className="p-2.5 lg:p-3">
            <div className="hidden items-center gap-3 border-b border-white/50 px-2 pb-4 lg:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-xs font-semibold text-white">
                {(profile?.username || user.email || "A").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{profile?.username || "管理员"}</p>
                <p className="truncate text-[10px] text-slate-400">{user.email}</p>
              </div>
            </div>

            <nav className="flex gap-1.5 overflow-x-auto pb-0.5 lg:flex-col lg:overflow-visible lg:pt-3">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeTab;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={`flex min-w-fit items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 lg:w-full ${
                      active
                        ? "bg-[#2571ff] text-white shadow-[0_12px_26px_rgba(37,113,255,0.2)]"
                        : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-xs font-semibold">{item.label}</span>
                      <span className={`hidden text-[10px] leading-4 lg:block ${active ? "text-white/70" : "text-slate-400"}`}>
                        {item.description}
                      </span>
                    </span>
                    {item.key === "commerce" && stats && stats.commerce.pendingCount > 0 ? (
                      <span
                        className={`ml-auto hidden rounded-full px-2 py-0.5 text-[9px] font-semibold lg:inline-flex ${
                          active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {stats.commerce.pendingCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </GlassPanel>

          <div className="mt-3 hidden rounded-2xl border border-white/50 bg-white/45 px-4 py-3 lg:block">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
              <Database className="h-3.5 w-3.5 text-emerald-500" />
              系统状态
            </div>
            <div className="mt-2 space-y-1.5 text-[10px] leading-4 text-slate-400">
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {stats?.meta.serviceRole ? "Service Role 已连接" : "使用数据库 RLS 模式"}
              </p>
              <p className="flex items-center gap-1.5">
                {stats?.meta.allowlistEnforced ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                )}
                {stats?.meta.allowlistEnforced ? "管理员白名单已启用" : "未配置 ADMIN_EMAILS"}
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {activeTab === "overview" ? (
            <div className="space-y-5">
              {loading && !stats ? (
                <LoadingOverview />
              ) : error && !stats ? (
                <GlassPanel className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
                  <AlertCircle className="h-7 w-7 text-rose-500" />
                  <p className="text-sm text-rose-600">{error}</p>
                  <button
                    type="button"
                    onClick={fetchStats}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    重新加载
                  </button>
                </GlassPanel>
              ) : stats ? (
                <>
                  <SectionTitle
                    title="运营总览"
                    description="关键数据按北京时间统计；收入和成本分别按已审核订单与 AI 实际调用口径计算。"
                  />

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      icon={Users}
                      label="注册用户"
                      value={formatNumber(stats.users.total)}
                      sub={`今日新增 ${stats.users.newToday} · 近 7 天 ${stats.users.new7d}`}
                      accent="blue"
                    />
                    <MetricCard
                      icon={Activity}
                      label="今日活跃"
                      value={formatNumber(stats.users.activeToday)}
                      sub={`近 7 天活跃 ${stats.users.active7d} 人`}
                      accent="emerald"
                    />
                    <MetricCard
                      icon={Target}
                      label="累计面试"
                      value={formatNumber(stats.interviews.total)}
                      sub={`今日 ${stats.interviews.today} · 近 7 天 ${stats.interviews.last7d}`}
                      accent="violet"
                    />
                    <MetricCard
                      icon={Coins}
                      label="累计成交"
                      value={formatMoney(stats.commerce.approvedAmount)}
                      sub={`今日 ${formatMoney(stats.commerce.todayAmount)} · 近 7 天 ${formatMoney(stats.commerce.last7dAmount)}`}
                      accent="amber"
                    />
                    <MetricCard
                      icon={UserPlus}
                      label="体验用户"
                      value={formatNumber(stats.users.interviewedUsers)}
                      sub={`注册用户面试转化率 ${percent(interviewedUsers, totalUsers)}`}
                      accent="blue"
                    />
                    <MetricCard
                      icon={BarChart3}
                      label="平均评分"
                      value={stats.interviews.avgScore.toFixed(1)}
                      sub={`近 7 天 ${stats.interviews.weeklyAvgScore.toFixed(1)} · 平均 ${stats.interviews.avgTurns.toFixed(1)} 轮`}
                      accent="emerald"
                    />
                    <MetricCard
                      icon={Wallet}
                      label="有余次用户"
                      value={formatNumber(stats.commerce.walletUsers)}
                      sub={`剩余 ${formatNumber(stats.commerce.totalCreditsLeft)} 次 · 已用 ${formatNumber(stats.commerce.totalCreditsUsed)} 次`}
                      accent="violet"
                    />
                    <MetricCard
                      icon={CreditCard}
                      label="待审核订单"
                      value={formatNumber(stats.commerce.pendingCount)}
                      sub={`待确认金额 ${formatMoney(stats.commerce.pendingAmount)} · ${stats.commerce.pendingCredits} 次`}
                      accent="rose"
                    />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                    <GlassPanel className="px-5 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">面试趋势</h3>
                          <p className="mt-1 text-[11px] text-slate-400">近 14 天完成的模拟面试场次</p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-600">
                          平均 {stats.interviews.avgDurationSeconds ? formatDuration(stats.interviews.avgDurationSeconds) : "—"}
                        </span>
                      </div>
                      <div className="mt-5">
                        <TrendBars
                          data={stats.interviews.daily}
                          valueOf={(item) =>
                            stats.interviews.daily.find((entry) => entry.date === item.date)?.count || 0
                          }
                          formatValue={(value) => `${value} 场`}
                          accentClass="from-violet-500 to-sky-400"
                        />
                      </div>
                    </GlassPanel>

                    <GlassPanel className="px-5 py-5">
                      <h3 className="text-sm font-semibold text-slate-900">用户转化漏斗</h3>
                      <p className="mt-1 text-[11px] text-slate-400">从账号注册到完成面试、付费复购</p>
                      <div className="mt-6 space-y-5">
                        <FunnelRow
                          label="注册用户"
                          value={stats.users.total}
                          total={stats.users.total}
                          color="bg-blue-500"
                        />
                        <FunnelRow
                          label="完成至少一场面试"
                          value={stats.users.interviewedUsers}
                          total={stats.users.total}
                          color="bg-violet-500"
                        />
                        <FunnelRow
                          label="购买过面试次数"
                          value={stats.users.payingUsers}
                          total={stats.users.total}
                          color="bg-emerald-500"
                        />
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/50 pt-4">
                        <div>
                          <p className="text-[10px] text-slate-400">客单价</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {formatMoney(stats.commerce.averageOrderValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">付费订单</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {stats.commerce.paidOrderCount}
                          </p>
                        </div>
                      </div>
                    </GlassPanel>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <GlassPanel className="px-5 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">岗位热度</h3>
                          <p className="mt-1 text-[11px] text-slate-400">近 30 天岗位分布与平均分</p>
                        </div>
                        <Target className="h-4 w-4 text-blue-500" />
                      </div>
                      {stats.interviews.topRoles.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {stats.interviews.topRoles.map((role, index) => {
                            const maxCount = stats.interviews.topRoles[0]?.count || 1;
                            return (
                              <div key={role.key}>
                                <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                                  <span className="flex min-w-0 items-center gap-2 text-slate-600">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[9px] font-semibold text-slate-500">
                                      {index + 1}
                                    </span>
                                    <span className="truncate">{role.label}</span>
                                  </span>
                                  <span className="shrink-0 text-slate-400">
                                    {role.count} 场 · {role.avgScore.toFixed(1)} 分
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400"
                                    style={{ width: `${Math.max(8, Math.round((role.count / maxCount) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-8 text-center text-xs text-slate-400">近 30 天暂无面试数据</p>
                      )}
                    </GlassPanel>

                    <GlassPanel className="px-5 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Brain className="h-4 w-4 text-violet-500" />
                            AI 成本与用量
                          </h3>
                          <p className="mt-1 text-[11px] text-slate-400">
                            近 7 天每场面试平均 {formatMoney(stats.usage.costPerInterview7d)} ·{" "}
                            {formatNumber(stats.usage.tokensPerInterview7d)} Token
                          </p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-600">
                          近 30 天 {formatMoney(stats.usage.last30d.totalCost)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <UsagePeriod label="今日" data={stats.usage.today} />
                        <UsagePeriod label="近 7 天" data={stats.usage.last7d} />
                        <UsagePeriod label="近 30 天" data={stats.usage.last30d} />
                      </div>

                      {stats.usage.byEndpoint.length > 0 ? (
                        <div className="mt-5 border-t border-white/50 pt-4">
                          <p className="text-[11px] font-medium text-slate-500">近 30 天调用结构</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {stats.usage.byEndpoint.map((item) => (
                              <div
                                key={item.endpoint}
                                className="flex items-center justify-between gap-3 rounded-xl bg-white/45 px-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-700">{item.label}</p>
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {item.requests} 次调用
                                    {item.totalTokens > 0 ? ` · ${formatNumber(item.totalTokens)} Token` : ""}
                                    {item.ttsCharacters > 0 ? ` · ${formatNumber(item.ttsCharacters)} 字` : ""}
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs font-semibold text-slate-700">
                                  {formatMoney(item.totalCost)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </GlassPanel>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                    <GlassPanel className="px-5 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">订单与次数健康度</h3>
                          <p className="mt-1 text-[11px] text-slate-400">订单审核、核发与剩余额度概览</p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {[
                          ["待审核金额", formatMoney(stats.commerce.pendingAmount)],
                          ["审核通过记录", `${stats.commerce.approvedCount} 笔`],
                          ["累计核发次数", `${stats.commerce.approvedCredits} 次`],
                          ["近 7 天成交", formatMoney(stats.commerce.last7dAmount)],
                          ["已撤销金额", formatMoney(stats.commerce.revokedAmount)],
                          ["人工调整", `${stats.commerce.manualAdjustmentCount} 笔`],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl bg-white/45 px-3 py-3">
                            <p className="text-[10px] text-slate-400">{label}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                          </div>
                        ))}
                      </div>
                    </GlassPanel>

                    <GlassPanel className="px-5 py-5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <h3 className="text-sm font-semibold text-slate-900">安全与数据状态</h3>
                      </div>
                      <div className="mt-4 space-y-3 text-[11px] leading-5 text-slate-500">
                        <div className="flex items-start gap-2">
                          {stats.meta.serviceRole ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                          <span>
                            {stats.meta.serviceRole
                              ? "服务端数据访问正常，管理接口已使用独立权限连接。"
                              : "当前未配置 Service Role，跨用户数据依赖数据库 RLS 策略。"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          {stats.meta.allowlistEnforced ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                          <span>
                            {stats.meta.allowlistEnforced
                              ? "管理员邮箱白名单已启用，非白名单账号无法进入后台。"
                              : "建议配置 ADMIN_EMAILS，进一步收紧管理员入口。"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>本次统计读取 {stats.meta.scannedUsers} 个账号，数据刷新于 {formatRefreshTime(stats.generatedAt)}。</span>
                        </div>
                      </div>
                    </GlassPanel>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === "commerce" ? <AdminOrders /> : null}
          {activeTab === "announcements" ? <AdminAnnouncements /> : null}
        </main>
      </div>
    </div>
  );
}
