"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  FileText,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel } from "@/components/ui/glass";
import LoginModal from "@/components/auth/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import type { OptimizeAnalysis } from "@/app/api/optimize/route";

type Kind = "resume" | "interview";

type HistoryItem = {
  id: string;
  kind: Kind;
  positionLabel: string;
  answerType: string;
  recruitType: string;
  content: string;
  analysis: OptimizeAnalysis;
  createdAt: string;
};

const HISTORY_KEY = "aeroprep_optimize_history";
const MAX_HISTORY = 8;

const positionOptions = [
  { value: "pilot", label: "飞行员" },
  { value: "cabin", label: "空中乘务员" },
  { value: "cabin-safety", label: "客舱安全员" },
  { value: "maintenance", label: "机务维修" },
  { value: "dispatcher", label: "签派员" },
  { value: "atc", label: "空中交通管制员" },
  { value: "airport-ops", label: "机场运行" },
  { value: "terminal-service", label: "地服/安检" },
];

const answerTypes = ["自我介绍", "STAR案例", "职业规划", "岗位认知", "情景应变", "综合问题"];

/** 一键填入的示例：让用户立刻看到分析效果 */
const EXAMPLES: Record<Kind, string> = {
  interview:
    "面试官你好，我叫张明，是航空服务专业的大三学生。我性格比较开朗，喜欢和人打交道，在校期间参加过学校的礼仪社团，也做过迎新志愿者。我觉得乘务员可以到处飞，能去很多地方看看，这也是我想做这行的原因。我平时做事比较认真，学习能力也还可以，希望有机会加入贵公司。",
  resume:
    "张明 / 航空服务专业 / 2026 届本科；教育经历：2022.09-2026.06 某民航大学 航空服务专业；校园经历：参加学校礼仪社团、担任班级生活委员；实习经历：2024 年暑假在某机场地服实习一个月，负责旅客引导与值机协助；技能证书：英语四级、普通话二级甲等、红十字急救证；自我评价：性格开朗、能吃苦、有责任心，喜欢服务行业。",
};

const RESUME_DIMENSIONS = ["结构完整性", "量化成果", "岗位匹配度", "专业关键词", "HR 阅读体验"];
const INTERVIEW_DIMENSIONS = ["逻辑结构", "岗位匹配度", "专业与安全素养", "表达感染力", "案例支撑度"];

const PROGRESS_STEPS = [
  "正在通读原文，识别内容类型…",
  "正在对照岗位要求逐句比对…",
  "正在定位扣分点与可保留亮点…",
  "正在生成逐句改写与追问预测…",
  "正在整理最终优化稿…",
];

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-sky-600";
  if (score >= 55) return "text-amber-600";
  return "text-rose-600";
}

function scoreBg(score: number) {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-sky-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-rose-500";
}

