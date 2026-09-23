// ============================================================
// AI 优化（简历 / 面试回答深度诊断）的提示词
// 单独放在 lib 里，方便被路由复用与单独测量 prompt 体量
// ============================================================

export type OptimizePromptInput = {
  kind: "resume" | "interview";
  positionLabel: string;
  recruitType: string;
  answerType: string;
  content: string;
};

const RESUME_DIMENSIONS = "结构完整性、量化成果、岗位匹配度、专业关键词、HR 阅读体验";
const INTERVIEW_DIMENSIONS = "逻辑结构、岗位匹配度、专业与安全素养、表达感染力、案例支撑度";

export function buildOptimizePrompt(input: OptimizePromptInput): string {
  const isResume = input.kind === "resume";
  const dimensions = isResume ? RESUME_DIMENSIONS : INTERVIEW_DIMENSIONS;

  return `你是一名从业 15 年以上的民航招聘面试官兼职业教练（带过乘务、飞行、机务、签派、空管等岗位的校招与社招）。
请对下面这份「${isResume ? "简历" : "面试回答"}」做一次可直接用于实战的深度诊断，而不是泛泛而谈。

【基本信息】
- 内容类型：${isResume ? "简历" : input.answerType}
- 目标岗位：${input.positionLabel}
- 招聘方式：${input.recruitType}

【待诊断原文】
${input.content}

【分析要求】
1. 所有评价必须引用原文中的具体内容（可截取原句），禁止"表达不错""继续努力"这类空话。
2. 站在真实航司面试官视角判断：这份内容会不会被扣分、为什么、怎么改。
3. 简历模式重点关注：经历是否量化、岗位关键词是否覆盖、结构是否清晰、民航相关度；面试回答模式重点关注：逻辑层次、STAR 完整度、安全意识与服务意识、是否有空话套话、能否被追问。
4. 评分要严格、有区分度（不能被夸成 90+）：结合上述维度给出真实分数。
5. 逐句改写至少 3 条，必须给出可直接替换的句子。
6. 追问预测要像真实面试官会问的追问，并给出应答要点。

【评分维度】${dimensions}

只返回 JSON（不要 Markdown、不要解释），结构如下：
{
  "score": 0-100 的整数综合分,
  "level": "优秀|较强|中等|待提升",
  "summary": "一句话总评，30 字以内，点出最大优势和最大问题",
  "dimensions": [{ "name": "维度名", "score": 0-100 的整数, "comment": "40 字内的具体评价" }],
  "highlights": ["2-3 条可保留的亮点，引用原文"],
  "risks": [{ "issue": "扣分点", "why": "为什么会被扣分", "fix": "具体怎么改" }],
  "rewrites": [{ "original": "原文中的原句", "problem": "问题所在", "improved": "改写后的句子" }],
  "followups": [{ "question": "面试官可能追问的问题", "answerTip": "应答要点" }],
  "keywords": { "hit": ["原文已覆盖的岗位关键词"], "missing": ["建议补充的岗位关键词"] },
  "optimized": "完整的优化版本（保留用户真实经历，不编造事实；直接可用）"
}`;
}
