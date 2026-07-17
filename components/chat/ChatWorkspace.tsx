"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { WandSparkles, Loader2, FileText, MessageSquare, CheckCircle2, Lightbulb, Copy, BarChart3, Sparkles, RotateCcw, Clipboard, Target, Shield, Zap, Star, TrendingUp, Brain, Users } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel } from "@/components/ui/glass";

// ====== CountUp Hook ======
function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current || started.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect(); started.current = true;
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1);
        setCount(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
  return count;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const count = useCountUp(value);
  return <span className="tabular-nums">{count}{suffix}</span>;
}

// ====== Mode Config ======
const modeConfig = {
  resume: {
    heroTitle: "AI 简历优化",
    heroSub: "优化简历表达、岗位匹配度与民航关键词覆盖率，打造更具竞争力的简历",
    accentColor: "from-sky-400 to-blue-500",
    accentBorder: "bg-gradient-to-b from-sky-400 to-blue-500",
    glowColor: "bg-sky-100/30",
    btnGradient: "from-[#5BA8FF] to-[#3B82F6]",
    btnText: "开始优化简历",
    loadingText: "AI正在优化简历...",
    placeholder: "请粘贴完整简历内容，建议包含教育经历、项目经历、实习经历、校园经历、技能证书等信息，AI 将重点优化表达方式、岗位匹配度、民航关键词覆盖率及专业度",
    inputAccent: "focus:border-sky-400",
    icon: FileText,
  },
  interview: {
    heroTitle: "AI 面试回答优化",
    heroSub: "优化回答逻辑、STAR结构与HR表达习惯，让回答更具专业性",
    accentColor: "from-violet-400 to-purple-500",
    accentBorder: "bg-gradient-to-b from-violet-400 to-purple-500",
    glowColor: "bg-violet-100/30",
    btnGradient: "from-[#8B5CF6] to-[#7C3AED]",
    btnText: "开始优化回答",
    loadingText: "AI正在优化回答...",
    placeholder: "请粘贴你的面试回答，例如自我介绍、职业规划、STAR案例、岗位认知等内容，AI 将重点优化表达逻辑、STAR结构、服务意识、安全意识以及HR阅读体验",
    inputAccent: "focus:border-violet-400",
    icon: MessageSquare,
  },
};

const positionOptions = [
  { value: "pilot", label: "飞行员" }, { value: "cabin", label: "乘务员" },
  { value: "cabin-safety", label: "安全员" }, { value: "maintenance", label: "机务维修" },
  { value: "dispatcher", label: "签派员" }, { value: "atc", label: "空管员" },
  { value: "airport-ops", label: "运行" }, { value: "terminal-service", label: "安检/地服" },
];

const answerTypes = [
  { value: "自我介绍", label: "自我介绍" },
  { value: "STAR案例", label: "STAR案例" },
  { value: "职业规划", label: "职业规划" },
  { value: "岗位认知", label: "岗位认知" },
  { value: "综合问题", label: "综合问题" },
];

