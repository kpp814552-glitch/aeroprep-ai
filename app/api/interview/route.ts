import { NextResponse } from "next/server";
import {
  getRoleConfig,
  interviewStageLabels,
  interviewStages,
} from "@/lib/interview/config";
import { analyzeInterviewReport } from "@/lib/interview/report";
import type {
  InterviewReport,
  InterviewRole,
  InterviewStage,
  InterviewTurn,
} from "@/lib/interview/types";

type InterviewRequestBody = {
  action: "start" | "next" | "report";
  role: InterviewRole;
  turns?: InterviewTurn[];
  company?: string;
  mode?: string;
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

function parseJsonResponse(text: string) {
  const trimmedText = text.trim();
  const jsonText =
    trimmedText.match(/```json\s*([\s\S]*?)```/)?.[1] ||
    trimmedText.match(/\{[\s\S]*\}/)?.[0] ||
    trimmedText;

  return JSON.parse(jsonText);
}

async function callDeepSeek(apiKey: string, prompt: string) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content:
            "你是一名专业民航HR面试官。你必须只返回有效JSON，不要输出Markdown，不要解释。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.45,
      max_tokens: 1800,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek request failed: ${errorText}`);
  }

  const data = await response.json();
  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    "";

  return parseJsonResponse(content);
}

function getStageByTurnCount(turns: InterviewTurn[]) {
  return interviewStages[Math.min(turns.length, interviewStages.length - 1)] ?? "summary";
}

function pickResumeAnchor(answer: string) {
  const normalized = answer
    .replace(/\s+/g, "")
    .split(/[，。！？；、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.find((item) => item.length >= 6) ?? answer.slice(0, 24);
}

function buildFallbackStartQuestion(role: InterviewRole) {
  return getRoleConfig(role).firstQuestion;
}

function buildFallbackNextQuestion(
  role: InterviewRole,
  turns: InterviewTurn[],
  company?: string,
  persona?: string
) {
  const stage = getStageByTurnCount(turns);
  const roleConfig = getRoleConfig(role);
  const lastTurn = turns.at(-1);
  const anchor = pickResumeAnchor(lastTurn?.answer ?? "你刚才提到的内容");
  const airline = company || "这家航司";
  const interviewerTone = persona || "专业型HR";

  const stageQuestions: Record<InterviewStage, string> = {
    "self-intro":
      roleConfig.firstQuestion,
    education: `我注意到你刚才提到“${anchor}”。那我想先顺着教育背景继续了解一下。你在学校阶段，哪一门课程或者哪一次训练，对你后来准备${roleConfig.label}岗位帮助最大？`,
    project: `好的，我明白了。那我们继续往下聊。能不能挑一个你最有代表性的项目，讲讲你具体负责了什么，最后产出了什么结果？`,
    internship: `有意思。那我再追问一步。如果把课堂和真实工作场景放在一起看，你有没有相关实习、见习或者值班经历？当时你承担的角色是什么？`,
    "role-fit": `我注意到你刚才提到“${anchor}”。如果真的进入${airline}的${roleConfig.label}岗位，你觉得自己最能直接胜任的能力是什么？为什么？`,
    professional: `好的。那我想更专业一点。围绕${roleConfig.coreTopics[0]}和${roleConfig.coreTopics[1]}，你通常会怎么理解它们在实际工作里的重要性？`,
    scenario: `${interviewerTone === "压力型HR" ? "那我们加一点压力。" : "那我们做一个情景题。"} 如果现在遇到一个需要你快速判断和沟通的现场情况，你会先怎么判断，再怎么行动？`,
    career: `聊到这里，我想了解一下你的职业规划。如果你顺利进入${airline}，你希望自己在三到五年内成长成什么样的状态？`,
    summary: `好的，最后一个问题。如果现在让你用一句话总结，为什么${airline}应该选择你来做${roleConfig.label}，你会怎么回答？`,
  };

  return {
    stage,
    question: stageQuestions[stage],
  };
}

function buildStartQuestionPrompt(
  role: InterviewRole,
  company?: string,
  mode?: string,
  persona?: string
) {
  const roleConfig = getRoleConfig(role);

  return `
你现在是一位真实航空公司电话面试官。

面试背景：
- 航司：${company || "航空公司"}
- 岗位：${roleConfig.label}
- 面试模式：${mode || "常规面试"}
- 面试官人格：${persona || "成熟专业HR"}

要求：
- 这是全新的一场面试
- 第一题必须永远是自我介绍
- 必须明确要求候选人介绍：姓名、年龄、学校、专业、相关经历
- 要像真人HR在电话中说话
- 允许自然停顿，允许“好的”“那我们先从一个简单的问题开始”
- 用2到5个短句
- 不要客服播报感
- 不要书面考题感

只返回JSON：
{
  "stage": "self-intro",
  "question": "口语化问题"
}
`;
}

function buildNextQuestionPrompt(
  role: InterviewRole,
  turns: InterviewTurn[],
  company?: string,
  mode?: string,
  persona?: string
) {
  const roleConfig = getRoleConfig(role);
  const nextStage = getStageByTurnCount(turns);
  const lastTurn = turns.at(-1);

  return `
你现在是一位真实航空公司电话面试官。

面试背景：
- 航司：${company || "航空公司"}
- 岗位：${roleConfig.label}
- 面试模式：${mode || "常规面试"}
- 面试官人格：${persona || "成熟专业HR"}

当前面试进度：
- 下一阶段必须是：${interviewStageLabels[nextStage]}
- 面试顺序必须遵循：
自我介绍 -> 教育背景 -> 项目经历 -> 实习经历 -> 岗位能力 -> 专业知识 -> 情景问题 -> 职业规划 -> 总结

已完成问答：
${turns
  .map(
    (turn, index) => `${index + 1}. 阶段：${turn.stage ? interviewStageLabels[turn.stage] : "未知"}
问：${turn.question}
答：${turn.answer}`
  )
  .join("\n\n")}

必须遵守：
- 基于候选人上一轮回答追问
- 必须记住候选人刚刚说过的内容
- 先自然回应一句，再进入一个核心问题
- 不能直接跳到过深的专业难题
- 只问一个问题
- 像真实HR电话面试，不要朗读题库
- 用2到5个短句

候选人上一轮：
问：${lastTurn?.question || ""}
答：${lastTurn?.answer || ""}

只返回JSON：
{
  "stage": "${nextStage}",
  "question": "下一轮问题"
}
`;
}

function buildReportPrompt(
  role: InterviewRole,
  turns: InterviewTurn[],
  company?: string,
  mode?: string,
  persona?: string,
  fallbackReport?: InterviewReport
) {
  const roleConfig = getRoleConfig(role);

  return `
请担任${company || "航空公司"} ${roleConfig.label}岗位的民航HR面试官，根据以下真实面试记录生成一份专业面试报告。

面试模式：${mode || "常规面试"}
面试官人格：${persona || "专业型HR"}

面试记录：
${turns
  .map(
    (turn, index) => `${index + 1}. 阶段：${turn.stage ? interviewStageLabels[turn.stage] : "未知"}
问：${turn.question}
答：${turn.answer}
回答时长：${turn.answerDurationSeconds ?? 0}秒
静默提醒：${turn.silenceWarnings ?? 0}次`
  )
  .join("\n\n")}

请输出以下维度的真实分析，不要硬编空泛内容：
- 表达能力
- 逻辑能力
- 专业能力
- 岗位匹配度

评分标准请按中国民航大学在校生、校招候选人、实习生的真实水平来判断：
- 正常水平回答：75 到 85 分
- 优秀回答：85 到 95 分
- 不要因为不是社会招成熟候选人而过度压分
- 必须结合“问题 + 回答内容”的匹配度、结构性、专业相关性、岗位动机来打分
- 不要只按字数、语气词或回答长短打分

参考基础评分（可调整）：
${JSON.stringify(fallbackReport ?? {}, null, 2)}

只返回JSON：
{
  "scores": {
    "expressionAbility": 0,
    "logicalThinking": 0,
    "professionalKnowledge": 0,
    "roleFit": 0
  },
  "totalScore": 0,
  "overallEvaluation": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvementSuggestions": ["string"],
  "recommendedTraining": ["string"],
  "hiringProbability": 0,
  "narrativeSummary": "string",
  "highlights": ["string"]
}
`;
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

  return {
    scores: {
      expressionAbility:
        typeof candidate.scores?.expressionAbility === "number"
          ? candidate.scores.expressionAbility
          : fallback.scores.expressionAbility,
      logicalThinking:
        typeof candidate.scores?.logicalThinking === "number"
          ? candidate.scores.logicalThinking
          : fallback.scores.logicalThinking,
      professionalKnowledge:
        typeof candidate.scores?.professionalKnowledge === "number"
          ? candidate.scores.professionalKnowledge
          : fallback.scores.professionalKnowledge,
      roleFit:
        typeof candidate.scores?.roleFit === "number"
          ? candidate.scores.roleFit
          : fallback.scores.roleFit,
    },
    totalScore:
      typeof candidate.totalScore === "number"
        ? candidate.totalScore
        : fallback.totalScore,
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
      question: buildFallbackStartQuestion(body.role),
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
        buildNextQuestionPrompt(body.role, turns, body.company, body.mode, body.persona)
      );

      return NextResponse.json(normalizeModelQuestion(result, fallback));
    } catch {
      return NextResponse.json(fallback);
    }
  }

  if (body.action === "report") {
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
          fallbackReport
        )
      );

      return NextResponse.json({
        report: normalizeReportPayload(result, fallbackReport),
      });
    } catch {
      return NextResponse.json({ report: fallbackReport });
    }
  }

  return NextResponse.json(
    { error: "Unsupported interview action." },
    { status: 400 }
  );
}
