import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logApiUsage, estimateDeepSeekCost } from "@/lib/admin/usage-logger";
import { createClient } from "@/lib/supabase/server";
import { hasQuota, loadServerQuota } from "@/lib/member/quota-server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import type { InterviewMode } from "@/lib/site";
import {
  getRoleConfig,
  getTotalRoundsForMode,
  interviewStageLabels,
  interviewStages,
} from "@/lib/interview/config";
import { analyzeInterviewReport, computeCompetitiveScore, deriveCompetitiveTier } from "@/lib/interview/report";
import { getAirlineProfile } from "@/lib/interview/airline-profiles";
import { getRoleModel } from "@/lib/interview/role-models";
import type {
  InterviewReport,
  InterviewRole,
  InterviewStage,
  InterviewTurn,
} from "@/lib/interview/types";


// ===== Mode-Specific Configurations =====
import { buildStartQuestionPrompt, buildNextQuestionPrompt, buildReportPrompt, buildReaskPrompt, getModeInstruction, getStageByTurnCount, pickResumeAnchor, buildFallbackStartQuestion, buildFallbackNextQuestion, PersonaProfile, CompanyProfile, PERSONA_CONFIG, COMPANY_CONFIG, type ReaskReason } from "@/lib/interview/prompts";
import { callDeepSeek } from "@/lib/interview/deepseek";

// 报告生成需要 30-60 秒（推理模型思考 + 长 JSON 输出），
// 必须显式声明函数最长执行时间，否则 Vercel 默认超时会中途掐断。
export const maxDuration = 60;

// ===== Route Helpers =====
function getPersonaConfig(persona?: string): PersonaProfile {
  return PERSONA_CONFIG[persona || "专业型HR"] || PERSONA_CONFIG["专业型HR"];
}
type InterviewRequestBody = {
  action: "start" | "next" | "report" | "reask";
  role: InterviewRole;
  turns?: InterviewTurn[];
  company?: string;
  mode?: string;
  resumeText?: string;
  resumeQuality?: { score: number; deductions: string[]; comment: string };
  persona?: string;
  /** reask 专用：需要重问的题目、重问原因、第几次重问 */
  question?: string;
  reaskReason?: ReaskReason;
  attempt?: number;
};

type ModelQuestionResult = {
  question?: string;
  stage?: InterviewStage;
};

function isInterviewTurn(value: unknown): value is InterviewTurn {
  if (!value || typeof value !== "object") return false;

  const turn = value as Record<string, unknown>;
  return typeof turn.question === "string" && typeof turn.answer === "string";
}

function normalizeModelQuestion(
  result: ModelQuestionResult,
  fallback: { question: string; stage: InterviewStage }
) {
  return {
    stage: result.stage && interviewStages.includes(result.stage) ? result.stage : fallback.stage,
    question:
      typeof result.question === "string" && result.question.trim()
        ? result.question.trim()
        : fallback.question,
  };
}

