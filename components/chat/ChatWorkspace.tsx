"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, WandSparkles, Loader2 } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassButton, GlassPanel } from "@/components/ui/glass";

const contentTypes = ["自我介绍", "面试回答", "STAR案例", "岗位认知", "职业规划"];
const recruitTypes = ["校招", "社招"];

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
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/44 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
              <WandSparkles className="h-4 w-4 text-violet-500" />
              AI 优化
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
              面试内容 AI 优化
            </h1>
            <p className="mt-3 text-base text-slate-500">
              输入你的原始内容，AI 按照民航面试三层深度逻辑优化，补充行业专业细节
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Left: Input */}
            <div className="space-y-5">
              {/* Content type */}
              <GlassPanel className="px-5 py-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">内容类型</p>
                <div className="flex flex-wrap gap-2">
                  {contentTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContentType(t)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                        contentType === t
                          ? "bg-sky-100 text-sky-700 shadow-sm"
                          : "bg-white/60 text-slate-500 hover:bg-white/80"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </GlassPanel>

              {/* Position + Recruit Type */}
              <GlassPanel className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">目标岗位</p>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-300"
                  >
                    {positionOptions.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">招聘方式</p>
                  <div className="flex gap-2">
                    {recruitTypes.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRecruitType(r)}
                        className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                          recruitType === r
                            ? r === "校招"
                              ? "bg-violet-100 text-violet-700 shadow-sm"
                              : "bg-amber-100 text-amber-700 shadow-sm"
                            : "bg-white/60 text-slate-500 hover:bg-white/80"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassPanel>

              {/* Draft input */}
              <GlassPanel className="px-5 py-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  输入你的原始内容
                </p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={10}
                  placeholder={`粘贴你的${contentType}原始稿……`}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300"
                />

                <div className="mt-4 flex items-center gap-3">
                  <GlassButton type="button" onClick={handleOptimize} disabled={loading || !draft.trim()}>
                    {loading ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />优化中...</>
                    ) : (
                      <><Sparkles className="mr-1.5 h-4 w-4" />AI 优化</>
                    )}
                  </GlassButton>
                  {draft && (
                    <button
                      type="button"
                      onClick={() => { setDraft(""); setResult(""); setError(""); }}
                      className="rounded-full bg-white/60 px-4 py-2 text-xs text-slate-500 hover:bg-white/80"
                    >
                      清空
                    </button>
                  )}
                </div>

                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
              </GlassPanel>
            </div>

            {/* Right: Result */}
            <div>
              <GlassPanel className={`min-h-[400px] px-6 py-5 ${!result && !loading ? "flex items-center justify-center" : ""}`}>
                {loading ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    <p className="text-sm text-slate-500">正在优化内容，请稍候...</p>
                  </div>
                ) : result ? (
                  <div className="prose prose-slate max-w-none text-sm leading-7 [&_strong]:text-slate-900">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center">
                    <WandSparkles className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-400">左侧输入内容后点击优化，结果将显示在这里</p>
                  </div>
                )}
              </GlassPanel>
            </div>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
