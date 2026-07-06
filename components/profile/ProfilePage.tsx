"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock3, FileSearch, LineChart, TrendingUp, LogIn } from "lucide-react";
import Link from "next/link";
import AppFrame from "@/components/layout/AppFrame";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import {
  readGrowthEvents,
  subscribeGrowthEvents,
} from "@/lib/profile/growth-storage";
import { readInterviewSessions, subscribeInterviewSessions } from "@/lib/interview/session-storage";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/supabase/types";

function formatMeta(value: string) {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

export default function ProfilePage() {
  const [sessions, setSessions] = useState(() => readInterviewSessions());
  const [growthEvents, setGrowthEvents] = useState(() => readGrowthEvents());

  useEffect(() => {
    const sync = () => {
      setSessions(readInterviewSessions());
      setGrowthEvents(readGrowthEvents());
    };

    sync();
    const unsubscribeSessions = subscribeInterviewSessions(sync);
    const unsubscribeGrowth = subscribeGrowthEvents(sync);

    return () => {
      unsubscribeSessions();
      unsubscribeGrowth();
    };
  }, []);

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.report),
    [sessions]
  );

  const historyItems = useMemo(
    () =>
      completedSessions.slice(0, 6).map((session) => ({
        title: `${session.company} · ${session.roleLabel} · ${session.mode}`,
        meta: formatMeta(session.createdAt),
        score: session.report?.totalScore ?? 0,
      })),
    [completedSessions]
  );

  const averageScore = useMemo(() => {
    if (!completedSessions.length) return 0;
    const total = completedSessions.reduce(
      (sum, session) => sum + (session.report?.totalScore ?? 0),
      0
    );
    return Math.round(total / completedSessions.length);
  }, [completedSessions]);

  const trendBars = useMemo(() => {
    const scores = completedSessions
      .slice(0, 6)
      .map((session) => session.report?.totalScore ?? 0)
      .reverse();

    return scores.length ? scores : [0];
  }, [completedSessions]);

  const reportItems = useMemo(() => {
    const latestSession = completedSessions[0];
    if (!latestSession?.report) {
      return [
        "完成一次真实面试后，这里会显示你的最新成长摘要。",
        "后续会根据作答表现动态更新优势和改进方向。",
        "每次训练事件都会记录进成长中心。",
      ];
    }

    return [
      `最近完成：${latestSession.company} · ${latestSession.roleLabel} · 综合分 ${latestSession.report.totalScore}`,
      latestSession.report.highlights[0] || "最近一次训练已写入成长档案。",
      latestSession.report.improvementSuggestions[0] || "继续完成更多训练以生成更稳定的成长建议。",
    ];
  }, [completedSessions]);

  const growthSummary = useMemo(() => {
    const started = growthEvents.filter((event) => event.type === "interview_started").length;
    const answered = growthEvents.filter((event) => event.type === "question_answered").length;
    const ttsPlayed = growthEvents.filter((event) => event.type === "tts_played").length;
    return { started, answered, ttsPlayed };
  }, [growthEvents]);

  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <GlassPanel className="soft-enter overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-x-18 top-0 h-24 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/44 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Growth Center
                </p>
                <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                  成长中心
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                  汇总面试历史、成绩趋势、最近报告与成长曲线，帮助你持续追踪训练表现。
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <GlassCard className="px-5 py-5">
                  <div className="relative">
                    <Clock3 className="h-5 w-5 text-cyan-500" />
                    <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">
                      面试历史
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {completedSessions.length} 次
                    </p>
                  </div>
                </GlassCard>
                <GlassCard className="px-5 py-5">
                  <div className="relative">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">
                      平均成绩
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {averageScore}
                    </p>
                  </div>
                </GlassCard>
              </div>
            </div>
          </GlassPanel>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
            <GlassPanel className="soft-enter-delay px-6 py-6">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-slate-700" />
                <p className="text-sm font-medium text-slate-950">面试历史</p>
              </div>

              <div className="mt-5 space-y-3">
                {historyItems.length ? historyItems.map((item) => (
                  <GlassCard key={`${item.title}-${item.meta}`} className="px-4 py-4">
                    <div className="relative flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="mt-2 text-xs text-slate-500">{item.meta}</p>
                      </div>
                      <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                        {item.score}
                      </div>
                    </div>
                  </GlassCard>
                )) : (
                  <GlassCard className="px-4 py-4">
                    <p className="text-sm text-slate-600">还没有完成的面试记录，完成一次面试后会实时出现在这里。</p>
                  </GlassCard>
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="soft-enter-delay px-6 py-6">
              <div className="flex items-center gap-3">
                <LineChart className="h-5 w-5 text-slate-700" />
                <p className="text-sm font-medium text-slate-950">成绩趋势</p>
              </div>

              <div className="mt-8 rounded-[28px] border border-white/36 bg-white/22 px-5 py-6">
                <div className="flex h-56 items-end justify-between gap-3">
                  {trendBars.map((height, index) => (
                    <div key={`trend-${height}-${index}`} className="flex flex-1 flex-col items-center gap-3">
                      <div
                        className="w-full rounded-t-[20px] bg-[linear-gradient(180deg,rgba(96,165,250,0.92),rgba(37,113,255,0.54))]"
                        style={{ height: `${Math.max(height, 8) * 1.6}px` }}
                      />
                      <span className="text-xs text-slate-500">0{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
            <GlassPanel className="soft-enter-delay-2 px-6 py-6">
              <div className="flex items-center gap-3">
                <FileSearch className="h-5 w-5 text-slate-700" />
                <p className="text-sm font-medium text-slate-950">最近报告</p>
              </div>

              <div className="mt-5 space-y-3">
                {reportItems.map((item) => (
                  <GlassCard key={item} className="px-4 py-4">
                    <p className="relative text-sm leading-7 text-slate-700">{item}</p>
                  </GlassCard>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="soft-enter-delay-2 px-6 py-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-slate-700" />
                <p className="text-sm font-medium text-slate-950">成长曲线</p>
              </div>

              <div className="mt-6 rounded-[30px] border border-white/36 bg-slate-950/88 p-6 text-white shadow-[0_24px_60px_rgba(10,18,36,0.28)]">
                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">
                  Growth Snapshot
                </p>
                <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  已记录 {growthSummary.started} 次开始，{growthSummary.answered} 次作答
                </p>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                  TTS 已播放 {growthSummary.ttsPlayed} 次。成长中心现在会随着面试开始、问题作答、语音播放和面试完成持续更新，不再展示静态数据。
                </p>
              </div>
            </GlassPanel>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
