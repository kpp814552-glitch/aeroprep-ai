import type {
  InterviewPhase,
  InterviewRole,
  InterviewRoleConfig,
  InterviewStage,
} from './types';

export const MAX_FOLLOW_UPS = 3;
export const TOTAL_INTERVIEW_ROUNDS = 20;
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
  'self-intro': 90,
  education: 45,
  project: 120,
  internship: 120,
  'role-fit': 75,
  professional: 75,
  scenario: 45,
  career: 45,
  summary: 45,
};

/** 单次面试最大时长（秒），超时自动结束生成报告 */
/** 面试模式对应的最大轮次 */
export function getTotalRoundsForMode(mode?: string): number {
  if (mode === "压力面试") return 10;
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
    interviewer: '空管局考官',
    firstQuestion:
      '好的。先请你做一个简短的自我介绍。把你的姓名、年龄、学校、专业，还有和机场运行或指挥协同相关的经历一起说一下。',
    coreTopics: ['运行协调', '程序意识', '现场处置', '抗压能力'],
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
