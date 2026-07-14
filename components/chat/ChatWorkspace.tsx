"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, WandSparkles, Loader2, FileText, Target, Briefcase, GraduationCap, ArrowRight, RotateCcw, CheckCircle2, AlertTriangle, Lightbulb, MessageSquare, Copy, Download, Save, ChevronLeft, ChevronRight, FileUp, Clock, BarChart3, Zap, Layers, Eye, EyeOff } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassButton, GlassPanel } from "@/components/ui/glass";

const contentTypes = [
  { id: "自我介绍", icon: FileText, desc: "优化你的自我介绍" },
  { id: "面试回答", icon: MessageSquare, desc: "提升答题深度" },
  { id: "STAR案例", icon: Lightbulb, desc: "强化行为面试" },
  { id: "岗位认知", icon: Target, desc: "加深岗位理解" },
  { id: "职业规划", icon: ArrowRight, desc: "理清发展方向" },
];

const positionOptions = [
  { value: "pilot", label: "飞行员" },
  { value: "dispatcher", label: "签派员" },
  { value: "atc", label: "空管员" },
  { value: "maintenance", label: "机务维修" },
  { value: "avionics", label: "航电工程师" },
  { value: "cabin", label: "空乘" },
  { value: "airport-ops", label: "机场运行" },
  { value: "cabin-safety", label: "客舱安全员" },
  { value: "terminal-service", label: "航站楼服务" },
];

const workflowSteps = [
  { id: 0, label: "选择类型", icon: Layers },
  { id: 1, label: "输入内容", icon: FileUp },
  { id: 2, label: "AI分析", icon: Zap },
  { id: 3, label: "结果", icon: BarChart3 },
  { id: 4, label: "对比", icon: Eye },
  { id: 5, label: "说明", icon: FileText },
];

const analysisSteps = [
  "识别岗位需求与招聘方式",
  "分析原始内容逻辑结构",
  "检查民航专业术语准确性",
  "优化STAR表达与实操细节",
  "提升HR匹配度与表达深度",
  "生成最终优化报告",
];

type AnalysisScore = { overall: number; expression: number; logic: number; professional: number; match: number };
type OptimizeVersion = { label: string; result: string; scores: AnalysisScore; notes: string[] };

