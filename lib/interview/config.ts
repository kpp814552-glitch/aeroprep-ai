import type {
  InterviewPhase,
  InterviewRole,
  InterviewRoleConfig,
  InterviewStage,
  InterviewTurn,
} from './types';

export const MAX_FOLLOW_UPS = 3;
export const TOTAL_INTERVIEW_ROUNDS = 8;
export const PREP_COUNTDOWN_SECONDS = 3;

export const interviewStages: InterviewStage[] = [
  'self-intro',
  'education',
  'project',
  'internship',
  'role-fit',
  'professional',
  'scenario',
  'career',
  'summary',
];

export const interviewStageLabels: Record<InterviewStage, string> = {
  'self-intro': '自我介绍',
  education: '教育背景',
  project: '项目经历',
  internship: '实习经历',
  'role-fit': '岗位能力',
  professional: '专业知识',
  scenario: '情景问题',
  career: '职业规划',
  summary: '总结收束',
};

export const interviewStageAnswerSeconds: Record<InterviewStage, number> = {
  'self-intro': 60,
  education: 40,
  project: 60,
  internship: 60,
  'role-fit': 50,
  professional: 50,
  scenario: 40,
  career: 40,
  summary: 30,
};

/** 单次面试最大时长（秒），超时自动结束生成报告 */
/** 面试模式对应的最大轮次 */
export function getTotalRoundsForMode(mode?: string): number {
  if (mode === "压力面试") return 7;
  return TOTAL_INTERVIEW_ROUNDS;
}

export const interviewRoles: InterviewRoleConfig[] = [
  {
    value: 'pilot',
    label: '飞行员',
    interviewer: '飞行员招聘面试官',
    firstQuestion:
      '好的。那我们先从一个简单的问题开始。请做一个简短的自我介绍，包括你的姓名、年龄、学校、专业，以及和飞行相关的经历。',
    coreTopics: ['飞行训练', 'CRM 协作', '安全意识', '职业动机'],
  },
  {
    value: 'atc',
    label: '空管员',
    interviewer: '空管局面试官（管制运行方向）',
    firstQuestion:
      '好的。我们开始面试。首先请你做一个简短的自我介绍，包括你的姓名、年龄、学校、专业，以及和你选择空管这个职业相关的任何经历或了解。',
    coreTopics: ['管制意识', '冲突调配', '特情处置', '陆空通话', '抗压能力'],
  },
  {
    value: 'dispatcher',
    label: '签派员',
    interviewer: '运行控制中心面试官',
    firstQuestion:
      '好的。先简单认识一下你。请做一个简短的自我介绍，包括你的姓名、年龄、学校、专业，以及和运行控制相关的经历。',
    coreTopics: ['放行逻辑', '天气决策', '运行控制', '风险评估'],
  },
  {
    value: 'cabin-crew',
    label: '乘务员',
    interviewer: '客舱服务招聘面试官',
    firstQuestion:
      '好的。我们先从自我介绍开始。请用一段自然一点的话介绍你自己，包括姓名、年龄、学校、专业，还有任何和服务或沟通相关的经历。',
    coreTopics: ['服务意识', '应急反应', '沟通表达', '情绪稳定性'],
  },
  {
    value: 'maintenance',
    label: '机务维修',
    interviewer: '机务维修技术面试官',
    firstQuestion:
      '好的。先请你做一个简短的自我介绍。包括姓名、年龄、学校、专业，以及和机务维修、故障排查或工程训练相关的经历。',
    coreTopics: ['适航放行', '排故思路', '维修规范', '安全边界'],
  },
  {
    value: 'aviation-meteorology',
    label: '航空气象',
    interviewer: '航空气象业务考官',
    firstQuestion:
      '好的。先请你用一两分钟介绍一下自己，包括姓名、年龄、学校、专业，以及和航空气象分析相关的学习经历。',
    coreTopics: ['天气分析', '运行影响', '趋势判断', '风险提示'],
  },
  {
    value: 'civil-aviation-electronics',
    label: '民航电子工程',
    interviewer: '民航电子工程面试官',
    firstQuestion:
      '好的。我们先彼此认识一下。请做一个简短的自我介绍，包括姓名、年龄、学校、专业，以及和航电系统或电子工程相关的经历。',
    coreTopics: ['航电系统', '故障定位', '信号链路', '工程实践'],
  },
  {
    value: 'air-marshal' as InterviewRole,
    label: '客舱安全员',
    interviewer: '空防安全面试官',
    firstQuestion: '好的。先请你做一个简短的自我介绍，包括姓名、年龄、学校、专业，以及任何和安保、体育或安全相关的经历。',
    coreTopics: ['空防安全', '应急处置', '身体素质', '法规意识'],
  },
  {
    value: 'terminal-service' as InterviewRole,
    label: '航站楼服务',
    interviewer: '航站楼管理面试官',
    firstQuestion: '好的。先请你做一个简短的自我介绍，包括姓名、年龄、学校、专业，以及你平时是否关注服务行业。',
    coreTopics: ['旅客引导', '沟通能力', '应急服务', '综合保障'],
  },
];