function normalizeReportPayload(payload: unknown, fallback: InterviewReport, turns: InterviewTurn[]) {
  if (!payload || typeof payload !== "object") return fallback;

  const candidate = payload as Partial<InterviewReport>;

  // Strict score cap: max 68 for totalScore, max 75 for individual scores
  const normalized = {
    scores: {
      expressionAbility:
        Math.min(
          typeof candidate.scores?.expressionAbility === "number"
            ? candidate.scores.expressionAbility
            : fallback.scores.expressionAbility,
          68
        ),
      logicalThinking:
        Math.min(
          typeof candidate.scores?.logicalThinking === "number"
            ? candidate.scores.logicalThinking
            : fallback.scores.logicalThinking,
          68
        ),
      professionalKnowledge:
        Math.min(
          typeof candidate.scores?.professionalKnowledge === "number"
            ? candidate.scores.professionalKnowledge
            : fallback.scores.professionalKnowledge,
          68
        ),
      roleFit:
        Math.min(
          typeof candidate.scores?.roleFit === "number"
            ? candidate.scores.roleFit
            : fallback.scores.roleFit,
          68
        ),
      articulation:
        Math.min(
          typeof candidate.scores?.articulation === "number"
            ? candidate.scores.articulation
            : fallback.scores.articulation,
          68
        ),
      adaptability:
        Math.min(
          typeof candidate.scores?.adaptability === "number"
            ? candidate.scores.adaptability
            : fallback.scores.adaptability,
          68
        ),
      serviceAwareness:
        Math.min(
          typeof candidate.scores?.serviceAwareness === "number"
            ? candidate.scores.serviceAwareness
            : fallback.scores.serviceAwareness,
          68
        ),
    },
    totalScore:
      Math.min(
        typeof candidate.totalScore === "number"
          ? candidate.totalScore
          : fallback.totalScore,
        68
      ),
    overallEvaluation:
      typeof candidate.overallEvaluation === "string" && candidate.overallEvaluation.trim()
        ? candidate.overallEvaluation.trim()
        : fallback.overallEvaluation,
    strengths:
      Array.isArray(candidate.strengths) && candidate.strengths.length
        ? candidate.strengths.filter((item): item is string => typeof item === "string")
        : fallback.strengths,
    weaknesses:
      Array.isArray(candidate.weaknesses) && candidate.weaknesses.length
        ? candidate.weaknesses.filter((item): item is string => typeof item === "string")
        : fallback.weaknesses,
    improvementSuggestions:
      Array.isArray(candidate.improvementSuggestions) &&
      candidate.improvementSuggestions.length
        ? candidate.improvementSuggestions.filter(
            (item): item is string => typeof item === "string"
          )
        : fallback.improvementSuggestions,
    recommendedTraining:
      Array.isArray(candidate.recommendedTraining) && candidate.recommendedTraining.length
        ? candidate.recommendedTraining.filter(
            (item): item is string => typeof item === "string"
          )
        : fallback.recommendedTraining,
    hiringProbability:
      typeof candidate.hiringProbability === "number"
        ? candidate.hiringProbability
        : fallback.hiringProbability,
    narrativeSummary:
      typeof candidate.narrativeSummary === "string" && candidate.narrativeSummary.trim()
        ? candidate.narrativeSummary.trim()
        : fallback.narrativeSummary,
    highlights:
      Array.isArray(candidate.highlights) && candidate.highlights.length
        ? candidate.highlights.filter((item): item is string => typeof item === "string")
        : fallback.highlights,
    comprehensiveEvaluation:
      typeof candidate.comprehensiveEvaluation === "string" && candidate.comprehensiveEvaluation.trim()
        ? candidate.comprehensiveEvaluation.trim()
        : fallback.comprehensiveEvaluation,
    perQuestionAnalysis:
      Array.isArray(candidate.perQuestionAnalysis) && candidate.perQuestionAnalysis.length
        ? candidate.perQuestionAnalysis.filter((item): item is string => typeof item === "string")
        : fallback.perQuestionAnalysis,
    personalProfile:
      typeof candidate.personalProfile === "string" && candidate.personalProfile.trim()
        ? candidate.personalProfile.trim()
        : fallback.personalProfile,
    careerMatch:
      typeof candidate.careerMatch === "string" && candidate.careerMatch.trim()
        ? candidate.careerMatch.trim()
        : fallback.careerMatch,
    improvementPlan:
      typeof candidate.improvementPlan === "string" && candidate.improvementPlan.trim()
        ? candidate.improvementPlan.trim()
        : fallback.improvementPlan,
    nextPrediction:
      typeof candidate.nextPrediction === "string" && candidate.nextPrediction.trim()
        ? candidate.nextPrediction.trim()
        : fallback.nextPrediction,
    growthMessage:
      typeof candidate.growthMessage === "string" && candidate.growthMessage.trim()
        ? candidate.growthMessage.trim()
        : fallback.growthMessage,
    competitiveStrengths:
      Array.isArray(candidate.competitiveStrengths) && candidate.competitiveStrengths.length
        ? candidate.competitiveStrengths.filter((item): item is string => typeof item === "string")
        : fallback.competitiveStrengths,
    competitiveWeaknesses:
      Array.isArray(candidate.competitiveWeaknesses) && candidate.competitiveWeaknesses.length
        ? candidate.competitiveWeaknesses.filter((item): item is string => typeof item === "string")
        : fallback.competitiveWeaknesses,
    interviewerPerspective:
      typeof candidate.interviewerPerspective === "string" && candidate.interviewerPerspective.trim()
        ? candidate.interviewerPerspective.trim()
        : fallback.interviewerPerspective,
    externalFactors:
      typeof candidate.externalFactors === "string" && candidate.externalFactors.trim()
        ? candidate.externalFactors.trim()
        : fallback.externalFactors,
    trainingProjection:
      typeof candidate.trainingProjection === "string" && candidate.trainingProjection.trim()
        ? candidate.trainingProjection.trim()
        : fallback.trainingProjection,
  };

  // 竞争分数/等级/区间一律由代码按统一公式计算，不采信模型自由发挥的结果，
  // 避免出现"等级 B 但区间写 65%-75%"这类自相矛盾
  const competitiveScore = computeCompetitiveScore(normalized.scores, turns);
  const { level: competitiveLevel, range: competitiveRange } = deriveCompetitiveTier(competitiveScore);

  return { ...normalized, competitiveScore, competitiveLevel, competitiveRange };
}

