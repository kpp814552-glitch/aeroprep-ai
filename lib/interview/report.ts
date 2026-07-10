import {
  getRoleConfig,
  interviewStageLabels,
  normalizeScore,
} from "@/lib/interview/config";
import type {
  InterviewReport,
  InterviewRole,
  InterviewSessionRecord,
  InterviewStage,
  InterviewTurn,
} from "@/lib/interview/types";
import { clamp } from "@/lib/utils";

type AnalyzeOptions = {
  role: InterviewRole;
  company?: string;
  mode?: string;
  persona?: string;
  turns: InterviewTurn[];
  elapsedSeconds?: number;
};

const fillerWords = ["嗯", "这个", "然后", "就是", "那个", "怎么说", "呃"];
const structureSignals = ["首先", "其次", "最后", "第一", "第二", "第三", "一方面", "另一方面", "总结一下"];
const resultSignals = ["结果", "最终", "后来", "达成", "完成", "提升", "优化", "改进", "复盘", "收获"];
const motivationSignals = ["热爱", "责任", "长期", "发展", "稳定", "职业规划", "民航", "航司", "安全"];
const actionSignals = ["负责", "协调", "分析", "处理", "执行", "判断", "沟通", "配合", "跟进", "解决"];
const studentSignals = ["课程", "实验", "训练", "比赛", "项目", "社团", "实习", "见习"];