export const phaseLabels: Record<InterviewPhase, string> = {
  preparing: '准备面试内容',
  ready: '准备完成，等待开始',
  playing: 'AI提问中',
  listening: '请开始作答',
  processing: 'AI正在分析回答',
  completed: '面试结束',
  error: '异常处理',
};

export function getRoleConfig(role: InterviewRole) {
  return interviewRoles.find((item) => item.value === role) || interviewRoles[0];
}

/** 首题固定为自我介绍，直接用本地模板生成，避免开场等待大模型。 */
export function buildFastStartQuestion(
  role: InterviewRole,
  company?: string,
  resumeText?: string,
) {
  const roleConfig = getRoleConfig(role);
  const companyLead = company?.trim()
    ? `我是${company.trim()}负责${roleConfig.label}岗位面试的面试官。`
    : `我是本次负责${roleConfig.label}岗位面试的面试官。`;
  const introLead = resumeText?.trim()
    ? "你的简历我已经看过了，我们先从自我介绍开始。"
    : "好的，我们先从自我介绍开始。";

  return `你好，${companyLead}${introLead}请你用一分钟左右介绍姓名、年龄、学校、专业，以及和${roleConfig.label}相关的经历。`;
}

/** 下一题接口超时时的本地兜底，保证面试不会卡在分析阶段。 */
export function buildQuickNextQuestion(
  role: InterviewRole,
  turns: InterviewTurn[],
  company?: string,
) {
  const plan = [...interviewStages];
  const dropOrder: InterviewStage[] = ["education", "internship", "project"];
  for (const stage of dropOrder) {
    if (plan.length <= TOTAL_INTERVIEW_ROUNDS) break;
    const index = plan.indexOf(stage);
    if (index >= 0) plan.splice(index, 1);
  }
  const stage = plan[Math.min(turns.length, plan.length - 1)] ?? "summary";
  const roleConfig = getRoleConfig(role);
  const airline = company?.trim() || "目标航司";

  const questions: Record<InterviewStage, string> = {
    "self-intro": `请你用一分钟左右介绍姓名、年龄、学校、专业，以及和${roleConfig.label}相关的经历。`,
    education: `请结合你的学校经历说一说，哪一门课程或哪一次训练对你准备${roleConfig.label}岗位帮助最大？`,
    project: "请挑一个你最有代表性的项目，讲讲你具体负责了什么，最后得到了什么结果？",
    internship: "你有没有相关的实习、见习或值班经历？当时你承担了什么角色，具体做了什么？",
    "role-fit": `如果进入${airline}的${roleConfig.label}岗位，你觉得自己最能直接胜任的能力是什么？请举一个例子。`,
    professional: `围绕${roleConfig.coreTopics[0]}和${roleConfig.coreTopics[1]}，你如何理解它们在实际工作中的重要性？`,
    scenario: `如果${airline}的${roleConfig.label}岗位突然遇到一个需要你独立判断的突发情况，你会先确认什么，再采取什么行动？`,
    career: `如果你顺利进入${airline}，你希望自己未来三到五年成长成什么样的状态？`,
    summary: `最后一个问题，如果请你用一句话总结，为什么${airline}应该选择你从事${roleConfig.label}工作？`,
  };

  return { stage, question: questions[stage] };
}

export function getAnswerSecondsForStage(stage: InterviewStage) {
  return interviewStageAnswerSeconds[stage];
}

export function isInterviewRole(value: unknown): value is InterviewRole {
  return interviewRoles.some((item) => item.value === value);
}

export function normalizeScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
}
