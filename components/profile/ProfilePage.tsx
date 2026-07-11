"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Clock3, FileSearch, LineChart, TrendingUp, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AppFrame from "@/components/layout/AppFrame";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import {
  readGrowthEvents,
  subscribeGrowthEvents,
} from "@/lib/profile/growth-storage";
import { readInterviewSessions, subscribeInterviewSessions } from "@/lib/interview/session-storage";
import type { InterviewSessionRecord } from "@/lib/interview/types";

function formatMeta(value: string) {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading && !user) router.replace('/login?redirect=/profile'); }, [loading, user, router]);
  if (loading) return null;
  if (!user) return null;

  const [sessions, setSessions] = useState(() => readInterviewSessions());
  const [growthEvents, setGrowthEvents] = useState(() => readGrowthEvents());
  const [selectedSession, setSelectedSession] = useState<InterviewSessionRecord | null>(null);

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
      completedSessions.map((session) => ({
        sessionId: session.sessionId,
        title: `${session.company} · ${session.roleLabel} · ${session.mode}`,
        meta: formatMeta(session.createdAt),
        score: session.report?.totalScore ?? 0,
        rounds: session.turns?.length ?? 0,
        durationSeconds: session.elapsedSeconds ?? 0,
        hiringProbability: session.report?.hiringProbability ?? 0,
        report: session.report,
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
      latestSession.report.highlights?.[0] || "最近一次训练已写入成长档案。",
      latestSession.report.improvementSuggestions?.[0] || "继续完成更多训练以生成更稳定的成长建议。",
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
                  <GlassCard
                    key={`${item.sessionId}`}
                    className="px-4 py-4 transition hover:bg-white/40"
                  >
                    <div
                      className="relative cursor-pointer"
                      onClick={() => {
                        const session = completedSessions.find((s) => s.sessionId === item.sessionId);
                        if (session) setSelectedSession(session);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const session = completedSessions.find((s) => s.sessionId === item.sessionId); if (session) setSelectedSession(session); } }}
                    >
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.rounds} 轮 · {Math.floor(item.durationSeconds / 60)} 分 {item.durationSeconds % 60} 秒 · 录取率 {item.hiringProbability}%
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                          {item.score}
                        </div>
                        <p className="text-[10px] text-slate-400">点击查看详情</p>
                      </div>
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
                <div className="flex h-40 sm:h-56 items-end justify-between gap-1 sm:gap-3">
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
      {selectedSession && selectedSession.report && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/28 px-6 py-6 shadow-[0_28px_72px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-8 md:py-8" style={{ background: 'var(--surface-strong)', margin: '0 8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/60 text-slate-500 transition hover:bg-white hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  {selectedSession.company} · {selectedSession.roleLabel} · {selectedSession.mode}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  面试报告
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedSession.turns?.length ?? 0} 轮 · 用时 {Math.floor((selectedSession.elapsedSeconds ?? 0) / 60)} 分 · 评分 {selectedSession.report.totalScore}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "表达能力", value: selectedSession.report.scores.expressionAbility },
                  { label: "逻辑能力", value: selectedSession.report.scores.logicalThinking },
                  { label: "专业能力", value: selectedSession.report.scores.professionalKnowledge },
                  { label: "岗位匹配", value: selectedSession.report.scores.roleFit },
                ].map((score) => (
                  <div key={score.label} className="rounded-[20px] border border-slate-200/60 bg-slate-50/60 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{score.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{score.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[20px] border border-slate-200/60 bg-slate-50/60 px-5 py-4">
                <p className="text-sm leading-7 text-slate-700">{selectedSession.report.overallEvaluation}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[20px] border border-emerald-200/60 bg-emerald-50/50 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">优势</p>
                  <ul className="mt-3 space-y-2">
                    {selectedSession.report.strengths.map((s, i) => (
                      <li key={i} className="text-sm leading-6 text-emerald-900"><span className="mr-2 text-emerald-500">+</span>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[20px] border border-amber-200/60 bg-amber-50/50 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-700">待改进</p>
                  <ul className="mt-3 space-y-2">
                    {selectedSession.report.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm leading-6 text-amber-900"><span className="mr-2 text-amber-500">-</span>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {selectedSession.report.hiringProbability > 0 && (
                <div className="rounded-[20px] border border-blue-200/60 bg-blue-50/50 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-700">模拟录取率</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-800">{selectedSession.report.hiringProbability}%</p>
                </div>
              )}

              {selectedSession.report.highlights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">亮点摘要</p>
                  {selectedSession.report.highlights.map((h, i) => (
                    <div key={i} className="rounded-[16px] border border-slate-200/40 bg-white/60 px-4 py-3">
                      <p className="text-sm leading-6 text-slate-700">{h}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedSession.report.improvementSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">改进建议</p>
                  {selectedSession.report.improvementSuggestions.map((a, i) => (
                    <div key={i} className="rounded-[16px] border border-slate-200/40 bg-white/60 px-4 py-3">
                      <p className="text-sm leading-6 text-slate-700">{a}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedSession.report.narrativeSummary && (
                <div className="rounded-[20px] border border-violet-200/60 bg-violet-50/50 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-700">总结</p>
                  <p className="mt-2 text-sm leading-7 text-violet-900">{selectedSession.report.narrativeSummary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppFrame>
  );
}
