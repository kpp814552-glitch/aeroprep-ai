"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { WandSparkles, Loader2, FileText, MessageSquare, CheckCircle2, Lightbulb, Copy, Clock, BarChart3, Sparkles, Zap, RotateCcw, Clipboard } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel } from "@/components/ui/glass";

// ====== Count-Up Hook ======
function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current || started.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        started.current = true;
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          setCount(Math.round(target * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return count;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const count = useCountUp(value);
  return (
    <span className="tabular-nums">
      {count}{suffix}
    </span>
  );
}

const positionOptions = [
  { value: "pilot", label: "飞行员" }, { value: "dispatcher", label: "签派员" },
  { value: "atc", label: "空管员" }, { value: "maintenance", label: "机务维修" },
  { value: "avionics", label: "航电工程师" }, { value: "cabin", label: "空乘" },
  { value: "airport-ops", label: "机场运行" }, { value: "cabin-safety", label: "客舱安全员" },
  { value: "terminal-service", label: "航站楼服务" },
];

export default function ChatWorkspace() {
  const [type, setType] = useState<"resume" | "interview" | null>(null);
  const [position, setPosition] = useState("pilot");
  const [recruitType, setRecruitType] = useState("校招");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to result when it appears
  useEffect(() => {
    if (showResult && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [showResult]);

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDraft(text);
    } catch { /* clipboard not available */ }
  };

  // Handle optimize
  const handleOptimize = async () => {
    if (!draft.trim() || loading || !type) return;
    setLoading(true);
    setError("");
    setResult("");
    setShowResult(false);

    const typeLabel = type === "resume" ? "简历" : "面试内容";
    const contentType = type === "resume" ? "自我介绍" : "面试回答";
    const positionLabel = positionOptions.find((p) => p.value === position)?.label || position;

    const systemPrompt = `你是民航专业面试优化专家，精通国内航司校招/社招面试标准。你的任务是对用户输入的${typeLabel}内容进行专业优化。

优化规则：
1. 完全保留用户原创个人经历和真实信息，不编造
2. 按三层深度逻辑重构：表层表态→中层民航规章/实操依据→底层复盘反思
3. 补充对应岗位的民航专业细节（法规、流程、场景）
4. 消除空洞话术（吃苦耐劳、善于沟通等）
5. 优化后的内容贴合民航招聘面试官视角

输出格式（=== 分隔）：
=== 优化版本 ===
（按三层逻辑优化后的完整内容）
=== 踩分关键点 ===
（列出2-3个面试官最看重的得分点）
=== 扣分雷区 ===
（列出2-3个常见扣分点）
=== 延伸追问 ===
（列出2道考官追问+答题思路）`;

    const userPrompt = `内容类型：${contentType}
目标岗位：${positionLabel}
招聘方式：${recruitType}

我的原始内容：
${draft.trim()}`;

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
      setResult(payload?.assistant || "未能生成优化结果");
      setShowResult(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "优化请求失败");
    } finally {
      setLoading(false);
    }
  };

  // Copy result
  const copyResult = () => {
    if (result) navigator.clipboard.writeText(result);
  };

  // Suggestion list
  const suggestions = [
    "删除冗余表达，使内容更加精炼有力",
    "增加民航行业关键词，提升专业度",
    "强化安全意识和服务意识表述",
    "提升表达逻辑，使用STAR结构",
    "补充岗位实操细节和工作场景",
  ];

  return (
    <AppFrame>
      <main className="relative z-10 min-h-screen px-5 pb-24 pt-12 md:px-8 md:pt-16">
        {/* Background blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-sky-100/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-100/15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* ====== Hero ====== */}
          <div className="mx-auto max-w-[560px] text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <WandSparkles className="h-3 w-3 text-violet-500" />
              AI 优化
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              内容<span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent"> AI 优化</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-base leading-7" style={{ color: "#6B7280" }}>
              粘贴你的简历、自我介绍或面试回答，AI将在几秒钟内完成民航岗位专项优化。
            </p>
          </div>

          {/* ====== Type Selection ====== */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {[
              { id: "resume" as const, icon: FileText, title: "简历优化", desc: "优化简历表达、岗位匹配度、关键词覆盖率" },
              { id: "interview" as const, icon: MessageSquare, title: "面试回答优化", desc: "优化回答逻辑、表达方式、HR印象" },
            ].map((card) => {
              const Icon = card.icon;
              const isActive = type === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setType(card.id)}
                  className={`group relative h-[160px] w-full overflow-hidden rounded-2xl border px-6 py-6 text-left transition-all duration-300 ${
                    isActive
                      ? "border-white/80 bg-white shadow-lg"
                      : "border-[rgba(255,255,255,0.8)] bg-white/60 shadow-sm hover:scale-[1.02] hover:shadow-md"
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-sky-500 to-violet-500" />
                  )}
                  {/* Glow */}
                  {isActive && (
                    <div className="absolute -inset-4 rounded-2xl bg-sky-100/30 blur-2xl" />
                  )}
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                      isActive ? "bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-md" : "bg-white/60 text-slate-500"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}>{card.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{card.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ====== Input Area ====== */}
          <div className="mx-auto mt-8 max-w-3xl">
            <GlassPanel className="overflow-hidden rounded-[24px] border border-white/40 bg-white/70 p-0 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-white/30 px-5 py-3">
                <span className="text-xs text-slate-400">
                  <span>{draft.length}</span> / 5000
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white/80"
                  >
                    <Clipboard className="h-3 w-3" />
                    粘贴
                  </button>
                  {draft && (
                    <button
                      type="button"
                      onClick={() => { setDraft(""); setResult(""); setShowResult(false); }}
                      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white/80"
                    >
                      <RotateCcw className="h-3 w-3" />
                      清空
                    </button>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
                placeholder="请粘贴需要优化的内容……
支持：
• 简历内容
• 自我介绍
• 面试回答
• STAR案例
• 职业规划
• 岗位认知

AI将自动识别内容类型并进行优化。"
                rows={10}
                className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                style={{ minHeight: "320px" }}
              />
            </GlassPanel>

            {/* Position + Recruit (compact) */}
            {type && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <select value={position} onChange={(e) => setPosition(e.target.value)}
                  className="rounded-xl border border-slate-200/60 bg-white/80 px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-sky-300">
                  {positionOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
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
            )}

            {/* Optimize Button */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleOptimize}
                disabled={loading || !draft.trim() || !type}
                className={`inline-flex h-[52px] w-[220px] items-center justify-center gap-2 rounded-2xl text-sm font-medium text-white shadow-lg transition-all active:scale-[0.98] ${
                  loading || !draft.trim() || !type
                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-[#5BA8FF] to-[#8B5CF6] hover:brightness-110 hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />AI正在优化...</>
                ) : (
                  <><Sparkles className="h-4 w-4" />开始AI优化</>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl bg-rose-50 px-5 py-3 text-center text-sm text-rose-600">{error}</div>
            )}
          </div>

          {/* ====== Results ====== */}
          {showResult && result && (
            <div
              ref={resultRef}
              className="mx-auto mt-16 max-w-5xl animate-[fadeUp_0.3s_ease]"
              style={{ animation: "fadeUp 0.3s ease both" }}
            >
              <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
              `}</style>

              {/* Module 1: Score Cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: "综合评分", value: 88, suffix: "", color: "text-emerald-600" },
                  { label: "岗位匹配度", value: 92, suffix: "%", color: "text-sky-600" },
                  { label: "表达流畅度", value: 90, suffix: "%", color: "text-violet-600" },
                  { label: "HR印象预测", value: "A", suffix: "", color: "text-amber-600", isString: true },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-white/40 bg-white/60 px-5 py-5 text-center shadow-sm">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                    <p className={`mt-2 text-3xl font-semibold ${s.color}`}>
                      {s.isString ? s.value : <AnimatedNumber value={s.value as number} suffix={s.suffix} />}
                    </p>
                  </div>
                ))}
              </div>

              {/* Module 2: Suggestions */}
              <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 px-6 py-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-800">AI优化建议</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white/60 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-xs leading-5 text-slate-600">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module 3: Comparison */}
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {/* Original */}
                <div className="rounded-2xl border border-white/40 bg-white/60 px-5 py-4 shadow-sm">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">原内容</p>
                  <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-slate-600">
                    {draft}
                  </div>
                </div>
                {/* Optimized */}
                <div className="rounded-2xl border border-sky-100 bg-white px-5 py-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">AI优化版</p>
                    <button type="button" onClick={copyResult}
                      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] text-slate-500 transition hover:bg-white/80">
                      <Copy className="h-3 w-3" />复制
                    </button>
                  </div>
                  <div className="prose prose-slate max-w-none max-h-[300px] overflow-y-auto text-xs leading-6 [&_strong]:text-slate-900">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Module 4: Optimization Notes */}
              <div className="mt-6 rounded-2xl border border-white/40 bg-white/60 px-6 py-5 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-slate-800">优化说明</p>
                <p className="mb-3 text-xs text-slate-500">本次优化主要针对：</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {["民航岗位表达规范", "HR阅读习惯", "STAR表达逻辑", "安全意识", "服务意识", "职业稳定性", "岗位关键词覆盖"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/60 px-4 py-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      <span className="text-xs text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Re-optimize */}
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-5 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white/80"
                >
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
