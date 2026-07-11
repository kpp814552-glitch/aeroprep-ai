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
  /** 专属评分模型（用于最终报告评价，权重总和=100%） */
  scoringModel: RoleModelAbility[];
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
    scoringModel: [
      { name: "安全意识", weight: 30, questionExamples: [] },
      { name: "决策能力", weight: 20, questionExamples: [] },
      { name: "纪律意识", weight: 15, questionExamples: [] },
      { name: "压力管理", weight: 15, questionExamples: [] },
      { name: "学习能力", weight: 10, questionExamples: [] },
      { name: "团队协作", weight: 10, questionExamples: [] },
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
    scoringModel: [
      { name: "服务意识", weight: 30, questionExamples: [] },
      { name: "沟通能力", weight: 25, questionExamples: [] },
      { name: "情绪管理", weight: 20, questionExamples: [] },
      { name: "应急能力", weight: 15, questionExamples: [] },
      { name: "职业礼仪", weight: 10, questionExamples: [] },
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
    scoringModel: [
      { name: "专业能力", weight: 35, questionExamples: [] },
      { name: "安全意识", weight: 30, questionExamples: [] },
      { name: "工程思维", weight: 20, questionExamples: [] },
      { name: "责任意识", weight: 15, questionExamples: [] },
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
    scoringModel: [
      { name: "风险判断", weight: 35, questionExamples: [] },
      { name: "运行知识", weight: 30, questionExamples: [] },
      { name: "天气分析", weight: 20, questionExamples: [] },
      { name: "沟通能力", weight: 15, questionExamples: [] },
    ],
    keyInfoToCollect: ["专业背景", "是否学习签派相关课程", "是否了解签派员执照考试", "英语水平", "是否关注民航运行"],
    evaluationFocus: ["运行控制能力", "安全意识", "沟通协调", "应急处置", "学习能力"],
    fallbackDirection: "虽然没有签派相关背景，你为什么对运行控制感兴趣？你平时是否关注航班运行相关资讯？",
  },

  atc: {
    value: "atc",
    label: "空管员",
    abilities: [
      {
        name: "安全间隔意识",
        weight: 25,
        questionExamples: [
          "你如何理解空中交通管制中的安全间隔标准？雷达管制的水平间隔和垂直间隔分别如何把控？",
          "进近管制和区域管制在间隔标准上有哪些不同？",
          "流量大时如何同时管理冲突调配和正常航班运行次序？",
          "请描述你在模拟管制训练或理论实践中遇到的冲突调配场景。"
        ]
      },
      {
        name: "冲突调配与决策",
        weight: 20,
        questionExamples: [
          "两架飞机在同一高度相向飞行，你的调配思路是什么？优先调整哪一架？",
          "一架紧急状况航班需要优先降落，周围有4架正常进近航班，你如何调整次序？",
          "多个飞行冲突同时出现时，你的决策优先级是什么？",
          "你是否了解雷达引导、等待程序和速度调整这几种调配手段各自的使用场景？"
        ]
      },
      {
        name: "特情应急处置",
        weight: 20,
        questionExamples: [
          "遇到无线电通讯中断时，你的标准处置程序是什么？盲降信号丢失后如何引导飞机？",
          "航班宣布Mayday或Pan-pan后，管制员的首要行动是什么？",
          "雷达信号丢失时，如何通过程序管制和间隔标准来维持运行？",
          "特殊天气（风切变、雷暴、积冰）下如何引导飞机避开危险区域？"
        ]
      },
      {
        name: "陆空通话与英语能力",
        weight: 15,
        questionExamples: [
          "请用标准陆空通话术语引导一架飞机从进近到落地，包含高度指令和航向指令。",
          "外籍机组对你的指令表示不确定时，你如何做澄清性通讯？",
          "紧急情况下如何用英语做高效、清晰、无歧义的通讯？",
          "你如何看待ICAO英语四级/五级对管制员职业发展的影响？"
        ]
      },
      {
        name: "抗压与注意力分配",
        weight: 10,
        questionExamples: [
          "高峰时段同时管理12架以上飞机时，你的注意力如何分配？",
          "管制员面临的最大职业压力是什么？你如何应对？",
          "当你在雷达屏幕上发现一个自己之前没注意到的潜在冲突时，你的心理反应和处置步骤是什么？"
        ]
      },
      {
        name: "扇区配合与团队协作",
        weight: 10,
        questionExamples: [
          "如何与相邻扇区（进近→区域）进行航班移交？移交的要素有哪些？",
          "管制席与协调席如何配合？各自职责是什么？",
          "机组对你的指令理解有偏差时，你如何纠偏同时不造成恐慌？"
        ]
      },
    ],
    scoringModel: [
      { name: "安全间隔意识", weight: 30, questionExamples: [] },
      { name: "冲突调配能力", weight: 25, questionExamples: [] },
      { name: "特情处置规范性", weight: 20, questionExamples: [] },
      { name: "陆空通话专业度", weight: 15, questionExamples: [] },
      { name: "抗压与注意力分配", weight: 10, questionExamples: [] },
    ],
    keyInfoToCollect: [
      "专业背景（空管/民航/气象相关优先）",
      "是否学习过空中交通管理或航空气象等核心课程",
      "ICAO英语等级（四级/五级/六级）或英语水平自评",
      "是否参加过管制基础培训、模拟管制训练或管制实习",
      "是否了解雷达管制与程序管制的基本区别",
      "对空管工作环境的了解（倒班制度、夜班频率、高压环境）",
      "心理素质评估方向和抗压能力自评"
    ],
    evaluationFocus: [
      "安全间隔意识与规章敬畏",
      "冲突调配与决策效率",
      "特情处置规范性与应急反应",
      "陆空通话专业度与英语水平",
      "抗压能力与多任务注意力分配"
    ],
    fallbackDirection: "空管是一个专业性很强、准入门槛很高的职业——但这不是说没有相关背景就不能考。请谈谈你为什么想从事空中交通管制工作？你如何理解管制员在民航运行安全中的核心作用？你对管制员的日常工作要求、倒班制度和职业压力了解多少？有没有做过相关的求职准备或自学过空管基础知识？",
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
    scoringModel: [
      { name: "航电系统知识", weight: 25, questionExamples: [] },
      { name: "故障定位", weight: 25, questionExamples: [] },
      { name: "工程实践", weight: 20, questionExamples: [] },
      { name: "安全意识", weight: 20, questionExamples: [] },
      { name: "学习能力", weight: 10, questionExamples: [] },
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
    scoringModel: [
      { name: "气象分析", weight: 35, questionExamples: [] },
      { name: "风险判断", weight: 35, questionExamples: [] },
      { name: "运行知识", weight: 15, questionExamples: [] },
      { name: "沟通能力", weight: 15, questionExamples: [] },
    ],
    keyInfoToCollect: ["专业方向", "气象相关课程", "是否了解航空气象业务", "数据分析能力", "英语水平"],
    evaluationFocus: ["气象分析能力", "运行影响认知", "风险提示能力", "学习能力"],
    fallbackDirection: "虽然不是气象专业出身，你为什么对航空气象感兴趣？你平时是否关注天气对航空的影响？",
  },
  "air-marshal": {
    value: "air-marshal", label: "客舱安全员",
    abilities: [
      { name: "空防安全", weight: 25, questionExamples: ["如果旅客扰乱客舱秩序，你如何处理？", "安全员和乘务员职责有什么区别？"] },
      { name: "应急处置", weight: 25, questionExamples: ["遇到突发安全事件时，你的处置流程是什么？", "如何判断旅客行为是否需要升级处置？"] },
      { name: "身体素质", weight: 20, questionExamples: ["你是否有体育或格斗训练经历？", "安全员需要具备哪些身体素质？"] },
      { name: "法规意识", weight: 20, questionExamples: ["民航安保相关法规你了解哪些？", "在执法过程中如何平衡安全和法律边界？"] },
      { name: "心理素质", weight: 10, questionExamples: ["面对冲突时如何保持情绪稳定？", "你认为安全员最重要的心理品质是什么？"] },
    ],
    scoringModel: [
      { name: "安全意识", weight: 35, questionExamples: [] },
      { name: "应急能力", weight: 30, questionExamples: [] },
      { name: "法规意识", weight: 20, questionExamples: [] },
      { name: "身体素质", weight: 15, questionExamples: [] },
    ],
    keyInfoToCollect: ["体育经历", "安保经历", "军警经历", "安全培训", "身体素质"],
    evaluationFocus: ["安全意识", "应急能力", "身体素质", "法规意识"],
    fallbackDirection: "虽然没有安保相关经验，你为什么想从事客舱安全工作？你认为什么样的性格适合安全员岗位？",
  },

  "terminal-service": {
    value: "terminal-service", label: "航站楼服务",
    abilities: [
      { name: "沟通能力", weight: 30, questionExamples: ["老人旅客找不到登机口怎么办？", "特殊旅客需要哪些服务？"] },
      { name: "应急服务", weight: 25, questionExamples: ["航班取消后如何安抚旅客？", "航站楼内突发情况如何应对？"] },
      { name: "服务意识", weight: 25, questionExamples: ["如何主动发现需要帮助的旅客？", "你认为航站楼服务最重要的品质是什么？"] },
      { name: "综合保障", weight: 20, questionExamples: ["高峰时段如何保持航站楼秩序？", "多个航班同时延误时如何分配服务资源？"] },
    ],
    scoringModel: [
      { name: "沟通能力", weight: 35, questionExamples: [] },
      { name: "应急能力", weight: 30, questionExamples: [] },
      { name: "服务意识", weight: 25, questionExamples: [] },
      { name: "综合保障", weight: 10, questionExamples: [] },
    ],
    keyInfoToCollect: ["服务经历", "沟通能力", "志愿经历", "外语能力"],
    evaluationFocus: ["沟通能力", "应急服务", "服务意识", "综合保障"],
    fallbackDirection: "虽然没有航站楼服务经验，你为什么对民航地面服务感兴趣？你平时是否关注服务行业？",
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
