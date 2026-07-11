import type { InterviewRole } from "@/lib/interview/types";

export const appName = "AeroPrep AI";

export const interviewCompanies = [
  "国航",
  "东航",
  "南航",
  "厦航",
  "海航",
  "深航",
  "吉祥",
  "春秋",
] as const;

export const interviewModes = [
  "校招",
  "社招",
  "压力面试",
  "英语面试",
] as const;

export const interviewerPersonas = [
  "温和型HR",
  "专业型HR",
  "压力型HR",
  "航司机长",
  "资深机务工程师",
] as const;

export type InterviewCompany = (typeof interviewCompanies)[number];
export type InterviewMode = (typeof interviewModes)[number];
export type InterviewerPersona = (typeof interviewerPersonas)[number];

export type PrepRoleOption = {
  value: InterviewRole;
  label: string;
  summary: string;
};

export const prepRoleOptions: PrepRoleOption[] = [
  {
    value: "pilot",
    label: "飞行员",
    summary: "飞行技术、职业动机、CRM 与运行安全",
  },
  {
    value: "dispatcher",
    label: "签派员",
    summary: "运行控制、放行逻辑、天气与备降决策",
  },
  {
    value: "maintenance",
    label: "机务维修",
    summary: "适航放行、故障排故、维修规范与安全边界",
  },
  {
    value: "civil-aviation-electronics",
    label: "航电工程师",
    summary: "航电系统、信号链路、故障定位与可靠性",
  },
  {
    value: "cabin-crew",
    label: "空乘",
    summary: "服务意识、应急处理、沟通与情绪稳定性",
  },
  {
    value: "atc",
    label: "机场运行",
    summary: "运行协同、程序意识、现场处置与时间管理",
  },
  {
    value: "air-marshal",
    label: "客舱安全员",
    summary: "空防安全、应急处置、身体素质与法规意识",
  },




  {
    value: "terminal-service",
    label: "航站楼服务",
    summary: "旅客引导、沟通能力、应急服务与综合保障",
  },


];

export const interviewHighlights = [
  "真实航空公司语境",
  "语音式沉浸训练",
  "面试后自动生成反馈报告",
];

export const sampleQuestionSet = [
  "请介绍一次你在高压环境下完成复杂任务的经历。",
  "如果航班临近起飞发现关键资源冲突，你会如何优先级排序？",
  "为什么你适合进入民航体系，而不是其他行业？",
];