export async function POST(request: NextRequest) {
  // 面试出题 / 报告都会调用付费大模型，必须先登录（防止接口被匿名刷）
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录后再开始面试" }, { status: 401 });
  }

  let body: InterviewRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!body?.action || !body.role) {
    return NextResponse.json(
      { error: "Request body must include a valid action and role." },
      { status: 400 }
    );
  }

  // ── 服务端权威额度校验 ──
  // 前端次数判断可以被绕过；出题 / 语音 / 报告都是按量付费的调用，
  // 必须在这里拦住"次数用完还在刷接口"的情况。
  const quota = await loadServerQuota(supabase, user.id);
  if (!hasQuota(quota)) {
    return NextResponse.json(
      { error: "面试次数已用完，请先购买次数", code: "NO_QUOTA" },
      { status: 402 },
    );
  }

  // 正常面试大约 30 秒一次调用，40 次/分钟足够宽松，只挡脚本刷接口
  const limited = checkRateLimit(`interview:${user.id}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "操作过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const turns = Array.isArray(body.turns) && body.turns.every(isInterviewTurn)
    ? body.turns
    : [];

  const roleConfig = getRoleConfig(body.role);
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (body.action === "start") {
    const fallback = {
      stage: "self-intro" as InterviewStage,
      question: buildFallbackStartQuestion(body.role, body.company),
    };

    if (!apiKey) {
      return NextResponse.json({
        interviewer: roleConfig.interviewer,
        roleLabel: roleConfig.label,
        ...fallback,
      });
    }

    try {
      const result = await callDeepSeek(
        apiKey,
        buildStartQuestionPrompt(
          body.role,
          body.company,
          body.mode,
          body.persona,
          body.resumeText,
          body.resumeQuality
        ),
        { maxTokens: 4096, reasoningEffort: "low", timeoutMs: 25000, userId: user.id }
      );

      return NextResponse.json({
        interviewer: roleConfig.interviewer,
        roleLabel: roleConfig.label,
        ...normalizeModelQuestion(result, fallback),
      });
    } catch {
      return NextResponse.json({
        interviewer: roleConfig.interviewer,
        roleLabel: roleConfig.label,
        ...fallback,
      });
    }
  }

  // ── 没听清 / 请重复：让面试官像真人一样变通，而不是机械重念题目 ──
  if (body.action === "reask") {
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const reason: ReaskReason = body.reaskReason === "unclear" ? "unclear" : "silent";
    const attempt = Math.min(Math.max(Number(body.attempt) || 1, 1), 5);

    const silentPool = attempt > 1
      ? [
          "我这边还是没收到声音，你确认一下麦克风，或者靠近一点，再说一次我听听。",
          "还是没听到你的声音，麻烦看一下麦克风是不是被静音了，我们再试一次。",
        ]
      : [
          "不好意思，我这边好像没听清，你能再说一遍吗？",
          "抱歉，刚才可能是我这边卡了一下，你再说一次可以吗？",
          "诶？我这边没接到声音，你再说一遍我听听。",
          "不好意思，我没太听清楚，刚才那段能再讲一次吗？",
        ];
    const unclearPool = [
      `好的，我换个说法——${question}`,
      `没问题，那我说得再具体一点——${question}`,
    ];
    const pool = reason === "unclear" ? unclearPool : silentPool;
    const fallbackLine = pool[Math.floor(Math.random() * pool.length)];

    if (!apiKey || !question) {
      return NextResponse.json({ line: fallbackLine });
    }

    try {
      const parsed = await callDeepSeek<{ line?: string }>(
        apiKey,
        buildReaskPrompt({
          reason,
          attempt,
          question,
          role: body.role,
          company: body.company,
          persona: body.persona,
        }),
        {
          maxTokens: 512,
          reasoningEffort: "none",
          timeoutMs: 15000,
          endpoint: "interview",
          userId: user.id,
        }
      );

      const line = typeof parsed?.line === "string" ? parsed.line.trim() : "";
      return NextResponse.json({ line: line || fallbackLine });
    } catch {
      return NextResponse.json({ line: fallbackLine });
    }
  }

  if (body.action === "next") {
    const fallback = buildFallbackNextQuestion(
      body.role,
      turns,
      body.company,
      body.persona
    );

    if (!apiKey) {
      return NextResponse.json(fallback);
    }

    try {
      // 速度与质量兼顾：情景题要"临场设计一个贴合岗位的场景"，保留一点思考；
      // 其余题目本质是"接话 + 追问"，关掉思考，问答之间不冷场。
      const nextStage = getStageByTurnCount(turns, getTotalRoundsForMode(body.mode));
      const deepThinking = nextStage === "scenario";

      const result = await callDeepSeek(
        apiKey,
        buildNextQuestionPrompt(
          body.role,
          turns,
          body.company,
          body.mode,
          body.persona,
          body.resumeText,
          body.resumeQuality
        ),
        // 下一题必须"答完就接上"，出题延迟直接等于用户干等的秒数：
        // 默认关闭思考模式（纯改写 + 追问，不需要推理链），把 8~10 秒压到 1~2 秒。
        {
          maxTokens: deepThinking ? 2048 : 1024,
          reasoningEffort: deepThinking ? "low" : "none",
          timeoutMs: 20000,
          userId: user.id,
        }
      );

      return NextResponse.json(normalizeModelQuestion(result, fallback));
    } catch {
      return NextResponse.json(fallback);
    }
  }

  if (body.action === "report") {
    // 没有问答记录就要求出报告，属于异常调用（也避免白烧一次大模型）
    if (turns.length === 0) {
      return NextResponse.json({ error: "面试记录为空，无法生成报告" }, { status: 400 });
    }
    // // console.log('[Report Generate] turns=' + turns.length + ' role=' + body.role);
    try {
      const fallbackReport = analyzeInterviewReport({
      role: body.role,
      company: body.company,
      mode: body.mode,
      persona: body.persona,
      turns,
    });

    if (!apiKey) {
      return NextResponse.json({ report: fallbackReport });
    }

    try {
      const result = await callDeepSeek(
        apiKey,
        buildReportPrompt(
         body.role,
         turns,
         body.company,
         body.mode,
         body.persona,
          body.resumeText,
         fallbackReport,
         body.resumeQuality
        ),
        { maxTokens: 16000, reasoningEffort: "low", timeoutMs: 110000, userId: user.id }
      );

      return NextResponse.json({
        report: normalizeReportPayload(result, fallbackReport, turns),
      });
    } catch {
      return NextResponse.json({ report: fallbackReport });
    }
    } catch (outerErr) {
      console.error('[Report] Outer catch:', outerErr);
      const emergencyReport = {
        scores: { expressionAbility: 0, logicalThinking: 0, professionalKnowledge: 0, roleFit: 0, articulation: 0, adaptability: 0, serviceAwareness: 0 },
        totalScore: 0, overallEvaluation: "报告生成遇到临时问题，请重新测试。",
        strengths: ["完成面试流程"], weaknesses: ["报告分析暂不可用"],
        improvementSuggestions: ["请重新面试获取完整报告"],
        recommendedTraining: [], hiringProbability: 0,
        narrativeSummary: "", highlights: [], comprehensiveEvaluation: "",
        perQuestionAnalysis: [], personalProfile: "", careerMatch: "",
        improvementPlan: "", nextPrediction: "", growthMessage: "",
        competitiveLevel: "D", competitiveScore: 0, competitiveRange: "",
        competitiveStrengths: [], competitiveWeaknesses: [],
        interviewerPerspective: "", externalFactors: "", trainingProjection: "",
      };
      return NextResponse.json({ report: emergencyReport });
    }
  }

  return NextResponse.json(
    { error: "Unsupported interview action." },
    { status: 400 }
  );
}
