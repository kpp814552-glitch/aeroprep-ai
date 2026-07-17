"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Users,
  Calendar,
  BarChart3,
  Brain,
  Volume2,
  TrendingUp,
  Target,
  RefreshCw,
} from "lucide-react";
import { GlassPanel, GlassCard } from "@/components/ui/glass";
import { useAuth } from "@/hooks/useAuth";
import AdminAnnouncements from "./AdminAnnouncements";
import AdminOrders from "./AdminOrders";

type StatsData = {
  users: {
    total: number;
    activeToday: number;
  };
  interviews: {
    total: number;
    avgScore: number;
    avgTurns: number;
    weeklyCount: number;
    weeklyAvgScore: number;
    weeklyAvgTurns: number;
  };
  usage: {
    today: TokenSummary;
    last7d: TokenSummary;
    last30d: TokenSummary;
  };
};

type TokenSummary = {
  deepseekInput: number;
  deepseekOutput: number;
  deepseekTotal: number;
  ttsCharacters: number;
  totalCost: number;
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "blue",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "emerald" | "amber" | "violet";
}) {
  const accentColors: Record<string, string> = {
    blue: "from-blue-100/60 to-blue-50/20 text-blue-600",
    emerald: "from-emerald-100/60 to-emerald-50/20 text-emerald-600",
    amber: "from-amber-100/60 to-amber-50/20 text-amber-600",
    violet: "from-violet-100/60 to-violet-50/20 text-violet-600",
  };

  return (
    <GlassCard className="soft-enter px-5 py-5 md:px-6 md:py-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-slate-500">{sub}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accentColors[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </GlassCard>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function TokenUsageSection({ data, title }: { data: TokenSummary; title: string }) {
  return (
    <GlassCard className="soft-enter px-5 py-5 md:px-6 md:py-6">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            DeepSeek 输入
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatNumber(data.deepseekInput)}
          </p>
          <p className="text-[11px] text-slate-400">tokens</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            DeepSeek 输出
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatNumber(data.deepseekOutput)}
          </p>
          <p className="text-[11px] text-slate-400">tokens</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            DeepSeek 总计
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatNumber(data.deepseekTotal)}
          </p>
          <p className="text-[11px] text-slate-400">tokens</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            TTS 字数
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatNumber(data.ttsCharacters)}
          </p>
          <p className="text-[11px] text-slate-400">字符</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            ¥{data.totalCost.toFixed(4)}
          </p>
          <p className="text-[11px] text-slate-400">CNY</p>
        </div>
      </div>
    </GlassCard>
  );
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("控制台");
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: StatsData = await res.json();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchStats(), 0); return () => clearTimeout(t); }, [fetchStats]);

  if (!user) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-slate-500">请先登录</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          onClick={fetchStats}
          className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm text-slate-700 transition hover:bg-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          重试
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const activeRate = stats.users.total > 0
    ? ((stats.users.activeToday / stats.users.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            管理后台
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {profile?.username || user.email} · 管理员
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm text-slate-700 transition hover:bg-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
         </button>
       </div>


     {/* 用户与面试概览 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="总用户数"
          value={stats.users.total}
          sub={`今日活跃 ${stats.users.activeToday} 人 (${activeRate}%)`}
          accent="blue"
        />
        <StatCard
          icon={Calendar}
          label="今日活跃"
          value={stats.users.activeToday}
          sub={`活跃率 ${activeRate}%`}
          accent="emerald"
        />
        <StatCard
          icon={Target}
          label="面试总数"
          value={stats.interviews.total}
          sub={`近7天 ${stats.interviews.weeklyCount} 场`}
          accent="violet"
        />
        <StatCard
          icon={BarChart3}
          label="平均评分"
          value={stats.interviews.avgScore.toFixed(1)}
          sub={`近7天 ${stats.interviews.weeklyAvgScore.toFixed(1)}`}
          accent="amber"
        />
      </div>

      {/* 更多统计 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={TrendingUp}
          label="平均对话轮次"
          value={stats.interviews.avgTurns.toFixed(1)}
          sub={`近7天 ${stats.interviews.weeklyAvgTurns.toFixed(1)}`}
          accent="blue"
        />
        <StatCard
          icon={Volume2}
          label="今日 TTS 用量"
          value={formatNumber(stats.usage.today.ttsCharacters)}
          sub={`近7天 ${formatNumber(stats.usage.last7d.ttsCharacters)}`}
          accent="violet"
        />
      </div>

      {/* Token 用量详情 */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-500" />
          AI Token 用量统计
        </h2>
        <TokenUsageSection data={stats.usage.today} title="今日" />
        <TokenUsageSection data={stats.usage.last7d} title="近 7 天" />
        <TokenUsageSection data={stats.usage.last30d} title="近 30 天" />
      </div>


      
      {/* Announcements Tab */}
      <AdminAnnouncements />
          {activeTab === "订单管理" && <AdminOrders />}
    </div>
  );
}