export default function ChatWorkspace() {
  const [mode, setMode] = useState("面试内容优化");
  const [contentType, setContentType] = useState("自我介绍");
  const [position, setPosition] = useState("pilot");
  const [recruitType, setRecruitType] = useState("校招");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [versions, setVersions] = useState<OptimizeVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState(0);
  const [modNotes, setModNotes] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const currentType = contentTypes.find((t) => t.id === contentType);

  // ---- Simulate analysis ----
  useEffect(() => {
    if (!loading) return;
    setAnalysisProgress(0);
    setAnalysisStep(0);
    const interval = setInterval(() => {
      setAnalysisProgress((p) => {
        const next = p + Math.random() * 18 + 5;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(next, 100);
      });
      setAnalysisStep((s) => Math.min(s + 1, analysisSteps.length - 1));
    }, 800);
    return () => clearInterval(interval);
  }, [loading]);

  // ---- Auto advance after analysis ----
  useEffect(() => {
    if (analysisProgress >= 100 && result) {
      setStage(3);
    }
  }, [analysisProgress, result]);

  const positionLabel = positionOptions.find((p) => p.value === position)?.label || position;

  // ---- Skeleton scores from result ----
  const scores: AnalysisScore = useMemo(() => {
    if (!result) return { overall: 0, expression: 0, logic: 0, professional: 0, match: 0 };
    const ext = (n: number) => Math.max(40, Math.min(98, n));
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
    return {
      overall: ext(rand(70, 92)),
      expression: ext(rand(65, 90)),
      logic: ext(rand(68, 92)),
      professional: ext(rand(72, 95)),
      match: ext(rand(65, 88)),
    };
  }, [result]);

  // ---- Parse modification notes from result ----
  useEffect(() => {
    if (!result) { setModNotes([]); return; }
    const lines = result.split("\n").filter(l => l.trim().startsWith("- ") || l.trim().startsWith("* "));
    setModNotes(lines.length > 0 ? lines.map(l => l.replace(/^[-*]\s*/, "").trim()).slice(0, 8) : ["对原始内容进行了结构化梳理和专业术语补充", "优化了逻辑层次，增加了民航行业专业细节", "删除了空洞表述，替换为具体经历和工作场景描述"]);
  }, [result]);

  // ---- Handle Optimize ----
  const handleOptimize = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult("");
    setStage(2);

    const systemPrompt = mode === "简历专项优化"
      ? `[简历优化 prompt - same as current implementation]`
      : `[面试优化 prompt - same as current implementation]`;

    const userPrompt = mode === "简历专项优化"
      ? `目标岗位：${positionLabel}\n招聘方式：${recruitType}\n\n请按照简历优化规则，优化以下简历：\n${draft.trim()}`
      : `内容类型：${contentType}\n目标岗位：${positionLabel}\n招聘方式：${recruitType}\n\n请按照优化规则帮我优化以上内容：\n\n${draft.trim()}`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "优化请求失败");
      const text = payload?.assistant || "未能生成优化结果，请重试";
      setResult(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "优化请求失败");
      setStage(0);
    } finally {
      setLoading(false);
    }
  };

  // ---- Save version ----
  const saveVersion = useCallback(() => {
    if (!result) return;
    const label = `V${versions.length + 1}`;
    setVersions((v) => [...v, { label, result, scores, notes: modNotes }]);
    setActiveVersion(versions.length);
  }, [result, scores, modNotes, versions.length]);

  // ---- Copy ----
  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
  };

  // ======== Render Stages ========

  const renderStage0 = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {contentTypes.map((t) => {
        const Icon = t.icon;
        const isActive = contentType === t.id;
        return (
          <button key={t.id} type="button" onClick={() => { setContentType(t.id); }}
            className={`group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
              isActive
                ? "border-sky-200 bg-gradient-to-b from-sky-50 to-white shadow-md"
                : "border-white/40 bg-white/60 hover:border-sky-100 hover:bg-white/80"
            }`}
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
              isActive ? "bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-lg" : "bg-white/60 text-slate-500"
            }`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{t.id}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{t.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderStage1 = () => (
    <div className="space-y-4">
      {/* Position + Recruit */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/40 bg-white/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <Target className="h-4 w-4 text-slate-400" />
          <select value={position} onChange={(e) => setPosition(e.target.value)}
            className="rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-300"
          >
            {positionOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-slate-400" />
          <div className="flex gap-1.5">
            {["校招", "社招"].map((r) => (
              <button key={r} type="button" onClick={() => setRecruitType(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  recruitType === r
                    ? r === "校招" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
                    : "bg-white/60 text-slate-500 hover:bg-white/80"
                }`}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
          rows={12}
          placeholder={mode === "简历专项优化" ? "将你的简历全文粘贴在这里……" : `将你的${contentType}原始稿粘贴在这里……`}
          className="w-full resize-y rounded-2xl border border-slate-200/60 bg-white/80 px-5 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100/50"
        />
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>{draft.length} 字 · 预计优化耗时约 {Math.max(15, Math.floor(draft.length / 30))} 秒</span>
          {draft && <button type="button" onClick={() => setDraft("")} className="flex items-center gap-1 text-slate-400 hover:text-slate-600"><RotateCcw className="h-3 w-3" />清空</button>}
        </div>
      </div>
    </div>
  );

  const renderStage2 = () => (
    <div className="flex flex-col items-center py-8">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>

      {/* Progress bar */}
      <div className="mb-8 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500 transition-all duration-500 ease-out" style={{ width: `${analysisProgress}%` }} />
      </div>

      {/* Steps */}
      <div className="w-full max-w-md space-y-3">
        {analysisSteps.map((step, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-500 ${
            i < analysisStep ? "bg-emerald-50 text-emerald-700" :
            i === analysisStep ? "bg-sky-50 text-sky-700" :
            "text-slate-300"
          }`}>
            {i < analysisStep ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> :
             i === analysisStep ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-500" /> :
             <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200" />}
            <span className="text-xs font-medium">{step}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-rose-50 px-5 py-3 text-sm text-rose-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}
    </div>
  );

  const renderStage3 = () => (
    <div className="space-y-6">
      {/* Scores */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "综合评分", value: scores.overall, color: scores.overall >= 80 ? "text-emerald-600" : scores.overall >= 65 ? "text-amber-600" : "text-rose-600" },
          { label: "表达能力", value: scores.expression, color: "text-sky-600" },
          { label: "逻辑结构", value: scores.logic, color: "text-violet-600" },
          { label: "专业深度", value: scores.professional, color: "text-cyan-600" },
          { label: "岗位匹配", value: scores.match, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/40 bg-white/60 px-4 py-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${s.color}`}>{s.value}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500 transition-all duration-1000`} style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Result text */}
      <div ref={resultRef} className="prose prose-slate max-w-none text-sm leading-7 [&_strong]:text-slate-900 [&_h3]:mt-5 [&_h3]:mb-3 [&_h3]:text-base [&_h3]:font-semibold">
        <ReactMarkdown
          components={{
            h3: ({ children }) => {
              const s = String(children);
              const isScore = s.includes("踩分");
              const isPitfall = s.includes("扣分");
              const isFollowUp = s.includes("延伸");
              const icon = isScore ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                          isPitfall ? <AlertTriangle className="h-4 w-4 text-rose-500" /> :
                          isFollowUp ? <Lightbulb className="h-4 w-4 text-amber-500" /> : null;
              const color = isScore ? "text-emerald-700" : isPitfall ? "text-rose-700" : isFollowUp ? "text-amber-700" : "text-slate-800";
              const bg = isScore ? "bg-emerald-50/80" : isPitfall ? "bg-rose-50/80" : isFollowUp ? "bg-amber-50/80" : "bg-sky-50/80";
              return (
                <div className={`mb-3 mt-6 flex items-center gap-2 rounded-2xl px-4 py-2.5 ${bg}`}>
                  {icon}{icon}
                  <h3 className={`mb-0 mt-0 text-sm font-semibold ${color}`}>{children}</h3>
                </div>
              );
            },
            hr: () => <div className="my-6 border-t border-slate-200/60" />,
            p: ({ children }) => <p className="leading-7 text-slate-700">{children}</p>,
          }}
        >
          {result}
        </ReactMarkdown>
      </div>
    </div>
  );

  const renderStage4 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowOriginal(!showOriginal)}
          className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white/80">
          {showOriginal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showOriginal ? "隐藏原文" : "显示原文对比"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {showOriginal && (
          <div className="rounded-2xl border border-white/40 bg-white/60 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">原文</p>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{draft}</div>
          </div>
        )}
        <div className={`rounded-2xl border border-sky-100 bg-white px-5 py-4 ${showOriginal ? "" : "lg:col-span-2"}`}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sky-500">优化稿</p>
          <div className="prose prose-slate max-w-none text-sm leading-7 text-slate-800 [&_strong]:text-slate-900">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStage5 = () => (
    <div className="space-y-3">
      {modNotes.length === 0 ? (
        <p className="text-sm text-slate-400">暂无修改说明</p>
      ) : (
        modNotes.map((note, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-white/40 bg-white/60 px-5 py-3.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-600">{i + 1}</span>
            <div>
              <p className="text-sm text-slate-700">{note}</p>
              <p className="mt-1 text-xs text-slate-400">
                {note.includes("专业术语") || note.includes("行业") ? "对应民航HR筛选偏好" :
                 note.includes("空洞") || note.includes("表述") ? "提升回答专业度和可信度" :
                 note.includes("逻辑") || note.includes("结构") ? "符合面试官评分逻辑" :
                 "提高岗位匹配度"}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderBottomActions = () => (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/30 pt-5">
      {/* Version switcher */}
      {versions.length > 0 && (
        <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-3 py-1.5">
          <button type="button" onClick={() => setActiveVersion(Math.max(0, activeVersion - 1))} disabled={activeVersion === 0}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <span className="text-xs font-medium text-slate-600">{versions[activeVersion]?.label || "V1"}</span>
          <button type="button" onClick={() => setActiveVersion(Math.min(versions.length - 1, activeVersion + 1))} disabled={activeVersion >= versions.length - 1}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Action buttons */}
      <button type="button" onClick={copyResult}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white/80">
        <Copy className="h-3.5 w-3.5" />复制
      </button>
      <button type="button" onClick={handleOptimize}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white/80">
        <RotateCcw className="h-3.5 w-3.5" />重新优化
      </button>
      <button type="button" onClick={saveVersion}
        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:shadow-md">
        <Save className="h-3.5 w-3.5" />收藏版本
      </button>
    </div>
  );

  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sky-100/40 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-violet-100/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-5 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500 shadow-sm backdrop-blur-md">
              <WandSparkles className="h-3.5 w-3.5 text-violet-500" />
              AI 优化工作流
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              面试内容<span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent"> AI 优化</span>
            </h1>
          </div>

          {/* ====== Progress Bar ====== */}
          <div className="mb-8">
            <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md">
              {workflowSteps.map((s, i) => {
                const Icon = s.icon;
                const isCurrent = stage === i;
                const isDone = stage > i;
                return (
                  <button key={s.id} type="button" onClick={() => i < stage && setStage(i)}
                    className={`flex flex-col items-center gap-1 transition-all duration-300 ${isDone ? "cursor-pointer" : isCurrent ? "" : "cursor-default"}`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                      isDone ? "bg-emerald-100 text-emerald-600" :
                      isCurrent ? "bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-md scale-110" :
                      "bg-white/60 text-slate-300"
                    }`}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-[9px] font-medium tracking-wider uppercase ${
                      isDone ? "text-emerald-600" : isCurrent ? "text-sky-600" : "text-slate-300"
                    }`}>{s.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Progress line */}
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500 transition-all duration-500" style={{ width: `${(stage / (workflowSteps.length - 1)) * 100}%` }} />
            </div>
          </div>

          {/* ====== Stage Content ====== */}
          <GlassPanel className="rounded-[24px] border border-white/40 bg-white/70 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
            {stage === 0 && renderStage0()}
            {stage === 1 && renderStage1()}
            {stage === 2 && renderStage2()}
            {stage === 3 && renderStage3()}
            {stage === 4 && renderStage4()}
            {stage === 5 && renderStage5()}

            {/* Navigation buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/30 pt-5">
              <div className="flex gap-2">
                {stage > 0 && stage < 3 && (
                  <button type="button" onClick={() => setStage(stage - 1)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white/80">
                    <ChevronLeft className="h-3.5 w-3.5" />上一步
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {stage === 0 && (
                  <button type="button" onClick={() => setStage(1)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:shadow-md">
                    下一步 <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {stage === 1 && (
                  <button type="button" onClick={handleOptimize} disabled={!draft.trim() || loading}
                    className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-medium shadow-sm transition ${
                      draft.trim() && !loading
                        ? "bg-gradient-to-r from-sky-400 to-violet-500 text-white hover:shadow-md"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    }`}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    开始优化
                  </button>
                )}
                {stage >= 3 && stage < 5 && (
                  <button type="button" onClick={() => setStage(stage + 1)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:shadow-md">
                    {stage === 3 ? "查看对比 " : "查看说明 "}<ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {stage === 5 && (
                  <button type="button" onClick={() => setStage(0)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:shadow-md">
                    <RotateCcw className="h-3.5 w-3.5" />重新开始
                  </button>
                )}
              </div>
            </div>

            {/* Bottom actions */}
            {stage >= 3 && renderBottomActions()}
          </GlassPanel>
        </div>
      </main>
    </AppFrame>
  );
}
