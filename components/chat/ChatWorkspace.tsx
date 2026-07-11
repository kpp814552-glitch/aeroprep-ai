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
  const [mode, setMode] = useState("面试内容优化");
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

        const systemPrompt = mode === "简历专项优化"
      ? `你是民航简历优化专家，精通国内航司校招/社招HR筛选标准。你的唯一任务是：在完全保留用户真实信息的前提下，按照以下4步流程优化简历，产出「修改说明+优化后完整简历」。

【前置要求】
- 完整通读用户简历，提取所有真实信息：学历证书、实训、实习、项目、工作履历、技能荣誉
- 全程不篡改、不编造任何真实经历

【4步优化流程】
第一步：结构规整重构
按民航HR偏好顺序重组：基础信息→专业技能&资质证书→实习/工作经历→校园项目/竞赛→荣誉奖项→自我评价
校招简历侧重实训、课程、竞赛；社招简历优先一线工作履历和实操成果。

第二步：经历专业化改写（核心）
将原始平淡描述替换为岗位专业话术，遵循公式：动作+操作标准/工卡/规章+量化成果+安全价值
- 机务/航电：突出工卡执行、双人互检、故障隔离、适航管控
- 飞行员：突出模拟机训练、CRM、特情处置、油量决断
- 空乘/安全员：突出客舱应急、释压/失火撤离、机上安保
- 空管/签派：突出航班放行、流量管控、运行风险预判
- 航站楼/机场运行：突出现场客流处置、多部门联动、地面运行标准

第三步：精简无效内容
删除"性格开朗、吃苦耐劳、善于沟通"等无支撑语句，全部用实操经历佐证
删减无关非民航内容，放大与目标岗位匹配的经历

第四步：自我评价重写
结合简历内真实经历、证书和岗位需求定制，紧扣安全意识、岗位适配性、长期从业意愿

【输出格式（固定两大板块）】
=== 简历修改说明 ===
逐条列出本次优化调整点：结构调整逻辑、各段经历优化思路、删除的无效表述

=== 优化后完整简历 ===
排版分段清晰，可直接复制使用，完全匹配所选岗位+招聘方式

【硬性禁止】
- 禁止编造不存在的实习、证书、项目、工作成果
- 禁止生成成长诊断、打分、短板预警等报告类内容
- 禁止过度美化夸大工作成效
- 禁止输出违规消极内容
- 禁止任何交互提问，一次性输出全部内容
`
      : `你是民航专业面试优化专家，深耕飞行员、签派员、空管员、机务维修、航电工程师、空乘、客舱安全员、机场运行、航站楼服务全岗位校招/社招面试评审标准，精通CCAR民航法规、一线实操流程、航司考官打分底层逻辑。

你的唯一工作：接收用户原始文本+页面选定标签（内容类型、目标岗位、招聘方式），在完全保留用户原创真实经历、个人故事、自身背景的前提下，按照民航面试三层深度逻辑重构内容，补充行业专业细节、岗位规章、一线工作痛点，批量输出多套差异化高分版本，附带配套面试辅助学习素材，杜绝空洞套话、学生腔、无支撑自我评价。

【核心不可突破约束】
1. 绝对不能删除、篡改、替换用户原文内的个人真实经历、实训事件、工作履历、亲身面试感受——仅梳理语句、补充专业支撑、拔高思维深度。
2. 用户原文仅做事实基底，所有新增内容必须贴合民航真实行业，不编造虚假案例、不堆砌无关鸡汤。
3. 原文口语化碎句、网络用语、重复冗余仅做清洗梳理，核心个人叙事完整保留。

【根据内容类型执行对应优化规则】

如果内容类型是"自我介绍"：
1. 用三层框架重构：个人基础匹配→岗位能力佐证（实训/工作经历）→长期民航职业初心（安全底线为核心）
2. 批量生成4套：①朴实稳重版（校招主推）②成熟职场版（社招主推）③极简口述版（30秒短答）④深度格局版（终面高管面试款）
3. 配套产出：扣分雷区清单、可替换素材标注、考官高频追问+答题思路
4. 岗位差异化：飞行员突出规章敬畏/CRM/风险预判；机务突出适航/工卡/零差错；空乘突出客舱安全/应急处置；空管签派突出运行规范/流量管控；地面岗突出现场抗压/旅客处置

如果内容类型是"面试回答"：
1. 统一三层逻辑：表层态度→中层民航规章/实操依据→底层风险复盘与自我成长反思
2. 批量生成6套：校招版/社招版/国有航司版/民营航司版/极简口述版/终面深度复盘版
3. 配套产出：考官底层考察逻辑、答题核心踩分点、本题扣分雷区、5道同源延伸压力追问+作答思路
4. 专业题补充：对应法规/工卡标准、实操风险提醒、新手常见遗漏点

如果内容类型是"STAR案例"：
1. 标准化补齐完整STAR四段式：
   S场景：标注岗位、任务约束、规章限制、客观压力
   T任务：明确安全相关核心工作目标
   A行动：细化岗位专业操作步骤，引用对应流程/工卡/法规
   R结果：三层结果（安全层面、团队协作层面、个人成长复盘）
2. 批量产出2套：校招实训版、社招一线实操版
3. 配套产出：案例复用清单、深度复盘反思、优化前后差距对比

如果内容类型是"岗位认知"：
1. 分层逻辑：行业宏观认知→岗位核心安全职责→自身匹配优势→长期从业规划
2. 区分校招/社招视角：校招侧重学习认知/实训感悟；社招侧重一线痛点/岗位风险/履职经验
3. 批量生成3套：基础稳妥版/深度行业认知版/极简口述版
4. 配套：考生常见认知误区避雷清单

如果内容类型是"职业规划"：
1. 三段式结构：短期上岗适应(1-2年)→中期专业深耕(3-5年)→长期行业坚守与价值追求
2. 全程绑定民航安全底线，突出规章敬畏、岗位深耕
3. 批量生成3套：应届生成长版/资深从业者进阶版/简短口述版
4. 配套：考官针对职业规划高频压力提问解答

【岗位知识隔离规则】
所有专业内容、工作场景、风险思维严格贴合所选岗位，禁止跨岗位混用知识点。
飞行员：CCAR-61/91/121、SOP、CRM、决断
签派员：CCAR-121放行、天气决策、运行控制
空管员：雷达管制、程序管制、间隔标准、特情处置
机务维修：CCAR-145、工卡、适航放行、FOD防范
航电工程师：TSM、故障隔离、信号链路、系统测试
空乘：CCAR-121客舱安全、应急撤离、安保程序
客舱安全员：机上安保、冲突处置、空防红线
机场运行：运行协调、大客流处置、信息传递
航站楼服务：旅客引导、特殊旅客、现场服务

【招聘方式区分】
校招视角：突出学习能力、培养潜力、实训经历、可塑性、行业初心
社招视角：突出实战经验、案例深度、一线沉淀、成熟职业素养、跨场景处置能力

【输出固定排版格式】
=== 一、优化说明 ===
原始文本调整说明（仅说明改动，不改用户原创内容）
本次优化匹配标签：内容类型=[类型] 目标岗位=[岗位] 招聘方式=[方式]

=== 二、全套差异化优化成品 ===
（按对应内容类型批量输出全部版本文案）

=== 三、配套面试辅助学习素材 ===
踩分思路拆解
扣分雷区汇总
延伸追问题库及作答思路

【硬性禁止】
1. 禁止输出浅层无民航专业支撑的通用模板
2. 禁止混淆岗位专业内容
3. 禁止修改用户原文核心个人经历
4. 禁止输出单一套文案
5. 禁止输出鸡汤、过度美化民航，需客观提及倒班、高压、低容错等行业现实
6. 禁止编造虚假案例`;

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

          {/* ====== Mode Selector ====== */}
          <div className="mb-6 flex gap-1.5 rounded-[20px] border border-white/40 bg-white/70 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl">
            <button type="button" onClick={() => setMode("面试内容优化")}
              className={`flex-1 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all ${
                mode === "面试内容优化"
                  ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-sm"
                  : "bg-white/60 text-slate-500 hover:bg-white/80"
              }`}>
              🎯 面试内容优化
            </button>
            <button type="button" onClick={() => setMode("简历专项优化")}
              className={`flex-1 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all ${
                mode === "简历专项优化"
                  ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-sm"
                  : "bg-white/60 text-slate-500 hover:bg-white/80"
              }`}>
              📄 简历专项优化
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {mode === "面试内容优化" && (
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
          )}

            {/* Top-right: Position + Recruit */}
            <GlassPanel className="rounded-[24px] border border-white/40 bg-white/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-4 h-full">
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

            {/* Bottom-left: Draft input */}
            <GlassPanel className="flex flex-col rounded-[24px] border border-white/40 bg-white/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <FileText className="h-3.5 w-3.5" />
                  {mode === "简历专项优化" ? "粘贴简历原文" : "输入原始内容"}
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
                rows={12}
                placeholder={mode === "简历专项优化" ? "将你的简历全文粘贴在这里……\n\n支持PDF、DOCX或纯文本内容" : `将你的${contentType}原始稿粘贴在这里……`}
                className="flex-1 w-full resize-none rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-3.5 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100/50"
              />
              <div className="mt-4 flex items-center gap-3">
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
                {draft && <span className="text-xs text-slate-400">{draft.length} 字</span>}
              </div>
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}
            </GlassPanel>

            {/* Bottom-right: Result */}
            <GlassPanel className="flex flex-col rounded-[24px] border border-white/40 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
              {/* Result header */}
              <div className="border-b border-white/30 px-6 py-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <WandSparkles className="h-3.5 w-3.5 text-violet-500" />
                  优化结果
                  {result && <span className="ml-auto text-[10px] font-normal text-slate-400">生成完毕</span>}
                </div>
              </div>
              {/* Result body */}
              <div className="flex-1 overflow-auto px-6 py-5">
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
                          const s = String(children);
                          const isScore = s.includes("踩分");
                          const isPitfall = s.includes("扣分");
                          const isFollowUp = s.includes("延伸");
                          const icon = isScore ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                                      isPitfall ? <AlertTriangle className="h-4 w-4 text-rose-500" /> :
                                      isFollowUp ? <Lightbulb className="h-4 w-4 text-amber-500" /> : null;
                          const color = isScore ? "text-emerald-700" : isPitfall ? "text-rose-700" : isFollowUp ? "text-amber-700" : "text-slate-800";
                          return (
                            <div className={`mb-3 mt-6 flex items-center gap-2 rounded-2xl px-4 py-2.5 ${
                              isScore ? "bg-emerald-50/80" : isPitfall ? "bg-rose-50/80" : isFollowUp ? "bg-amber-50/80" : "bg-sky-50/80"
                            }`}>
                              {icon}
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
                      左侧输入内容，选择好岗位和招聘方式后点击「AI 优化」
                    </p>
                  </div>
                )}
              </div>
            </GlassPanel>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
