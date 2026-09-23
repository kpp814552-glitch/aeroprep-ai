import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeekRaw } from "@/lib/interview/deepseek";
import { buildOptimizePrompt } from "@/lib/optimize/prompt";

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

  const prompt = buildOptimizePrompt({
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
      endpoint: "optimize",
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
