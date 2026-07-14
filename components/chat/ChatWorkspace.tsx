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

    const userPrompt = mode === "简历专项优化"
      ? `目标岗位：${positionLabel}
招聘方式：${recruitType}

请按照简历优化规则，优化以下简历：
${draft.trim()}`
      : `内容类型：${contentType}
目标岗位：${positionLabel}
招聘方式：${recruitType}

请按照优化规则帮我优化以上内容：

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
