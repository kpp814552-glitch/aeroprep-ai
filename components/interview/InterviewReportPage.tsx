"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CircleGauge,
  Radar,
  TrendingUp,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import {
  readInterviewSession,
  readInterviewSessions,
} from "@/lib/interview/session-storage";
import type { InterviewSessionRecord } from "@/lib/interview/types";

function getRadarPoint(index: number, total: number, value: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  const radius = 88 * (value / 100);
  const x = 110 + radius * Math.cos(angle);
  const y = 110 + radius * Math.sin(angle);
  return `${x},${y}`;
}

function ScoreRadar({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const polygon = items.map((item, index) => getRadarPoint(index, items.length, item.value)).join(" ");

  return (
    <div className="rounded-[34px] border border-white/44 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.46))] p-6 shadow-[0_22px_58px_rgba(72,52,31,0.08)]">
      <div className="flex items-center gap-3">
        <Radar className="h-5 w-5 text-sky-600" />
        <p className="text-sm font-medium text-slate-800">能力雷达图</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <svg viewBox="0 0 220 220" className="mx-auto h-64 w-64">
          {[20, 40, 60, 80, 100].map((level) => {
            const guide = items
              .map((_, index) => getRadarPoint(index, items.length, level))
              .join(" ");

            return (
              <polygon
                key={level}
                points={guide}
                fill="none"
                stroke="rgba(107,114,128,0.18)"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={polygon}
            fill="rgba(73,146,198,0.18)"
            stroke="rgba(73,146,198,0.88)"
            strokeWidth="2"
          />

          {items.map((item, index) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
            const x = 110 + 102 * Math.cos(angle);
            const y = 110 + 102 * Math.sin(angle);

            return (
              <text
                key={item.label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-700 text-[10px]"
              >
                {item.label}
              </text>
            );
          })}
        </svg>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-white/48 bg-white/52 px-4 py-4"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[32px] border border-white/44 bg-white/56 p-6 shadow-[0_18px_42px_rgba(75,54,31,0.06)]">
      <p className="text-sm font-medium text-slate-950">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}-${item}`}
            className="rounded-[22px] border border-white/44 bg-white/74 px-4 py-4 text-sm leading-7 text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InterviewReportPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sessionRecord, setSessionRecord] = useState<InterviewSessionRecord | null>(null);
  const [completedSessionCount, setCompletedSessionCount] = useState(0);

  useEffect(() => {
    const syncSession = window.setTimeout(() => {
      setHasHydrated(true);
      setSessionRecord(readInterviewSession(sessionId) as InterviewSessionRecord | null);
      setCompletedSessionCount(readInterviewSessions().length);
    }, 0);

    return () => {
      window.clearTimeout(syncSession);
    };
  }, [sessionId]);

  const radarItems = useMemo(() => {
    const report = sessionRecord?.report;
    if (!report) return [];
    console.log('[Report Render] sessionId=' + (sessionRecord?.sessionId || 'none') + ' scores=', report.scores);

    return [
      { label: "表达能力", value: report.scores.expressionAbility },
      { label: "逻辑能力", value: report.scores.logicalThinking },
      { label: "专业能力", value: report.scores.professionalKnowledge },
      { label: "岗位匹配", value: report.scores.roleFit },
      { label: "语言清晰", value: report.scores?.articulation ?? 0 },
      { label: "应变能力", value: report.scores?.adaptability ?? 0 },
      { label: "服务意识", value: report.scores?.serviceAwareness ?? 0 },
    ];
  }, [sessionRecord]);

  if (!hasHydrated) {
    return (
      <AppFrame backHref="/interview" backLabel="返回准备页">
        <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
          <div className="mx-auto max-w-7xl rounded-[36px] border border-white/48 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] px-6 py-8 shadow-[0_24px_64px_rgba(74,56,31,0.08)] md:px-8 md:py-10">
            <div className="animate-pulse space-y-5">
              <div className="h-6 w-32 rounded-full bg-slate-200/80" />
              <div className="h-12 w-48 rounded-2xl bg-slate-200/80" />
              <div className="h-5 w-full max-w-3xl rounded-full bg-slate-200/70" />
              <div className="h-5 w-full max-w-2xl rounded-full bg-slate-200/60" />
            </div>
          </div>
        </main>
      </AppFrame>
    );
  }

  if (!sessionRecord?.report) {
    return (
      <AppFrame backHref="/interview" backLabel="返回准备页">
        <main className="relative z-10 px-5 pb-16 pt-10 md:px-8">
          <div className="mx-auto max-w-4xl rounded-[34px] border border-white/44 bg-white/62 px-8 py-12 text-center shadow-[0_18px_52px_rgba(65,48,31,0.08)]">
            <p className="text-sm uppercase tracking-[0.34em] text-slate-500">Interview Report</p>
            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              暂无可展示的面试报告
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              请先完成一轮 AI 面试，系统会根据真实问答生成本次报告。
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/interview"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-none transition-all duration-200 ease-in-out hover:-translate-y-px hover:border-white/25 hover:bg-white/18"
              >
                返回面试准备页
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>
      </AppFrame>
    );
  }

  const { report } = sessionRecord;

  return (
    <AppFrame backHref="/interview" backLabel="返回准备页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[36px] border border-white/48 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.48))] px-6 py-8 shadow-[0_24px_64px_rgba(74,56,31,0.08)] md:px-8 md:py-10">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/74 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
                  <BarChart3 className="h-4 w-4 text-sky-600" />
                  Interview Report
                </div>
                <h1 className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                  面试报告
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  基于本次 {sessionRecord.company} · {sessionRecord.roleLabel} · {sessionRecord.mode}
                  面试记录生成，包含真实评分、优势、不足、改进方向与岗位竞争力评估。
                </p>
                <p className="mt-6 text-sm leading-7 text-slate-700">{report.narrativeSummary}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[28px] border border-white/46 bg-white/68 px-5 py-5">
                  <CircleGauge className="h-5 w-5 text-sky-600" />
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">
                    综合评分
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                    {report.totalScore}
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/46 bg-white/68 px-5 py-5">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">
                    竞争力等级
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                    {report.competitiveLevel || '—'}
                  </p>
                  <p className="mt-0.5 text-xs tracking-[0.08em] text-slate-500">
                    参考区间：{report.competitiveRange || '—'}
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/46 bg-white/68 px-5 py-5">
                  <Radar className="h-5 w-5 text-amber-600" />
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">
                    面试轮次
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                    {Math.max(1, completedSessionCount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ScoreRadar items={radarItems} />

          {/* ── 民航岗位竞争力评估 ── */}
          {report.competitiveLevel ? (
            <div className="rounded-[34px] border border-white/44 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.46))] p-6 shadow-[0_22px_58px_rgba(72,52,31,0.08)]">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                民航岗位竞争力评估
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                本评估仅基于本次模拟面试表现生成，不代表真实招聘结果。
              </p>

              {/* 竞争力分数 + 等级 */}
              <div className="mt-5 grid gap-4 sm:grid-cols-4">
                <div className="rounded-[20px] border border-white/46 bg-white/68 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">当前等级</p>
                  <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-950">{report.competitiveLevel}</p>
                </div>
                <div className="rounded-[20px] border border-white/46 bg-white/68 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">综合评分</p>
                  <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-950">{report.competitiveScore}</p>
                </div>
                <div className="rounded-[20px] border border-white/46 bg-white/68 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">参考区间</p>
                  <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950">{report.competitiveRange}</p>
                </div>
                <div className="rounded-[20px] border border-white/46 bg-white/68 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">判分模型</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    面试表现40% · 岗位匹配20%<br/>专业素养15% · 综合素质15% · 成长潜力10%
                  </p>
                </div>
              </div>

              {/* 优势因素 */}
              {report.competitiveStrengths && report.competitiveStrengths.length > 0 ? (
                <div className="mt-5">
                  <p className="text-sm font-medium text-emerald-700">优势因素</p>
                  <div className="mt-2 space-y-2">
                    {report.competitiveStrengths.map((item, i) => (
                      <div key={i} className="rounded-[16px] border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 限制因素 */}
              {report.competitiveWeaknesses && report.competitiveWeaknesses.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-amber-700">限制因素</p>
                  <div className="mt-2 space-y-2">
                    {report.competitiveWeaknesses.map((item, i) => (
                      <div key={i} className="rounded-[16px] border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 面试官视角 */}
              {report.interviewerPerspective ? (
                <div className="mt-5 rounded-[20px] border border-sky-100 bg-sky-50/60 px-5 py-4">
                  <p className="text-sm font-medium text-sky-800">如果我是航空公司面试官</p>
                  <p className="mt-2 text-sm leading-7 text-sky-700">{report.interviewerPerspective}</p>
                </div>
              ) : null}

              {/* 影响因素说明 */}
              {report.externalFactors ? (
                <div className="mt-4 rounded-[20px] border border-white/48 bg-white/60 px-5 py-4">
                  <p className="text-xs font-medium text-slate-600">影响因素说明</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{report.externalFactors}</p>
                </div>
              ) : null}

              {/* 提升模拟 */}
              {report.trainingProjection ? (
                <div className="mt-4 rounded-[20px] border border-indigo-100 bg-indigo-50/60 px-5 py-4">
                  <p className="text-sm font-medium text-indigo-800">训练提升预测</p>
                  <p className="mt-2 text-sm leading-7 text-indigo-700">{report.trainingProjection}</p>
                </div>
              ) : null}

            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportList title="优势分析" items={report.strengths} />
            <ReportList title="不足分析" items={report.weaknesses} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <ReportList title="改进建议" items={report.improvementSuggestions} />
            <ReportList title="推荐训练方向" items={report.recommendedTraining} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
           <div className="rounded-[32px] border border-white/44 bg-white/56 p-6 shadow-[0_18px_42px_rgba(75,54,31,0.06)]">
             <p className="text-sm font-medium text-slate-950">综合评价</p>
             <p className="mt-4 text-base leading-8 text-slate-700">{report.overallEvaluation}</p>
             {report.comprehensiveEvaluation ? (
               <div className="mt-6 border-t border-white/40 pt-6">
                 <p className="text-sm font-medium text-slate-950">面试综合评价</p>
                 <div className="mt-3 whitespace-pre-wrap text-base leading-8 text-slate-700">
                   {report.comprehensiveEvaluation}
                 </div>
               </div>
             ) : null}
             {report.perQuestionAnalysis && report.perQuestionAnalysis.length > 0 ? (
               <div className="mt-6 border-t border-white/40 pt-6">
                 <p className="text-sm font-medium text-slate-950">面试问题逐题分析</p>
                 <div className="mt-3 space-y-4">
                   {report.perQuestionAnalysis.map((analysis, idx) => (
                     <div key={idx} className="rounded-[20px] border border-white/46 bg-white/72 px-4 py-4 text-sm leading-7 text-slate-700">
                       {analysis}
                     </div>
                   ))}
                 </div>
               </div>
             ) : null}
             {report.personalProfile ? (
               <div className="mt-6 border-t border-white/40 pt-6">
                 <p className="text-sm font-medium text-slate-950">个人能力画像</p>
                 <div className="mt-3 whitespace-pre-wrap text-base leading-8 text-slate-700">
                   {report.personalProfile}
                 </div>
               </div>
             ) : null}
             {report.careerMatch ? (
               <div className="mt-6 border-t border-white/40 pt-6">
                 <p className="text-sm font-medium text-slate-950">岗位匹配分析</p>
                 <div className="mt-3 whitespace-pre-wrap text-base leading-8 text-slate-700">
                   {report.careerMatch}
                 </div>
               </div>
             ) : null}
             {report.improvementPlan ? (
               <div className="mt-6 border-t border-white/40 pt-6">
                 <p className="text-sm font-medium text-slate-950">未来提升方案</p>
                 <div className="mt-3 whitespace-pre-wrap text-base leading-8 text-slate-700">
                   {report.improvementPlan}
                 </div>
               </div>
             ) : null}
             {report.nextPrediction ? (
               <div className="mt-6 border-t border-white/40 pt-6">
                 <p className="text-sm font-medium text-slate-950">下一次面试预测</p>
                 <div className="mt-3 whitespace-pre-wrap text-base leading-8 text-slate-700">
                   {report.nextPrediction}
                 </div>
               </div>
             ) : null}
             {report.growthMessage ? (
               <div className="mt-6 border-t border-slate-200/60 pt-6">
                 <p className="text-sm font-medium text-cyan-800">成长寄语</p>
                 <div className="mt-3 whitespace-pre-wrap text-base leading-8 text-cyan-700">
                   {report.growthMessage}
                 </div>
               </div>
             ) : null}
             {report.highlights?.length ? (
                <div className="mt-6 space-y-3">
                  {report.highlights.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-[20px] border border-white/46 bg-white/72 px-4 py-4 text-sm leading-7 text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[32px] border border-white/44 bg-white/56 p-6 shadow-[0_18px_42px_rgba(75,54,31,0.06)]">
              <p className="text-sm font-medium text-slate-950">本次面试信息</p>
              <div className="mt-4 grid gap-3">
                {[
                  `目标航司：${sessionRecord.company}`,
                  `目标岗位：${sessionRecord.roleLabel}`,
                  `面试模式：${sessionRecord.mode}`,
                  `面试官风格：${sessionRecord.persona}`,
                  `总时长：${Math.max(1, sessionRecord.elapsedSeconds ?? 0)} 秒`,
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-white/46 bg-white/72 px-4 py-4 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/profile"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-none transition-all duration-200 ease-in-out hover:-translate-y-px hover:border-white/25 hover:bg-white/18"
                >
                  进入成长中心
                </Link>
                <Link
                  href="/interview"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-none transition-all duration-200 ease-in-out hover:-translate-y-px hover:border-white/25 hover:bg-white/18"
                >
                  再练一次
                </Link>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"
            >
              查看成长中心
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