export default function ChatWorkspace() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const [kind, setKind] = useState<Kind>("interview");
  const [position, setPosition] = useState("cabin");
  const [answerType, setAnswerType] = useState("自我介绍");
  const [recruitType, setRecruitType] = useState("校招");
  const [draft, setDraft] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<OptimizeAnalysis | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [tab, setTab] = useState<"overview" | "rewrites" | "followups" | "optimized">("overview");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const resultRef = useRef<HTMLDivElement | null>(null);
  const positionLabel = useMemo(
    () => positionOptions.find((p) => p.value === position)?.label || "民航岗位",
    [position],
  );
  const dimensionNames = kind === "resume" ? RESUME_DIMENSIONS : INTERVIEW_DIMENSIONS;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryItem[]);
    } catch { /* ignore */ }
  }, []);

  // 深度分析耗时较久，用分阶段提示让等待可感知
  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      return;
    }
    const id = window.setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 8000);
    return () => window.clearInterval(id);
  }, [loading]);

  const persistHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev.filter((h) => h.id !== item.id)].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDraft(text.slice(0, 5000));
    } catch { /* 用户拒绝授权时忽略 */ }
  };

  const resetResult = () => {
    setAnalysis(null);
    setFallbackText("");
    setError("");
  };

  const runOptimize = async () => {
    if (!draft.trim() || loading) return;
    if (!user) {
      setShowLogin(true);
      return;
    }

    setLoading(true);
    resetResult();
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          positionLabel,
          recruitType,
          answerType: kind === "interview" ? answerType : "简历",
          content: draft.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "分析失败，请稍后重试");
        return;
      }
      if (!data?.ok || !data.analysis) {
        setFallbackText(String(data?.rawText || ""));
        setError(data?.error || "AI 返回格式异常，已展示原始分析");
        return;
      }

      const next = data.analysis as OptimizeAnalysis;
      setAnalysis(next);
      setTab("overview");
      persistHistory({
        id: `${Date.now()}`,
        kind,
        positionLabel,
        answerType: kind === "interview" ? answerType : "简历",
        recruitType,
        content: draft.trim(),
        analysis: next,
        createdAt: new Date().toISOString(),
      });
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch {
      setError("网络异常，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  };

  const restoreHistory = (item: HistoryItem) => {
    setKind(item.kind);
    setPosition(positionOptions.find((p) => p.label === item.positionLabel)?.value || "cabin");
    setAnswerType(item.answerType);
    setRecruitType(item.recruitType);
    setDraft(item.content);
    setAnalysis(item.analysis);
    setFallbackText("");
    setError("");
    setTab("overview");
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const downloadText = (text: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AeroPrep-优化稿-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = analysis
    ? [
        { key: "overview" as const, label: "诊断总览", icon: BarChart3 },
        { key: "rewrites" as const, label: `逐句改写 ${analysis.rewrites.length}`, icon: Lightbulb },
        { key: "followups" as const, label: `追问预测 ${analysis.followups.length}`, icon: Target },
        { key: "optimized" as const, label: "优化稿", icon: FileText },
      ]
    : [];

  return (
    <AppFrame>
      <main className="relative z-10 min-h-dvh-safe px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-sky-100/25 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-100/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* ====== 顶部：紧凑标题栏（不再是巨幅 hero） ====== */}
          <header className="rise-in mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 shadow-sm backdrop-blur-md">
                <WandSparkles className="h-3 w-3 text-violet-500" />AI 优化
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 md:text-3xl">
                <span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">面试官视角</span>的深度诊断
              </h1>
              <p className="mt-2 max-w-xl text-xs leading-6 text-slate-500 md:text-sm">
                按目标岗位输出五维评分、逐句改写、追问预测与可直接使用的优化稿。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
              {["五维真实评分", "逐句改写对照", "面试追问预测", "岗位关键词覆盖"].map((item) => (
                <span key={item} className="rounded-full border border-white/50 bg-white/60 px-2.5 py-1 shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </header>

          {/* ====== 两栏工作区：左输入 / 右结果 ====== */}
          <div className="stagger-section grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
            {/* ---------- 左：输入 ---------- */}
            <section className="space-y-4 lg:sticky lg:top-6">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "interview" as const, icon: MessageSquare, title: "面试回答", desc: "自我介绍 / STAR / 情景题" },
                  { id: "resume" as const, icon: FileText, title: "简历诊断", desc: "结构 / 量化 / 关键词" },
                ].map((card) => {
                  const Icon = card.icon;
                  const active = kind === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => { setKind(card.id); resetResult(); }}
                      className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left transition ${
                        active ? "border-sky-200 bg-white shadow-md" : "border-white/50 bg-white/50 shadow-sm hover:bg-white/70"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active ? "bg-gradient-to-br from-sky-500 to-violet-500 text-white" : "bg-white/70 text-slate-500"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-xs font-semibold ${active ? "text-slate-900" : "text-slate-600"}`}>{card.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">{card.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <GlassPanel className="overflow-hidden rounded-[22px] border border-white/40 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/30 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  kind === "resume" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${kind === "resume" ? "bg-sky-400" : "bg-violet-400"}`} />
                  {kind === "resume" ? "简历诊断" : "回答优化"}
                </span>
                <span className="text-[11px] text-slate-400">{draft.length} / 5000</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setDraft(EXAMPLES[kind]); resetResult(); }}
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white"
                >
                  <Sparkles className="h-3 w-3" />填入示例
                </button>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white"
                >
                  <Clipboard className="h-3 w-3" />粘贴
                </button>
                {draft ? (
                  <button
                    type="button"
                    onClick={() => { setDraft(""); resetResult(); }}
                    className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white"
                  >
                    <RotateCcw className="h-3 w-3" />清空
                  </button>
                ) : null}
              </div>
            </div>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
              rows={10}
              placeholder={
                kind === "resume"
                  ? "粘贴完整简历内容（教育经历、实习、项目、证书等），AI 会按目标岗位诊断结构与量化成果"
                  : "粘贴你的面试回答或自我介绍，AI 会按目标岗位做五维诊断、逐句改写与追问预测"
              }
              className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
              style={{ minHeight: "240px" }}
            />

            <div className="flex flex-wrap items-center gap-3 border-t border-white/30 px-5 py-3">
              <label className="flex items-center gap-2 text-[11px] text-slate-500">
                目标岗位
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="rounded-xl border border-slate-200/60 bg-white/80 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-300"
                >
                  {positionOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>

              {kind === "interview" ? (
                <label className="flex items-center gap-2 text-[11px] text-slate-500">
                  回答类型
                  <select
                    value={answerType}
                    onChange={(e) => setAnswerType(e.target.value)}
                    className="rounded-xl border border-slate-200/60 bg-white/80 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-300"
                  >
                    {answerTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="flex items-center gap-1.5">
                {["校招", "社招"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecruitType(r)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                      recruitType === r
                        ? r === "校招" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
                        : "bg-white/70 text-slate-500 hover:bg-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={runOptimize}
                disabled={loading || !draft.trim()}
                className={`ml-auto inline-flex h-[44px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-medium text-white transition ${
                  loading || !draft.trim()
                    ? "cursor-not-allowed bg-slate-300 shadow-none"
                    : "bg-gradient-to-r from-sky-500 to-violet-500 shadow-lg hover:brightness-110"
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "正在深度分析…" : "开始深度诊断"}
              </button>
            </div>
          </GlassPanel>

              {history.length > 0 ? (
                <div className="rounded-2xl border border-white/50 bg-white/60 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <History className="h-3.5 w-3.5" />最近分析（点击回看）
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {history.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => restoreHistory(h)}
                        className="max-w-[200px] truncate rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[10px] text-slate-600 shadow-sm transition hover:bg-white"
                        title={h.content.slice(0, 60)}
                      >
                        {h.kind === "resume" ? "简历" : h.answerType} · {h.positionLabel} · {h.analysis.score}分
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {/* ---------- 右：诊断结果 ---------- */}
            <section className="min-w-0 space-y-4">
          {error ? (
            <div className="rounded-2xl bg-rose-50 px-5 py-3 text-center text-xs text-rose-600">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-medium text-sky-800">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {PROGRESS_STEPS[progressStep]}
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-sky-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-1000"
                  style={{ width: `${((progressStep + 1) / PROGRESS_STEPS.length) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-sky-600">
                深度诊断包含逐句比对与追问推演，通常 20-60 秒，请勿关闭页面
              </p>
            </div>
          ) : null}

          {!analysis && !loading && !fallbackText ? (
            <div className="space-y-4">
              {/* 结果示意：让空状态也能看出产品形态，避免右栏过空 */}
              <div className="rounded-[22px] border border-white/50 bg-white/60 px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <BarChart3 className="h-3.5 w-3.5 text-sky-500" />诊断结果示意
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500">示例</span>
                </div>
                <div className="mt-5 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400">综合评分</p>
                    <p className="mt-1 text-4xl font-semibold text-slate-300">62</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">中等</p>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {[
                      { n: "逻辑结构", w: 62 },
                      { n: "岗位匹配度", w: 48 },
                      { n: "专业与安全素养", w: 35 },
                      { n: "表达感染力", w: 70 },
                      { n: "案例支撑度", w: 42 },
                    ].map((d) => (
                      <div key={d.n}>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{d.n}</span>
                          <span className="text-slate-300">—</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-slate-200" style={{ width: `${d.w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {["诊断总览", "逐句改写 4", "追问预测 4", "优化稿"].map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-400">{t}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: BarChart3, title: "五维评分", desc: dimensionNames.join(" · ") },
                  { icon: Lightbulb, title: "逐句改写", desc: "指出原句问题，给出可直接替换的句子" },
                  { icon: Target, title: "追问预测", desc: "预测面试官会追问什么，怎么答" },
                  { icon: AlertTriangle, title: "扣分点排查", desc: "明确哪些表达会被扣分以及原因" },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="rounded-2xl border border-white/50 bg-white/60 px-4 py-4 shadow-sm">
                      <Icon className="h-4 w-4 text-sky-500" />
                      <p className="mt-2 text-xs font-semibold text-slate-700">{card.title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">{card.desc}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[11px] text-slate-400">
                越具体的内容（真实经历、数据、岗位术语）分析越有价值。
              </p>
            </div>
          ) : null}

          {analysis ? (
            <div ref={resultRef} className="rise-in space-y-4">
              <div className="rounded-[24px] border border-white/50 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">综合评分</p>
                    <p className={`mt-1 text-5xl font-semibold ${scoreColor(analysis.score)}`}>{analysis.score}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{analysis.level}</p>
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <p className="text-sm font-medium text-slate-800">{analysis.summary || "已完成诊断"}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      目标岗位：{positionLabel} · {recruitType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(analysis.optimized)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "已复制优化稿" : "复制优化稿"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-white/40 bg-white/60 p-1.5">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {tab === "overview" ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/50 bg-white/60 px-5 py-4 shadow-sm">
                    <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <BarChart3 className="h-4 w-4 text-sky-500" />五维评分
                    </p>
                    <div className="space-y-3">
                      {analysis.dimensions.map((d) => (
                        <div key={d.name}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-slate-600">{d.name}</span>
                            <span className={`font-semibold ${scoreColor(d.score)}`}>{d.score}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${scoreBg(d.score)}`} style={{ width: `${d.score}%` }} />
                          </div>
                          {d.comment ? <p className="mt-1 text-[11px] leading-5 text-slate-400">{d.comment}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" />可以保留的亮点
                      </p>
                      <ul className="space-y-2">
                        {analysis.highlights.length > 0 ? analysis.highlights.map((h, i) => (
                          <li key={i} className="flex gap-2 text-[11px] leading-5 text-emerald-900">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />{h}
                          </li>
                        )) : <li className="text-[11px] text-emerald-700">暂未识别到突出亮点</li>}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-5 py-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
                        <AlertTriangle className="h-4 w-4" />会被扣分的地方
                      </p>
                      <div className="space-y-3">
                        {analysis.risks.length > 0 ? analysis.risks.map((r, i) => (
                          <div key={i} className="text-[11px] leading-5 text-rose-900">
                            <p className="font-medium">{r.issue}</p>
                            {r.why ? <p className="text-rose-700">为什么：{r.why}</p> : null}
                            {r.fix ? <p className="text-rose-700">怎么改：{r.fix}</p> : null}
                          </div>
                        )) : <p className="text-[11px] text-rose-700">暂未发现明显扣分点</p>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/50 bg-white/60 px-5 py-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Target className="h-4 w-4 text-violet-500" />岗位关键词覆盖
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1.5 text-[11px] text-slate-500">已覆盖</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.keywords.hit.length > 0 ? analysis.keywords.hit.map((k) => (
                            <span key={k} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">{k}</span>
                          )) : <span className="text-[11px] text-slate-400">未识别到明确关键词</span>}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] text-slate-500">建议补充</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.keywords.missing.length > 0 ? analysis.keywords.missing.map((k) => (
                            <span key={k} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">{k}</span>
                          )) : <span className="text-[11px] text-slate-400">关键词覆盖较完整</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "rewrites" ? (
                <div className="mt-5 space-y-3">
                  {analysis.rewrites.length > 0 ? analysis.rewrites.map((r, i) => (
                    <div key={i} className="rounded-2xl border border-white/50 bg-white/60 px-5 py-4 shadow-sm">
                      <p className="text-[11px] font-medium text-slate-500">原句</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{r.original}</p>
                      {r.problem ? (
                        <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-amber-700">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.problem}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50/70 px-4 py-3">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <p className="text-sm leading-6 text-emerald-900">{r.improved}</p>
                      </div>
                    </div>
                  )) : <p className="rounded-2xl bg-white/60 px-5 py-6 text-center text-xs text-slate-400">本次未生成逐句改写</p>}
                </div>
              ) : null}

              {tab === "followups" ? (
                <div className="mt-5 space-y-3">
                  {analysis.followups.length > 0 ? analysis.followups.map((f, i) => (
                    <div key={i} className="rounded-2xl border border-white/50 bg-white/60 px-5 py-4 shadow-sm">
                      <p className="flex items-start gap-2 text-sm font-medium text-slate-800">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />{f.question}
                      </p>
                      {f.answerTip ? (
                        <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-[12px] leading-6 text-slate-600">
                          应答要点：{f.answerTip}
                        </p>
                      ) : null}
                    </div>
                  )) : <p className="rounded-2xl bg-white/60 px-5 py-6 text-center text-xs text-slate-400">本次未生成追问预测</p>}
                </div>
              ) : null}

              {tab === "optimized" ? (
                <div className="mt-5 rounded-2xl border border-sky-100 bg-white px-6 py-5 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <FileText className="h-4 w-4 text-sky-500" />优化稿（可直接使用）
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(analysis.optimized)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-200"
                      >
                        <Copy className="h-3 w-3" />复制
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadText(analysis.optimized)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-200"
                      >
                        <Download className="h-3 w-3" />下载
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-slate max-w-none text-sm leading-7 [&_strong]:text-slate-900">
                    <ReactMarkdown>{analysis.optimized || "（本次未生成优化稿）"}</ReactMarkdown>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {fallbackText ? (
            <div className="rise-in rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
              <p className="mb-2 text-xs font-medium text-amber-800">AI 原始分析（格式解析失败，内容仍可参考）</p>
              <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-amber-900">{fallbackText}</div>
            </div>
          ) : null}
            </section>
          </div>
        </div>
      </main>
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        message="登录后即可使用 AI 深度诊断（对已登录用户免费）"
      />
    </AppFrame>
  );
}