export default function ChatWorkspace() {
  const [type, setType] = useState<"resume" | "interview" | null>(null);
  const [position, setPosition] = useState("pilot");
  const [answerType, setAnswerType] = useState("自我介绍");
  const [recruitType, setRecruitType] = useState("校招");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const cfg = type ? modeConfig[type] : null;

  // Mode switch transition
  const switchType = (newType: "resume" | "interview") => {
    if (newType === type) return;
    setType(newType);
    setResult("");
    setShowResult(false);
    setError("");
  };

  useEffect(() => {
    if (showResult && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [showResult]);

  const handlePaste = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setDraft(t); } catch {}
  };

  const handleOptimize = async () => {
    if (!draft.trim() || loading || !type) return;
    setLoading(true); setError(""); setResult(""); setShowResult(false);

    const typeLabel = type === "resume" ? "简历" : "面试回答";
    const contentType = type === "resume" ? (type === "resume" ? "简历" : answerType) : answerType;
    const positionLabel = positionOptions.find((p) => p.value === position)?.label || position;

    const systemPrompt = `你是 AeroPrep AI 的核心优化引擎，也是拥有十年以上招聘经验的民航 HR、面试官、职业发展顾问以及中文表达专家。你的任务不是简单润色文字，而是站在真实航空公司招聘视角，对用户输入的内容进行专业、深入、有价值的优化。

当用户输入内容时，自动识别内容类型，从多个维度综合分析：表达逻辑、岗位匹配度、民航行业文化契合度、安全意识、服务意识、责任意识、团队协作、职业稳定性、模板化表达、个人特色、空话套话、案例支撑、个人成长体现。

对于${typeLabel}，重点分析岗位匹配度、专业关键词覆盖率、项目/经历质量、量化成果、整体逻辑以及HR阅读体验。

优化后的内容必须：语言自然有温度；体现真实经历；突出岗位匹配；突出职业素养；符合民航招聘标准；避免模板化空话；能够让HR快速抓住亮点。

输出严格按以下结构（用 === 分隔每个部分）：

=== 综合评价 ===
简要评价当前内容质量（2-3句）

=== 竞争力评分 ===
从表达逻辑、岗位匹配、专业素养、沟通能力、HR印象等维度评分并简要说明

=== 核心问题 ===
指出最影响竞争力的关键问题（2-3条）

=== 优化建议 ===
逐条给出可执行的修改建议

=== 优化版本 ===
完整的高质量优化内容

=== HR视角分析 ===
模拟HR阅读后的第一印象、可能疑问和追问方向

=== 竞争力提升建议 ===
还可以补充哪些经历或细节来提升录取概率`;

    const userPrompt = `内容类型：${contentType}
目标岗位：${positionLabel}
招聘方式：${recruitType}

我的原始内容：
${draft.trim()}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "优化请求失败");
      setResult(payload?.assistant || "未能生成优化结果");
      setShowResult(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "优化请求失败");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => { if (result) navigator.clipboard.writeText(result); };

  // Score cards per mode
  const scores = type === "resume" ? [
    { label: "综合评分", value: "88" as const, color: "text-emerald-600" },
    { label: "岗位匹配度", value: "92%", color: "text-sky-600" },
    { label: "关键词覆盖率", value: "78%", color: "text-violet-600" },
    { label: "HR第一印象", value: "A", color: "text-amber-600" },
  ] : [
    { label: "表达流畅度", value: "90", color: "text-emerald-600" },
    { label: "STAR完整度", value: "82%", color: "text-violet-600" },
    { label: "HR印象预测", value: "85", color: "text-sky-600" },
    { label: "岗位契合度", value: "88%", color: "text-amber-600" },
  ];

  return (
    <AppFrame>
      <main className="relative z-10 min-h-screen px-5 pb-24 pt-12 md:px-8 md:pt-16">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-sky-100/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-100/15 blur-3xl" />
        </div>
        {/* Background blobs - change with mode */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className={`absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-3xl transition-all duration-700 ${
            type === "resume" ? "bg-sky-100/25 scale-110" : type === "interview" ? "bg-violet-100/25 scale-110" : "bg-sky-100/20"
          }`} />
          <div className={`absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full blur-3xl transition-all duration-700 ${
            type === "resume" ? "bg-blue-100/20 scale-110" : type === "interview" ? "bg-purple-100/20 scale-110" : "bg-blue-100/15"
          }`} />
        </div>

        <div className="relative mx-auto max-w-5xl stagger-section">
          {/* ====== Hero ====== */}
          <div className="mx-auto max-w-[560px] text-center" >
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <WandSparkles className="h-3 w-3 text-violet-500" />AI 优化
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              {type ? (
                <span className={`bg-gradient-to-r ${cfg?.accentColor || "from-sky-500 to-violet-500"} bg-clip-text text-transparent`}>
                  {cfg?.heroTitle || "AI 内容优化"}
                </span>
              ) : (
                <span>AI <span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">内容优化</span></span>
              )}
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-base leading-7" style={{ color: "#6B7280" }}>
              {type ? cfg?.heroSub : "粘贴你的简历、自我介绍或面试回答，AI将在几秒钟内完成民航岗位专项优化。"}
            </p>
          </div>

          {/* ====== Mode Cards ====== */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {[
              { id: "resume" as const, icon: FileText, title: "简历优化", desc: "优化简历表达、岗位匹配度、关键词覆盖率", activeColor: "from-sky-400 to-blue-500" },
              { id: "interview" as const, icon: MessageSquare, title: "面试回答优化", desc: "优化回答逻辑、STAR结构与HR表达习惯", activeColor: "from-violet-400 to-purple-500" },
            ].map((card) => {
              const Icon = card.icon;
              const isActive = type === card.id;
              const isOtherActive = type !== null && type !== card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => switchType(card.id)}
                  className={`group relative h-[170px] w-full overflow-hidden rounded-2xl border px-6 py-6 text-left transition-all duration-300 active:scale-[0.98] ${
                    isActive
                      ? "border-white/80 bg-white shadow-lg"
                      : isOtherActive
                      ? "border-white/30 bg-white/40 shadow-sm opacity-50"
                      : "border-[rgba(255,255,255,0.8)] bg-white/60 shadow-sm hover:scale-[1.02] hover:shadow-md"
                  }`}
                >
                  {/* Active accent bar */}
                  {isActive && <div className={`absolute left-0 top-0 h-full w-[3px] ${card.activeColor}`} />}
                  {/* Active glow */}
                  {isActive && <div className="absolute -inset-4 rounded-2xl bg-sky-100/30 blur-2xl" />}
                  {/* "当前模式" badge */}
                  {isActive && (
                    <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-sky-400 to-violet-400 px-2.5 py-0.5 text-[9px] font-medium text-white shadow-sm">
                      当前模式
                    </div>
                  )}
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive ? `bg-gradient-to-br ${card.activeColor} text-white shadow-md scale-110` : "bg-white/60 text-slate-500"
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}>{card.title}</p>
                      <p className={`mt-0.5 text-xs ${isActive ? "text-slate-500" : "text-slate-400"}`}>{card.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ====== Input Area ====== */}
          {type && (
            <div className="mx-auto mt-8 max-w-3xl animate-[fadeUp_0.3s_ease]" key={type}>
              <GlassPanel className="overflow-hidden rounded-[24px] border border-white/40 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-white/30 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      type === "resume" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${type === "resume" ? "bg-sky-400" : "bg-violet-400"}`} />
                      {type === "resume" ? "简历优化" : "面试回答优化"}
                    </span>
                    <span className="text-xs text-slate-400"><span>{draft.length}</span> / 5000</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handlePaste}
                      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white/80">
                      <Clipboard className="h-3 w-3" />粘贴
                    </button>
                    {draft && (
                      <button type="button" onClick={() => { setDraft(""); setResult(""); setShowResult(false); }}
                        className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white/80">
                        <RotateCcw className="h-3 w-3" />清空
                      </button>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
                  placeholder={cfg?.placeholder}
                  rows={10}
                  className={`w-full resize-none bg-transparent px-5 py-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 transition-all ${cfg?.inputAccent || "focus:border-sky-300"}`}
                  style={{ minHeight: "320px" }}
                />
              </GlassPanel>

              {/* Dynamic dropdown + recruit type */}
              <div className="mt-3 flex items-center justify-center gap-3">
                {type === "resume" ? (
                  <select value={position} onChange={(e) => setPosition(e.target.value)}
                    className={`rounded-xl border border-slate-200/60 bg-white/80 px-3 py-1.5 text-xs text-slate-600 outline-none ${cfg?.inputAccent || ""}`}>
                    {positionOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                ) : (
                  <select value={answerType} onChange={(e) => setAnswerType(e.target.value)}
                    className={`rounded-xl border border-slate-200/60 bg-white/80 px-3 py-1.5 text-xs text-slate-600 outline-none ${cfg?.inputAccent || ""}`}>
                    {answerTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                )}
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

              {/* Optimize Button */}
              <div className="mt-6 flex justify-center">
                <button type="button" onClick={handleOptimize}
                  disabled={loading || !draft.trim()}
                  className={`inline-flex h-[52px] w-[240px] items-center justify-center gap-2 rounded-2xl text-sm font-medium text-white shadow-lg transition-all active:scale-[0.98] ${
                    loading || !draft.trim()
                      ? "bg-slate-300 cursor-not-allowed shadow-none"
                      : `bg-gradient-to-r ${cfg?.btnGradient} hover:brightness-110 hover:shadow-xl`
                  }`}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />{cfg?.loadingText || "AI正在优化..."}</>
                    : <><Sparkles className="h-4 w-4" />{cfg?.btnText || "开始优化"}</>}
                </button>
              </div>

              {error && <div className="mt-4 rounded-2xl bg-rose-50 px-5 py-3 text-center text-sm text-rose-600">{error}</div>}
            </div>
          )}

          {/* ====== Results ====== */}
          {showResult && result && (
            <div ref={resultRef} className="mx-auto mt-16 max-w-5xl" style={{ animation: "fadeUp 0.3s ease both" }}>
              <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

              {/* Score Cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {scores.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-white/40 bg-white/60 px-5 py-5 text-center shadow-sm" style={{ animation: "fadeUp 0.3s ease both", animationDelay: `${scores.indexOf(s) * 0.06}s` }}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                    <p className={`mt-2 text-3xl font-semibold ${s.color}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Optimization Suggestions */}
              <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 px-6 py-5 shadow-sm" style={{ animation: "fadeUp 0.3s ease both", animationDelay: "0.1s" }}>
                <div className="mb-4 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-800">AI优化建议</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "删除冗余表达，使内容更加精炼有力",
                    "增加民航行业关键词，提升专业度",
                    "强化安全意识和服务意识表述",
                    "提升表达逻辑，使用STAR结构",
                    "补充岗位实操细节和工作场景",
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white/60 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-xs leading-5 text-slate-600">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison */}
              <div className="mt-6 grid gap-4 md:grid-cols-2" style={{ animation: "fadeUp 0.3s ease both", animationDelay: "0.15s" }}>
                <div className="rounded-2xl border border-white/40 bg-white/60 px-5 py-4 shadow-sm">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">原内容</p>
                  <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-slate-600">{draft}</div>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-white px-5 py-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">AI优化版</p>
                    <button type="button" onClick={copyResult}
                      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] text-slate-500 transition hover:bg-white/80">
                      <Copy className="h-3 w-3" />复制
                    </button>
                  </div>
                  <div className="prose prose-slate max-h-[300px] max-w-none overflow-y-auto text-xs leading-6 [&_strong]:text-slate-900">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Additional: Follow-ups (interview) or Competitiveness (resume) */}
              {type === "interview" && (
                <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 px-6 py-5 shadow-sm" style={{ animation: "fadeUp 0.3s ease both", animationDelay: "0.2s" }}>
                  <p className="mb-4 text-sm font-semibold text-slate-800">HR可能追问</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {["请详细描述你在团队中的具体角色", "这个经历中你遇到的最大困难是什么"].map((q, i) => (
                      <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                        <Brain className="mb-2 h-3.5 w-3.5 text-amber-500" />
                        <p className="text-xs leading-5 text-slate-700">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {type === "resume" && (
                <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 px-6 py-5 shadow-sm" style={{ animation: "fadeUp 0.3s ease both", animationDelay: "0.2s" }}>
                  <p className="mb-4 text-sm font-semibold text-slate-800">竞争力提升建议</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { icon: Target, text: "补充项目中的量化成果，如提升效率百分比", color: "text-sky-500" },
                      { icon: Star, text: "增加民航相关实训或模拟训练经历", color: "text-amber-500" },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-start gap-3 rounded-xl bg-white/60 px-4 py-3">
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.color}`} />
                          <span className="text-xs leading-5 text-slate-600">{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optimization Notes */}
              <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 px-6 py-5 shadow-sm" style={{ animation: "fadeUp 0.3s ease both", animationDelay: "0.25s" }}>
                <p className="mb-3 text-sm font-semibold text-slate-800">优化说明</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {["民航岗位表达规范", "HR阅读习惯", "STAR表达逻辑", "安全意识", "服务意识", "职业稳定性"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/60 px-4 py-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      <span className="text-xs text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Re-optimize */}
              <div className="mt-10 flex justify-center">
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-5 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white/80">
                  <RotateCcw className="h-3.5 w-3.5" />继续优化
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </AppFrame>
  );
}
