import { NextResponse } from "next/server";
import { logApiUsage, estimateDeepSeekCost } from "@/lib/admin/usage-logger";
import type { InterviewMode } from "@/lib/site";
import {
  getRoleConfig,
  interviewStageLabels,
  interviewStages,
} from "@/lib/interview/config";
import { analyzeInterviewReport } from "@/lib/interview/report";
import { getAirlineProfile } from "@/lib/interview/airline-profiles";
import { getRoleModel } from "@/lib/interview/role-models";
import type {
  InterviewReport,
  InterviewRole,
  InterviewStage,
  InterviewTurn,
} from "@/lib/interview/types";


// ===== Mode-Specific Configurations =====
import { buildStartQuestionPrompt, buildNextQuestionPrompt, buildReportPrompt, getModeInstruction, getStageByTurnCount, pickResumeAnchor, buildFallbackStartQuestion, buildFallbackNextQuestion, PersonaProfile, CompanyProfile, PERSONA_CONFIG, COMPANY_CONFIG } from "@/lib/interview/prompts";
import { callDeepSeek } from "@/lib/interview/deepseek";

// ===== Route Helpers =====
function getPersonaConfig(persona?: string): PersonaProfile {
  return PERSONA_CONFIG[persona || "专业型HR"] || PERSONA_CONFIG["专业型HR"];
}
type InterviewRequestBody = {
  action: "start" | "next" | "report";
  role: InterviewRole;
  turns?: InterviewTurn[];
  company?: string;
  mode?: string;
  resumeText?: string;
  persona?: string;
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

function normalizeReportPayload(payload: unknown, fallback: InterviewReport) {
  if (!payload || typeof payload !== "object") return fallback;

  const candidate = payload as Partial<InterviewReport>;

  // Strict score cap: max 68 for totalScore, max 75 for individual scores
  return {
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
    competitiveLevel:
      typeof candidate.competitiveLevel === "string" && ['A','B','C','D'].includes(candidate.competitiveLevel)
        ? candidate.competitiveLevel
        : fallback.competitiveLevel,
    competitiveScore:
      typeof candidate.competitiveScore === "number"
        ? candidate.competitiveScore
        : fallback.competitiveScore,
    competitiveRange:
      typeof candidate.competitiveRange === "string" && candidate.competitiveRange.trim()
        ? candidate.competitiveRange.trim()
        : fallback.competitiveRange,
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
}

export async function POST(request: Request) {
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
        buildStartQuestionPrompt(body.role, body.company, body.mode, body.persona)
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
      const result = await callDeepSeek(
        apiKey,
        buildNextQuestionPrompt(body.role, turns, body.company, body.mode, body.persona, body.resumeText)
      );

      return NextResponse.json(normalizeModelQuestion(result, fallback));
    } catch {
      return NextResponse.json(fallback);
    }
  }

  if (body.action === "report") {
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
         fallbackReport
        )
      );

      return NextResponse.json({
        report: normalizeReportPayload(result, fallbackReport),
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
