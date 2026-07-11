"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, WandSparkles, Loader2, FileText, Target, Briefcase, GraduationCap, ArrowRight, RotateCcw, CheckCircle2, AlertTriangle, Lightbulb, MessageSquare } from "lucide-react";
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

export default function ChatWorkspace() {
  const [contentType, setContentType] = useState("自我介绍");
  const [position, setPosition] = useState("pilot");
  const [recruitType, setRecruitType] = useState("校招");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentType = contentTypes.find((t) => t.id === contentType);

  const handleOptimize = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult("");

    const positionLabel = positionOptions.find((p) => p.value === position)?.label || position;

    const systemPrompt = `你是民航AI面试题库研发专家，精通国内航司校招&社招面试标准。你的任务是根据用户的原始内容进行专业优化，输出深度、落地、有行业实操逻辑的版本。

优化规则：
1. 保留用户原创核心经历和真实经验，不编造虚假故事；
2. 按照三层深度逻辑重构内容：表层表态→中层民航规章/实操依据→底层复盘反思/长期规划；
3. 补充对应岗位的民航专业细节（法规、流程、场景）；
4. 消除空洞话术（吃苦耐劳、善于沟通等无支撑词汇）；
5. 输出格式必须包含以下四个段落（用 === 分隔）：

=== 优化版本 ===
（按照三层逻辑优化后的完整回答）

=== 踩分关键点 ===
（列出2-3个面试官最看重的得分细节）

=== 扣分雷区 ===
（列出2-3个本题常见的扣分行为）

=== 延伸追问 ===
（列出2道考官可能追问的问题 + 深度作答思路）`;

    const userPrompt = `内容类型：${contentType}
目标岗位：${positionLabel}
招聘方式：${recruitType}

我的原始内容：
${draft.trim()}

请按照优化规则帮我优化以上内容。`;

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
      setResult(payload?.assistant || "未能生成优化结果，请重试");
    } catch (e) {
      setError(e instanceof Error ? e.message : "优化请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        {/* Decorative blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sky-100/40 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-violet-100/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-5 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500 shadow-sm backdrop-blur-md">
              <WandSparkles className="h-3.5 w-3.5 text-violet-500" />
              AI 优化
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
              面试内容<span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent"> AI 优化</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
              输入你的原始内容，AI 按照民航面试三层深度逻辑优化，补充行业专业细节，让回答更有竞争力
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ====== Left: Input ====== */}
            <div className="space-y-5">
              {/* Content type selector */}
              <GlassPanel className="overflow-hidden rounded-[24px] border border-white/40 bg-white/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <FileText className="h-3.5 w-3.5" />
                  内容类型
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {contentTypes.map((t) => {
                    const Icon = t.icon;
                    const isActive = contentType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setContentType(t.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-3 text-center text-xs transition-all ${
                          isActive
                            ? "bg-gradient-to-b from-sky-50 to-sky-100/80 text-sky-700 shadow-sm ring-1 ring-sky-200/50"
                            : "bg-white/50 text-slate-500 hover:bg-white/70 hover:text-slate-700"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? "text-sky-500" : "text-slate-400"}`} />
                        <span className="font-medium">{t.id}</span>
                        {isActive && <span className="mt-0.5 text-[9px] text-sky-400">{t.desc}</span>}
                      </button>
                    );
                  })}
                </div>
              </GlassPanel>

              {/* Position + Recruit */}
              <GlassPanel className="rounded-[24px] border border-white/40 bg-white/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <Target className="h-3.5 w-3.5" />
                      目标岗位
                    </div>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100/50"
                    >
                      {positionOptions.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <Briefcase className="h-3.5 w-3.5" />
                      招聘方式
                    </div>
                    <div className="flex gap-2">
                      {["校招", "社招"].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRecruitType(r)}
                          className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-medium transition-all ${
                            recruitType === r
                              ? r === "校招"
                                ? "bg-gradient-to-b from-violet-50 to-violet-100/80 text-violet-700 shadow-sm ring-1 ring-violet-200/50"
                                : "bg-gradient-to-b from-amber-50 to-amber-100/80 text-amber-700 shadow-sm ring-1 ring-amber-200/50"
                              : "bg-white/60 text-slate-500 hover:bg-white/80"
                          }`}
                        >
                          {r === "校招" ? <GraduationCap className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassPanel>

              {/* Draft input */}
              <GlassPanel className="rounded-[24px] border border-white/40 bg-white/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <FileText className="h-3.5 w-3.5" />
                    输入原始内容
                  </div>
                  {draft && (
                    <button
                      type="button"
                      onClick={() => { setDraft(""); setResult(""); setError(""); }}
                      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-[10px] text-slate-500 hover:bg-white/80"
                    >
                      <RotateCcw className="h-3 w-3" />清空
                    </button>
                  )}
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={10}
                  placeholder={`将你的${contentType}原始稿粘贴在这里……`}
                  className="w-full resize-y rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-3.5 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100/50"
                />

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOptimize}
                    disabled={loading || !draft.trim()}
                    className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-medium text-white shadow-lg transition-all active:scale-[0.97] ${
                      loading || !draft.trim()
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-600 hover:to-violet-600 shadow-sky-200/50"
                    }`}
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />优化中...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" />AI 优化</>
                    )}
                  </button>
                  {draft && (
                    <span className="text-xs text-slate-400">
                      {draft.length} 字
                    </span>
                  )}
                </div>

                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
              </GlassPanel>
            </div>

            {/* ====== Right: Result ====== */}
            <div>
              <GlassPanel className={`overflow-hidden rounded-[24px] border border-white/40 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all ${
                result || loading ? "" : "min-h-[500px]"
              }`}>
                {/* Result header */}
                <div className="border-b border-white/30 px-6 py-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <WandSparkles className="h-3.5 w-3.5 text-violet-500" />
                    优化结果
                    {result && <span className="ml-auto text-[10px] font-normal text-slate-400">生成完毕</span>}
                  </div>
                </div>

                {/* Result body */}
                <div className="px-6 py-5">
                  {loading ? (
                    <div className="flex flex-col items-center gap-4 py-16">
                      <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                        <div className="absolute inset-0 animate-pulse rounded-full bg-sky-200/30 blur-xl" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">正在优化内容</p>
                        <p className="mt-1 text-xs text-slate-400">AI 正在分析并重构你的回答...</p>
                      </div>
                    </div>
                  ) : result ? (
                    <div className="prose prose-slate max-w-none text-sm leading-7 [&_strong]:text-slate-900 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold">
                      <ReactMarkdown
                        components={{
                          h3: ({ children }) => {
                            const isScore = String(children).includes("踩分");
                            const isPitfall = String(children).includes("扣分");
                            const isFollowUp = String(children).includes("延伸");
                            const icon = isScore ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                                        isPitfall ? <AlertTriangle className="h-4 w-4 text-rose-500" /> :
                                        isFollowUp ? <Lightbulb className="h-4 w-4 text-amber-500" /> : null;
                            const color = isScore ? "text-emerald-700" :
                                        isPitfall ? "text-rose-700" :
                                        isFollowUp ? "text-amber-700" : "text-slate-800";
                            return (
                              <div className={`mb-3 mt-6 flex items-center gap-2 rounded-2xl px-4 py-2.5 ${
                                isScore ? "bg-emerald-50/80" :
                                isPitfall ? "bg-rose-50/80" :
                                isFollowUp ? "bg-amber-50/80" : "bg-sky-50/80"
                              }`}>
                                {icon && icon}
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
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-sky-50 to-violet-50 shadow-inner">
                        <WandSparkles className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">等待优化</p>
                      <p className="mt-2 max-w-xs text-center text-xs text-slate-400">
                        左侧输入内容，选择好岗位和招聘方式后点击「AI 优化」按钮
                      </p>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