function tokenizeText(turns: InterviewTurn[]) {
  return turns.map((turn) => turn.answer.trim()).filter(Boolean).join("\n");
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(text: string, candidates: string[]) {
  return candidates.reduce((count, candidate) => {
    const matches = text.match(new RegExp(escapeRegExp(candidate), "gi"));
    return count + (matches?.length ?? 0);
  }, 0);
}

function averageAnswerLength(turns: InterviewTurn[]) {
  if (!turns.length) return 0;
  const total = turns.reduce((sum, turn) => sum + turn.answer.trim().length, 0);
  return total / turns.length;
}

function uniqueQuestionKeywords(question: string) {
  const blacklist = new Set([
    "请",
    "你",
    "你们",
    "我们",
    "一下",
    "一个",
    "什么",
    "为什么",
    "怎么",
    "如何",
    "以及",
    "然后",
    "或者",
    "是否",
    "一下子",
    "时候",
    "自己",
    "如果",
    "现在",
    "可以",
    "一下吧",
  ]);

  const fragments = question
    .replace(/[，。！？；：、“”"（）()\s]/g, " ")
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

  const compound = question.match(/[\u4e00-\u9fa5]{2,6}/g) ?? [];
  const combined = [...fragments, ...compound];

  return Array.from(
    new Set(
      combined.filter(
        (item) =>
          item.length >= 2 &&
          !blacklist.has(item) &&
          !/^(请问|介绍|简单|情况|内容|回答|问题|部分)$/.test(item)
      )
    )
  );
}

function countQuestionAnswerAlignment(turns: InterviewTurn[]) {
  return turns.reduce((score, turn) => {
    const answer = turn.answer.trim();
    if (!answer) return score;

    const keywords = uniqueQuestionKeywords(turn.question);
    if (!keywords.length) return score + 1;

    const covered = keywords.filter((keyword) => answer.includes(keyword)).length;
    const ratio = covered / keywords.length;

    if (ratio >= 0.6) return score + 4;
    if (ratio >= 0.35) return score + 3;
    if (ratio >= 0.18) return score + 2;
    return score + 0.5;
  }, 0);
}

function scoreArticulation(turns: InterviewTurn[]) {
  const totalText = tokenizeText(turns);
  const fillerPenalty = countMatches(totalText, fillerWords) * 1.5;
  const punctuationCount = (totalText.match(/[。！？]/g)?.length ?? 0);
  const avgCharsPerTurn = turns.length ? totalText.length / turns.length : 0;
  const clarityBonus = punctuationCount >= turns.length * 2 ? 8 : punctuationCount >= turns.length ? 4 : 0;
  const stableLengthBonus = avgCharsPerTurn >= 60 ? 5 : avgCharsPerTurn >= 30 ? 2 : -3;
  return normalizeScore(70 + clarityBonus + stableLengthBonus - fillerPenalty);
}

function scoreAdaptability(turns: InterviewTurn[]) {
  const totalText = tokenizeText(turns);
  const crossKeywords = countMatches(totalText, ["如果", "假设", "突发", "异常", "应急", "变化", "调整", "应对", "灵活"]);
  const actionBonus = countMatches(totalText, ["判断", "决策", "选择", "方案", "优先", "权衡"]) * 1.5;
  const variedStages = new Set(turns.filter(t => t.stage).map(t => t.stage)).size;
  return normalizeScore(68 + Math.min(12, crossKeywords * 2) + Math.min(10, actionBonus) + variedStages * 2);
}

function scoreServiceAwareness(turns: InterviewTurn[], role: InterviewRole) {
  const totalText = tokenizeText(turns);
  const serviceKeywords = countMatches(totalText, ["服务", "乘客", "旅客", "沟通", "解释", "安抚", "帮助", "体验", "关怀", "耐心"]);
  const teamKeywords = countMatches(totalText, ["协作", "配合", "团队", "分工", "支援", "协助"]);
  return normalizeScore(65 + Math.min(18, serviceKeywords * 3) + Math.min(10, teamKeywords * 2));
}

function scoreExpression(turns: InterviewTurn[]) {
  const totalText = tokenizeText(turns);
  const avgLength = averageAnswerLength(turns);
  const fillerPenalty = countMatches(totalText, fillerWords) * 1.2;
  const punctuationDensity =
    (totalText.match(/[，。！？；：]/g)?.length ?? 0) / Math.max(totalText.length, 1);
  const stableLengthBonus =
    avgLength >= 80 ? 8 : avgLength >= 50 ? 5 : avgLength >= 25 ? 2 : -6;
  const cadenceBonus = Math.min(5, punctuationDensity * 180);

  return normalizeScore(68 + stableLengthBonus + cadenceBonus - fillerPenalty);
}

function scoreLogic(turns: InterviewTurn[]) {
  const totalText = tokenizeText(turns);
  const structureBonus = Math.min(10, countMatches(totalText, structureSignals) * 2.5);
  const resultBonus = Math.min(8, countMatches(totalText, resultSignals) * 1.5);
  const alignmentBonus = Math.min(12, countQuestionAnswerAlignment(turns) * 0.9);
  const balancedAnswers = turns.filter((turn) => turn.answer.trim().length >= 45).length * 1.8;

  return normalizeScore(66 + structureBonus + resultBonus + alignmentBonus + balancedAnswers);
}

function scoreProfessional(turns: InterviewTurn[], role: InterviewRole) {
  const totalText = tokenizeText(turns);
  const roleKeywords = getRoleConfig(role).coreTopics;
  const keywordCoverage = countMatches(totalText, roleKeywords) * 4.5;
  const actionBonus = countMatches(totalText, actionSignals) * 1.2;
  const practiceBonus = countMatches(totalText, studentSignals) * 1.4;
  const stageBonus = turns.filter((turn) =>
    turn.stage === "project" ||
    turn.stage === "internship" ||
    turn.stage === "professional"
  ).length * 2.2;

  return normalizeScore(64 + keywordCoverage + actionBonus + practiceBonus + stageBonus);
}

function scoreRoleFit(turns: InterviewTurn[], role: InterviewRole, company?: string) {
  const totalText = tokenizeText(turns);
  const roleConfig = getRoleConfig(role);
  const alignmentBonus = Math.min(10, countQuestionAnswerAlignment(turns) * 0.7);
  const motivationBonus = countMatches(totalText, motivationSignals) * 2;
  const roleBonus = countMatches(totalText, [roleConfig.label, ...roleConfig.coreTopics]) * 2.4;
  const companyBonus = company ? countMatches(totalText, [company]) * 3.5 : 0;

  return normalizeScore(67 + alignmentBonus + motivationBonus + roleBonus + companyBonus);
}

function stageSummary(stage: InterviewStage | undefined) {
  if (!stage) return "本轮";
  return interviewStageLabels[stage];
}

function buildStrengths(
  scores: InterviewReport["scores"],
  turns: InterviewTurn[],
  role: InterviewRole
) {
  const items: string[] = [];

  if (scores.expressionAbility >= 82) {
    items.push("整体表达自然流畅，听感接近真实面试交流，不是简单背稿式作答。");
  }

  if (scores.logicalThinking >= 82) {
    items.push("回答层次比较清楚，能够围绕问题先给结论，再补充经历、依据和结果。");
  }

  if (scores.professionalKnowledge >= 82) {
    items.push(`对${getRoleConfig(role).label}岗位相关知识点有一定理解，能结合训练或实践经历展开说明。`);
  }

  const projectTurn = turns.find((turn) => turn.stage === "project" || turn.stage === "internship");
  if (projectTurn?.answer.trim().length) {
    items.push(`在${stageSummary(projectTurn.stage)}部分给出了真实案例，增强了岗位说服力。`);
  }

  return items.slice(0, 4);
}

function buildWeaknesses(scores: InterviewReport["scores"], turns: InterviewTurn[]) {
  const items: string[] = [];

  if (scores.logicalThinking < 75) {
    items.push("部分回答还停留在直觉式表达，结构不够稳定，观点和例子之间的衔接还能更清晰。");
  }

  if (scores.professionalKnowledge < 75) {
    items.push("专业表述偏概念化，和岗位核心知识点、训练场景之间的连接还不够充分。");
  }

  if (scores.roleFit < 75) {
    items.push("求职动机和岗位匹配理由表达得还不够集中，没完全把“为什么适合这份工作”说透。");
  }

  if (turns.some((turn) => turn.answer.trim().length < 35)) {
    items.push("个别回答展开不足，信息量偏少，导致亮点没有完全体现出来。");
  }

  return items.slice(0, 4);
}

function buildSuggestions(
  role: InterviewRole,
  scores: InterviewReport["scores"]
) {
  const roleConfig = getRoleConfig(role);
  const items: string[] = [
    "把每道题训练成“结论 - 依据 - 例子 - 收束”四步法，先回答核心观点，再补充细节。",
    "项目和实习经历优先突出你本人做了什么、遇到什么问题、最后带来什么结果。",
  ];

  if (scores.professionalKnowledge < 82) {
    items.push(`围绕 ${roleConfig.coreTopics.join("、")} 准备更口语化的表达，把课堂知识转成岗位语言。`);
  }

  if (scores.roleFit < 82) {
    items.push("把报考航司、岗位动机和三到五年职业规划连成一条线，减少泛泛而谈。");
  }

  return items.slice(0, 4);
}

function buildRecommendedTraining(role: InterviewRole, mode?: string) {
  const roleConfig = getRoleConfig(role);
  return [
    `${roleConfig.label}岗位高频题库复述训练`,
    `${roleConfig.coreTopics[0]} 与 ${roleConfig.coreTopics[1]} 场景化表达训练`,
    "项目经历 STAR 结构强化训练",
    mode === "英语面试" ? "民航英语口语表达训练" : "校招半结构化面试训练",
  ];
}

function buildOverallEvaluation(
  totalScore: number,
  role: InterviewRole,
  company?: string,
  mode?: string
) {
  const roleLabel = getRoleConfig(role).label;

  if (totalScore >= 88) {
    return `你在这场${company || "目标航司"} ${roleLabel}${mode ? ` ${mode}` : ""}面试中的综合表现已经比较成熟，回答质量和岗位贴合度都达到了较强水平。`;
  }

  if (totalScore >= 78) {
    return `你在这场${company || "目标航司"} ${roleLabel}${mode ? ` ${mode}` : ""}面试中表现出较好的基础和可培养性，已经具备比较正常的校招竞争力。`;
  }

  return `你已经具备一定的表达基础，但如果想在${company || "目标航司"} ${roleLabel}校招中更稳地脱颖而出，还需要继续强化结构化表达和岗位针对性。`;
}

export function analyzeInterviewReport(options: AnalyzeOptions): InterviewReport {
  const expressionAbility = scoreExpression(options.turns);
  const logicalThinking = scoreLogic(options.turns);
  const professionalKnowledge = scoreProfessional(options.turns, options.role);
  const roleFit = scoreRoleFit(options.turns, options.role, options.company);
  const articulation = scoreArticulation(options.turns);
  const adaptability = scoreAdaptability(options.turns);
  const serviceAwareness = scoreServiceAwareness(options.turns, options.role);

  const totalScore = normalizeScore(
    expressionAbility * 0.16 +
      logicalThinking * 0.16 +
      professionalKnowledge * 0.18 +
      roleFit * 0.16 +
      articulation * 0.12 +
      adaptability * 0.12 +
      serviceAwareness * 0.10
  );

  const adjustedScore = normalizeScore(
    clamp(
      totalScore < 75
        ? totalScore + 6
        : totalScore < 85
          ? totalScore + 3
          : totalScore,
      60,
      95
    )
  );

  const hiringProbability = normalizeScore(
    clamp(
      adjustedScore * 0.94 +
        (options.turns.length >= 6 ? 5 : options.turns.length * 0.8) +
        (options.mode === "压力面试" ? -2 : 0),
      35,
      97
    )
  );

  const scores = {
    expressionAbility,
    logicalThinking,
    professionalKnowledge,
    roleFit,
    articulation,
    adaptability,
    serviceAwareness,
  };

  const strengths = buildStrengths(scores, options.turns, options.role);
  const weaknesses = buildWeaknesses(scores, options.turns);
  const improvementSuggestions = buildSuggestions(options.role, scores);
  const recommendedTraining = buildRecommendedTraining(options.role, options.mode);
  const overallEvaluation = buildOverallEvaluation(
    adjustedScore,
    options.role,
    options.company,
    options.mode
  );

  const highlights = options.turns
    .filter((turn) => turn.answer.trim().length > 70)
    .slice(0, 3)
    .map((turn) => `${stageSummary(turn.stage)}回答信息量较充足，与题目相关性较好。`);

  return {
    scores,
    totalScore: adjustedScore,
    overallEvaluation,
    strengths,
    weaknesses,
    improvementSuggestions,
    recommendedTraining,
    hiringProbability,
    narrativeSummary: `${overallEvaluation} 从校招面试标准看，你当前的表现已经不只是“能回答”，而是开始接近“有说服力的回答”。后续重点是继续提高问题针对性、岗位贴合度和案例展开质量。`,
    highlights,
  };
}

export function buildSessionRecord(
  input: Omit<InterviewSessionRecord, "report"> & { report?: InterviewReport }
) {
  return {
    ...input,
    report: input.report,
  } satisfies InterviewSessionRecord;
}
