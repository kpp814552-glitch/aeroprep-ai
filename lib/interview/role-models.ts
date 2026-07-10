/**
 * 民航AI面试 —— 岗位能力模型库
 *
 * 每个岗位拥有独立的能力模型、问题方向和评价权重。
 * 生成问题时：
 *   岗位要求（70%）> 航空公司特点（20%）> 用户背景（10%）
 */

export type RoleModelAbility = {
  name: string;
  weight: number;           // 评估权重（%）
  questionExamples: string[]; // 问题示例
};

export type RoleModel = {
  value: string;
  label: string;
  /** 岗位核心能力（带权重） */
  abilities: RoleModelAbility[];
  /** 必须优先获取的信息 */
  keyInfoToCollect: string[];
  /** 最终报告的评价重心 */
  evaluationFocus: string[];
  /** 当用户无相关经历时的追问方向 */
  fallbackDirection: string;
};

const ROLE_MODELS: Record<string, RoleModel> = {
  pilot: {
    value: "pilot",
    label: "飞行员",
    abilities: [
      { name: "飞行职业认知", weight: 20, questionExamples: [
        "请介绍一下你的飞行训练经历。",
        "你如何理解飞行员职业中的安全责任？",
        "你为什么选择飞行员这个职业？"
      ]},
      { name: "安全意识", weight: 20, questionExamples: [
        "如果飞行过程中出现发动机异常，你首先关注什么？",
        "你如何理解CRM（机组资源管理）？",
        "在飞行训练中，教员强调最多的安全准则是什么？"
      ]},
      { name: "学习能力", weight: 15, questionExamples: [
        "你的理论学习成绩如何？",
        "在航校学习期间，哪门课程对你挑战最大？",
        "你是如何准备理论考试的？"
      ]},
      { name: "纪律意识", weight: 15, questionExamples: [
        "你如何理解标准操作程序（SOP）的重要性？",
        "如果发现同事违反操作规定，你会怎么做？"
      ]},
      { name: "压力管理", weight: 15, questionExamples: [
        "你在训练过程中遇到过最大的困难是什么？",
        "如何应对高强度训练压力？"
      ]},
      { name: "应急处置", weight: 15, questionExamples: [
        "遇到突发天气变化时，你的决策思路是什么？",
        "请描述一次你在模拟机中处理的紧急情况。"
      ]},
    ],
    keyInfoToCollect: ["是否参加过飞行训练", "航校经历", "飞行小时数", "飞行阶段", "理论考试成绩", "私照/商照情况", "仪表等级", "英语水平", "体检情况"],
    evaluationFocus: ["安全意识", "责任意识", "学习能力", "飞行职业认知", "压力管理"],
    fallbackDirection: "虽然你目前没有飞行训练经历，但请谈谈你为什么选择飞行员职业？你为成为飞行员做过哪些准备？",
  },

  "cabin-crew": {
    value: "cabin-crew",
    label: "乘务员",
    abilities: [
      { name: "服务意识", weight: 25, questionExamples: [
        "请分享一次你主动服务他人的经历。",
        "你认为优秀乘务员最重要的能力是什么？",
        "如何理解'真情服务'？"
      ]},
      { name: "沟通能力", weight: 20, questionExamples: [
        "如果旅客因航班延误情绪激动，你如何安抚？",
        "如何向不同文化背景的旅客提供沟通服务？"
      ]},
      { name: "情绪管理", weight: 20, questionExamples: [
        "遇到不讲理的旅客时，你如何控制自己的情绪？",
        "在高强度工作中如何保持耐心和热情？"
      ]},
      { name: "应变能力", weight: 20, questionExamples: [
        "航班中遇到突发医疗情况时，你的处置思路是什么？",
        "如果客舱出现紧急情况，你的首要任务是什么？"
      ]},
      { name: "职业礼仪", weight: 15, questionExamples: [
        "是否接受过航空服务礼仪培训？",
        "你如何理解乘务员的职业形象？"
      ]},
    ],
    keyInfoToCollect: ["是否参加航空服务相关培训", "礼仪经历", "艺考成绩（如适用）", "外语能力", "服务行业经历", "身高条件"],
    evaluationFocus: ["服务意识", "沟通能力", "情绪管理", "应变能力", "职业形象"],
    fallbackDirection: "虽然没有直接的服务经验，但你为什么想从事乘务员工作？你认为自己具备哪些适合服务行业的特点？",
  },

  maintenance: {
    value: "maintenance",
    label: "机务维修",
    abilities: [
      { name: "专业基础", weight: 25, questionExamples: [
        "你的专业方向是什么？是否学习过航空器维修相关课程？",
        "你是否了解民航维修人员执照制度？"
      ]},
      { name: "规范意识", weight: 20, questionExamples: [
        "为什么机务工作必须严格遵守维修手册？",
        "发现故障记录异常时，你的处理流程是什么？"
      ]},
      { name: "安全意识", weight: 20, questionExamples: [
        "如果发现同事在维修中省略了某个检查步骤，你会怎么做？",
        "在机务工作中，你认为安全最大的风险点是什么？"
      ]},
      { name: "动手能力", weight: 20, questionExamples: [
        "是否参加过飞机维修相关实习？",
        "请举例说明你解决过的技术问题。"
      ]},
      { name: "责任心", weight: 15, questionExamples: [
        "放行前发现一个微小异常，但航司催着出港，你怎么办？",
        "你如何理解'维修签字就是承担责任'这句话？"
      ]},
    ],
    keyInfoToCollect: ["专业方向", "是否学习航空器维修课程", "是否考取维修执照", "实习经历", "是否接触过飞机维护"],
    evaluationFocus: ["专业能力", "规范意识", "安全责任", "动手能力", "责任心"],
    fallbackDirection: "虽然没有直接的机务维修背景，你为什么对这个方向感兴趣？你对机务工作的日常内容有什么了解？",
  },

  dispatcher: {
    value: "dispatcher",
    label: "签派员",
    abilities: [
      { name: "运行控制", weight: 25, questionExamples: ["如何理解签派员在航班运行中的作用？", "遇到复杂天气时，你的放行决策思路是什么？"] },
      { name: "安全意识", weight: 20, questionExamples: ["如果目的地机场天气低于标准，你如何决策？", "如何平衡运行效率和飞行安全？"] },
      { name: "沟通协调", weight: 20, questionExamples: ["如何与机组沟通运行决策？", "跨部门协调时，你的沟通方式是什么？"] },
      { name: "应急处置", weight: 20, questionExamples: ["航班途中遇到紧急情况，签派员应该做什么？", "备降决策时考虑哪些因素？"] },
      { name: "学习能力", weight: 15, questionExamples: ["你对航空气象和航行通告了解多少？", "如何学习和掌握最新的运行规章？"] },
    ],
    keyInfoToCollect: ["专业背景", "是否学习签派相关课程", "是否了解签派员执照考试", "英语水平", "是否关注民航运行"],
    evaluationFocus: ["运行控制能力", "安全意识", "沟通协调", "应急处置", "学习能力"],
    fallbackDirection: "虽然没有签派相关背景，你为什么对运行控制感兴趣？你平时是否关注航班运行相关资讯？",
  },

  atc: {
    value: "atc",
    label: "空管员",
    abilities: [
      { name: "管制意识", weight: 25, questionExamples: ["你如何理解空中交通管制中的安全间隔？", "流量大时如何调配冲突？"] },
      { name: "应急处置", weight: 20, questionExamples: ["遇到无线电通讯中断时，你的处置程序是什么？", "特殊航班（紧急状况）如何优先处置？"] },
      { name: "抗压能力", weight: 20, questionExamples: ["高峰时段同时指挥多架飞机时，你如何保持冷静？", "管制员面临最大的压力源是什么？"] },
      { name: "英语能力", weight: 20, questionExamples: ["请用英语进行基本的陆空通话。", "如何准备ICAO英语考试？"] },
      { name: "团队协作", weight: 15, questionExamples: ["如何与相邻扇区协调移交？", "团队中如何处理好与机组的关系？"] },
    ],
    keyInfoToCollect: ["专业背景", "是否学习空管相关课程", "ICAO英语等级", "是否参加管制基础培训", "心理素质"],
    evaluationFocus: ["管制意识", "应急处置", "抗压能力", "英语能力", "团队协作"],
    fallbackDirection: "虽然没有管制背景，你为什么想从事空管工作？你对管制员的工作内容和要求了解多少？",
  },

  "civil-aviation-electronics": {
    value: "civil-aviation-electronics",
    label: "民航电子工程",
    abilities: [
      { name: "航电系统知识", weight: 25, questionExamples: ["你对飞机航电系统有哪些了解？", "通信导航监视系统在飞行中的作用是什么？"] },
      { name: "故障定位", weight: 20, questionExamples: ["遇到间歇性系统故障，你的排查思路是什么？", "如何通过系统日志判断故障原因？"] },
      { name: "工程实践", weight: 20, questionExamples: ["是否参加过电子工程相关项目？", "请举例说明你解决过的技术难题。"] },
      { name: "安全意识", weight: 20, questionExamples: ["航电系统故障可能对飞行安全造成什么影响？", "改装或维修后如何验证系统功能正常？"] },
      { name: "学习能力", weight: 15, questionExamples: ["航空技术更新很快，你如何保持学习？", "是否关注最新的航电技术发展？"] },
    ],
    keyInfoToCollect: ["专业方向", "电子工程相关课程", "项目经历", "是否了解航空电子系统", "英语水平"],
    evaluationFocus: ["航电系统知识", "故障定位能力", "工程实践", "安全意识", "学习能力"],
    fallbackDirection: "虽然没有航电相关工作经验，你为什么对民航电子工程感兴趣？你平时是否关注航空技术领域？",
  },

  "aviation-meteorology": {
    value: "aviation-meteorology",
    label: "航空气象",
    abilities: [
      { name: "气象分析", weight: 30, questionExamples: ["如何分析气象雷达图判断天气趋势？", "航空气象与普通气象预报有什么区别？"] },
      { name: "运行影响", weight: 25, questionExamples: ["雷暴天气对航班运行有什么影响？", "低能见度条件下，你的运行建议是什么？"] },
      { name: "风险提示", weight: 25, questionExamples: ["如何向运控中心和机组传达气象风险？", "遇到突发恶劣天气时，你的预警流程是什么？"] },
      { name: "学习能力", weight: 20, questionExamples: ["你对气象卫星和数值预报产品了解多少？", "如何保持对最新气象技术的跟进？"] },
    ],
    keyInfoToCollect: ["专业方向", "气象相关课程", "是否了解航空气象业务", "数据分析能力", "英语水平"],
    evaluationFocus: ["气象分析能力", "运行影响认知", "风险提示能力", "学习能力"],
    fallbackDirection: "虽然不是气象专业出身，你为什么对航空气象感兴趣？你平时是否关注天气对航空的影响？",
  },
};

export function getRoleModel(role?: string): RoleModel {
  return ROLE_MODELS[role || "pilot"] || ROLE_MODELS["pilot"];
}

export function getRoleAbilities(role?: string): RoleModelAbility[] {
  return getRoleModel(role).abilities;
}

export function getRoleEvaluationWeights(role?: string): Record<string, number> {
  const model = getRoleModel(role);
  const weights: Record<string, number> = {};
  for (const a of model.abilities) {
    weights[a.name] = a.weight;
  }
  return weights;
}

export default ROLE_MODELS;
