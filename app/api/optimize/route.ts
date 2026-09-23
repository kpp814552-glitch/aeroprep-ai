import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeekRaw } from "@/lib/interview/deepseek";

export type OptimizeDimension = { name: string; score: number; comment: string };
export type OptimizeRisk = { issue: string; why: string; fix: string };
export type OptimizeRewrite = { original: string; problem: string; improved: string };
export type OptimizeFollowup = { question: string; answerTip: string };

export type OptimizeAnalysis = {
  score: number;
  level: string;
  summary: string;
  dimensions: OptimizeDimension[];
  highlights: string[];
  risks: OptimizeRisk[];
  rewrites: OptimizeRewrite[];
  followups: OptimizeFollowup[];
  keywords: { hit: string[]; missing: string[] };
  optimized: string;
};

const MAX_CONTENT = 5000;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function strList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => str(v)).filter(Boolean).slice(0, limit);
}

function clampScore(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** 把模型返回的任意结构收敛成固定格式，缺字段不会让页面崩 */
function normalizeAnalysis(raw: unknown): OptimizeAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const dimensions = Array.isArray(o.dimensions)
    ? o.dimensions
        .map((d) => {
          const item = (d || {}) as Record<string, unknown>;
          return {
            name: str(item.name),
            score: clampScore(item.score),
            comment: str(item.comment),
          };
        })
        .filter((d) => d.name)
        .slice(0, 6)
    : [];

  const risks = Array.isArray(o.risks)
    ? o.risks
        .map((r) => {
          const item = (r || {}) as Record<string, unknown>;
          return {
            issue: str(item.issue),
            why: str(item.why),
            fix: str(item.fix),
          };
        })
        .filter((r) => r.issue)
        .slice(0, 4)
    : [];

  const rewrites = Array.isArray(o.rewrites)
    ? o.rewrites
        .map((r) => {
          const item = (r || {}) as Record<string, unknown>;
          return {
            original: str(item.original),
            problem: str(item.problem),
            improved: str(item.improved),
          };
        })
        .filter((r) => r.original || r.improved)
        .slice(0, 6)
    : [];

  const followups = Array.isArray(o.followups)
    ? o.followups
        .map((f) => {
          const item = (f || {}) as Record<string, unknown>;
          return {
            question: str(item.question),
            answerTip: str(item.answerTip),
          };
        })
        .filter((f) => f.question)
        .slice(0, 4)
    : [];

  const keywordsRaw = (o.keywords || {}) as Record<string, unknown>;
  const optimized = str(o.optimized);
  const summary = str(o.summary);

  // 核心内容全空说明模型没按格式返回，交给调用方兜底
  if (!optimized && !summary && dimensions.length === 0) return null;

  return {
    score: clampScore(o.score),
    level: str(o.level, "待评估"),
    summary,
    dimensions,
    highlights: strList(o.highlights, 4),
    risks,
    rewrites,
    followups,
    keywords: {
      hit: strList(keywordsRaw.hit, 12),
      missing: strList(keywordsRaw.missing, 12),
    },
    optimized,
  };
}

function buildPrompt(input: {
  kind: "resume" | "interview";
  positionLabel: string;
  recruitType: string;
  answerType: string;
  content: string;
}) {
  const isResume = input.kind === "resume";
  const dimensions = isResume
    ? "结构完整性、量化成果、岗位匹配度、专业关键词、HR 阅读体验"
    : "逻辑结构、岗位匹配度、专业与安全素养、表达感染力、案例支撑度";

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

export async function POST(request: NextRequest) {
  // 需要登录：AI 优化对已登录用户免费，但不允许游客刷接口
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录后使用 AI 优化" }, { status: 401 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "服务未配置 AI 密钥，请稍后再试" }, { status: 500 });
  }

  let body: {
    kind?: string;
    positionLabel?: string;
    recruitType?: string;
    answerType?: string;
    content?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
  }

  const kind = body.kind === "resume" ? "resume" : "interview";
  const content = String(body.content || "").trim();
  if (content.length < 10) {
    return NextResponse.json({ error: "内容太短，请至少输入 10 个字" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT) {
    return NextResponse.json({ error: `内容过长，请控制在 ${MAX_CONTENT} 字以内` }, { status: 400 });
  }

  const prompt = buildPrompt({
    kind,
    positionLabel: String(body.positionLabel || "民航岗位"),
    recruitType: String(body.recruitType || "校招"),
    answerType: String(body.answerType || "综合问题"),
    content,
  });

  try {
    const result = await callDeepSeekRaw(apiKey, prompt, {
      maxTokens: 12000,
      reasoningEffort: "low",
      timeoutMs: 110000,
    });

    const analysis = normalizeAnalysis(result.parsed);
    if (!analysis) {
      // JSON 没解析成功时，把模型原文交给前端展示，避免整个流程失败
      return NextResponse.json({
        ok: false,
        error: "AI 返回格式异常，已展示原始分析，可点击重试",
        rawText: result.content.slice(0, 6000),
      });
    }

    return NextResponse.json({
      ok: true,
      analysis,
      truncated: result.truncated,
    });
  } catch (error) {
    console.error("[Optimize] 调用失败:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "AI 服务暂时不可用，请稍后重试" }, { status: 502 });
  }
}
