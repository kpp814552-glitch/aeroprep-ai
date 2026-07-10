/**
 * 民航AI面试 —— 航空公司画像数据库
 *
 * 每份画像包含该航司的：
 * - 企业定位与品牌风格
 * - 招聘偏好与面试风格
 * - 重点考察能力权重
 * - 常见面试方向与题量比例
 * - 高分回答特点与扣分雷区
 * - 理想候选人画像
 * - AI 模拟面试官性格描述
 *
 * 使用方式：
 *   import { getAirlineProfile } from "@/lib/interview/airline-profiles";
 *   const profile = getAirlineProfile("国航");
 */

export type AirlineKeyArea = {
  name: string;
  weight: number; // 百分比
};

export type AirlineQuestionDirection = {
  category: string;
  proportion: number; // 百分比
  examples: string[];
};

export type AirlineProfile = {
  /** 基本信息 */
  name: string;
  abbreviation: string;
  foundedYear: number;
  headquarters: string;

  /** 企业定位与品牌 */
  positioning: string;
  brandKeywords: string[];
  servicePhilosophy: string;

  /** 招聘画像 */
  recruitmentPreferences: string[];
  interviewStyle: string;
  
  /** 重点考察能力（权重总和=100%） */
  keyAreas: AirlineKeyArea[];

  /** 常见面试方向 */
  questionDirections?: AirlineQuestionDirection[];

  /** 高分回答特点 */
  highScoreCharacteristics: string[];

  /** 扣分行为 */
  deductionPoints: string[];

  /** 适合什么样的候选人 */
  idealCandidateProfile: string;

  /** AI模拟面试官性格 */
  aiInterviewerPersona: string;

  /** 岗位通用能力要求 */
  roleRequirements?: string[];
};

// ============================================================
// 航空公司画像数据
// ============================================================

const AIRLINE_PROFILES: Record<string, AirlineProfile> = {
  "国航": {
    name: "中国国际航空股份有限公司",
    abbreviation: "国航",
    foundedYear: 1988,
    headquarters: "北京",
    positioning: "中国唯一载国旗飞行的航空公司，承担大量国际航线和重要运输任务，是中国民航的形象代表。",
    brandKeywords: ["稳重", "专业", "安全", "国际化", "责任意识"],
    servicePhilosophy: "安全第一、真情服务。在保障安全的前提下提供温暖、专业的服务。",
    recruitmentPreferences: [
      "职业稳定性强，有长期发展意愿",
      "安全意识突出，做事严谨规范",
      "责任感强，有集体荣誉感",
      "形象气质端正，礼仪意识好",
      "具备国际化服务意识和外语能力",
    ],
    interviewStyle: "面试风格偏正式严谨。面试官会观察候选人的礼仪细节、表达逻辑和价值观匹配度。问题结构清晰，会逐层深入追问。",
    keyAreas: [
      { name: "安全意识", weight: 30 },
      { name: "服务意识", weight: 25 },
      { name: "职业稳定性", weight: 20 },
      { name: "沟通能力", weight: 15 },
      { name: "外语能力", weight: 10 },
    ],
    questionDirections: [
      { category: "安全责任", proportion: 40, examples: ["你如何理解安全与服务之间的关系？", "如果在航班中发现安全隐患，你会怎么处理？"] },
      { category: "职业认知", proportion: 30, examples: ["为什么选择国航？", "你如何看待'载旗航空'的特殊责任？", "你的职业规划是怎样的？"] },
      { category: "服务情景", proportion: 20, examples: ["如果旅客因延误情绪激动，你如何安抚？", "遇到特殊旅客（老人/儿童/残疾旅客）时，你的服务流程是什么？"] },
      { category: "基础交流", proportion: 10, examples: ["请用英语做一个简单的自我介绍。", "Tell us about a time you handled a difficult situation."] },
    ],
    highScoreCharacteristics: [
      "回答中主动体现'安全是民航工作的底线'的意识",
      "能结合国航载旗航空的特殊定位，体现责任感和荣誉感",
      "回答有结构（结论→依据→细节），不跳脱",
      "展现长期职业规划，而非'过渡一下'的态度",
      "英语表达流畅，能进行基本的航空服务对话",
    ],
    deductionPoints: [
      "说'我喜欢旅游所以想当空乘'——职业动机不足",
      "回答过于随意，缺乏礼仪意识",
      "对安全问题回答含糊，没有体现'安全第一'的底线思维",
      "职业规划不清晰，表现出'试试看'的态度",
      "英语表达困难，无法进行基本交流",
    ],
    idealCandidateProfile: "稳重、踏实、有责任心。不是最外向的，但做事认真可靠。能理解国航作为载旗航空的特殊定位，愿意长期发展。",
    aiInterviewerPersona: "严谨型面试官。语言规范专业，会逐层深入追问'为什么''具体怎么做'，考察候选人的思维深度和真实动机。不会随意闲聊，每个问题都有明确考察目的。",
    roleRequirements: [
      "具备良好的安全意识和规范执行能力",
      "有较强的责任心和团队协作精神",
      "形象气质佳，服务意识好",
      "英语达到民航服务要求水平",
    ],
  },

  "东航": {
    name: "中国东方航空股份有限公司",
    abbreviation: "东航",
    foundedYear: 1988,
    headquarters: "上海",
    positioning: "总部上海，中国三大航之一。以国际化视野和精细化服务品质著称，拥有丰富的国际国内航线网络。",
    brandKeywords: ["品质", "国际化", "精细化服务", "创新", "专业"],
    servicePhilosophy: "精准、舒适、高效。以旅客体验为核心，注重服务细节和品质感。",
    recruitmentPreferences: [
      "服务意识突出，关注细节",
      "沟通能力强，有同理心",
      "具备国际化视野和跨文化沟通能力",
      "有服务行业相关经验或志愿经历",
      "英语能力较好",
    ],
    interviewStyle: "偏专业国际范，注重综合素质和沟通表达能力。面试官会通过情景问题考察候选人的服务细节意识和文化包容度。",
    keyAreas: [
      { name: "服务品质", weight: 35 },
      { name: "国际化意识", weight: 25 },
      { name: "沟通能力", weight: 20 },
      { name: "情景处理", weight: 20 },
    ],
    questionDirections: [
      { category: "服务品质", proportion: 35, examples: ["你认为优秀服务是什么？", "请描述一次你主动为他人提供帮助的经历。", "如何理解'精细化服务'？"] },
      { category: "国际化意识", proportion: 30, examples: ["如何面对不同文化背景的旅客？", "如果外籍旅客对中国服务标准不理解，你如何处理？"] },
      { category: "情景处理", proportion: 25, examples: ["旅客投诉餐食质量时，你怎么处理？", "航班延误后，如何向不同需求的旅客进行解释？"] },
      { category: "专业知识", proportion: 10, examples: ["东航的企业文化中，哪个关键词你最有共鸣？为什么？"] },
    ],
    highScoreCharacteristics: [
      "回答体现同理心——不仅解决旅客问题，还关注旅客感受",
      "能举例说明自己主动服务的经历，而非被动完成任务",
      "展现对不同文化的尊重和包容",
      "有具体的服务细节描述，而非空泛表达",
    ],
    deductionPoints: [
      "回答机械——'按照规定处理'，缺少人情关怀",
      "对不同文化背景旅客表现出不理解或不耐烦",
      "没有体现主动服务意识",
      "英语表达能力不足",
    ],
    idealCandidateProfile: "亲和力强、有服务天赋。善于观察细节，能预见旅客需求。有国际化视野，对不同文化持开放态度。不是只会按章办事，而是懂得'灵活而合规'。",
    aiInterviewerPersona: "专业观察型面试官。注重候选人的服务细节意识和沟通方式。会通过情景模拟考察候选人的真实反应，关注候选人的表情、语调和用词是否与东航的服务理念匹配。",
  },

  "南航": {
    name: "中国南方航空股份有限公司",
    abbreviation: "南航",
    foundedYear: 1995,
    headquarters: "广州",
    positioning: "亚洲机队规模最大的航空公司之一，拥有庞大的国内外航线网络，以规模运营和高效服务为特色。",
    brandKeywords: ["亲和", "服务", "活力", "年轻化", "规模运营"],
    servicePhilosophy: "安全、高效、亲和、创新。以旅客需求为导向，提供热情周到的服务。",
    recruitmentPreferences: [
      "服务意识强，有亲和力",
      "沟通表达能力好",
      "团队协作精神突出",
      "适应大规模运营环境",
      "有服务行业实践经历",
    ],
    interviewStyle: "相比国航偏正式，南航更加注重交流感。不会一直考专业知识，更关注'你是不是适合服务行业'。面试官会通过聊天式问题了解候选人的真实性格。",
    keyAreas: [
      { name: "服务意识", weight: 35 },
      { name: "沟通能力", weight: 25 },
      { name: "亲和力与形象", weight: 20 },
      { name: "应变能力", weight: 20 },
    ],
    questionDirections: [
      { category: "服务意识", proportion: 40, examples: ["为什么想成为南航乘务员？", "如何理解'真情服务'？", "你觉得自己在服务方面最大的优势是什么？"] },
      { category: "沟通能力", proportion: 30, examples: ["旅客投诉时怎么办？", "如何与性格强势的同事合作？", "请分享一次成功说服他人的经历。"] },
      { category: "情景处理", proportion: 20, examples: ["航班满座，有旅客要求换座位，你如何处理？", "遇到不讲理的旅客，你怎么控制自己的情绪？"] },
      { category: "专业知识", proportion: 10, examples: ["南航目前最大的航空枢纽是哪里？", "你对南航的国际航线了解多少？"] },
    ],
    highScoreCharacteristics: [
      "回答温暖自然，有交流感而非背稿感",
      "体现主动服务和团队协作精神",
      "能用具体事例说明自己的服务理念",
      "情绪稳定，面对挑战性问题不慌张",
    ],
    deductionPoints: [
      "回答过于机械：'按照规定处理'——缺少人情关怀",
      "表现出对服务行业的轻视或'过渡工作'心态",
      "沟通中缺乏眼神交流和微笑",
      "不能举例说明自己的服务经历",
    ],
    idealCandidateProfile: "热情、开放、有感染力。真正喜欢与人打交道，能从帮助他人中获得成就感。不是最严肃的，但对待工作认真负责。适应快节奏的团队工作环境。",
    aiInterviewerPersona: "亲和型HR。面试像聊天一样自然，会根据回答继续追问。不会给候选人过大压力，但会通过轻松的问题了解候选人的真实性格和服务理念。",
  },

  "厦航": {
    name: "厦门航空有限公司",
    abbreviation: "厦航",
    foundedYear: 1984,
    headquarters: "厦门",
    positioning: "以精细化服务著称的航空公司，安全记录优秀，服务品质在业内口碑突出。",
    brandKeywords: ["精细化", "服务品质", "诚信", "精进", "温暖"],
    servicePhilosophy: "以诚为本、以客为尊。用细节打动旅客，用品质赢得信任。",
    recruitmentPreferences: [
      "服务细节意识强",
      "有精益求精的工匠精神",
      "职业操守好，诚信正直",
      "学习能力强，愿意持续进步",
      "有服务行业经验者优先",
    ],
    interviewStyle: "面试风格偏细致深入，会考察候选人对服务细节和品质的真实理解。面试官会通过具体情景问题来检验候选人的细节敏感度。",
    keyAreas: [
      { name: "服务细节", weight: 35 },
      { name: "职业操守", weight: 25 },
      { name: "学习能力", weight: 20 },
      { name: "团队协作", weight: 20 },
    ],
    highScoreCharacteristics: [
      "回答中体现出对服务细节的关注",
      "能举例说明自己如何精益求精地完成一件事",
      "展现诚信和职业操守",
      "有持续学习和自我提升的意识",
    ],
    deductionPoints: [
      "对细节不敏感，回答笼统",
      "缺乏精益求精的态度",
      "诚信意识不足",
    ],
    idealCandidateProfile: "细致、专注、有工匠精神。不是最外向的，但做事可靠、追求品质。能从每一个服务细节中获得成就感。",
    aiInterviewerPersona: "细节观察型面试官。会注意候选人的表述是否具体，是否能说出服务中的真实细节而非泛泛而谈。",
  },

  "海航": {
    name: "海南航空控股股份有限公司",
    abbreviation: "海航",
    foundedYear: 1993,
    headquarters: "海口",
    positioning: "五星航空，以国际化服务和独特企业文化闻名。融合东方哲学与现代管理理念。",
    brandKeywords: ["国际化", "五星服务", "东方文化", "至善至美", "匠心"],
    servicePhilosophy: "至诚、至善、至精、至美。用东方待客之道服务全球旅客。",
    recruitmentPreferences: [
      "国际化服务意识强",
      "职业形象好，气质大方",
      "有较高的服务标准追求",
      "文化素养好，有东方文化底蕴",
      "英语能力突出",
    ],
    interviewStyle: "偏国际化，注重候选人的整体职业素养和服务理念。面试官会从形象气质、谈吐举止、服务意识等多个维度综合评估。",
    keyAreas: [
      { name: "服务标准", weight: 30 },
      { name: "职业形象", weight: 25 },
      { name: "国际化素养", weight: 25 },
      { name: "文化底蕴", weight: 20 },
    ],
    highScoreCharacteristics: [
      "谈吐得体，整体职业形象好",
      "对五星服务标准有清晰认知",
      "能体现东方文化中的待客之道",
      "英语流利，能进行国际服务对话",
    ],
    deductionPoints: [
      "形象气质与五星航空要求差距较大",
      "对高品质服务缺乏认知",
      "英语能力明显不足",
    ],
    idealCandidateProfile: "气质佳、素养高。对服务品质有追求，不只是完成工作而是追求卓越。有文化底蕴，能理解并实践东方待客之道。",
    questionDirections: [
      { category: "服务标准", proportion: 30, examples: ["你对五星航空的服务标准有什么理解？", "如何用东方待客之道服务国际旅客？"] },
      { category: "职业形象", proportion: 25, examples: ["你认为空乘人员的职业形象应该是什么样的？", "在服务中如何保持专业形象？"] },
      { category: "国际化素养", proportion: 25, examples: ["请用英语介绍海南航空", "如何服务不同文化背景的旅客？"] },
      { category: "文化底蕴", proportion: 20, examples: ["你如何理解海航的至诚至善至精至美？", "东方文化中的待客之道有哪些核心要素？"] },
    ],
    aiInterviewerPersona: "综合评估型面试官。从候选人进入'面试室'的第一刻就开始评估——包括问候方式、坐姿、眼神交流等。问题可能涉及文化和服务理念的深度讨论。",
  },

  "深航": {
    name: "深圳航空有限责任公司",
    abbreviation: "深航",
    foundedYear: 1992,
    headquarters: "深圳",
    positioning: "总部深圳，以创新和务实著称。立足深圳这一创新之都，倡导现代化管理理念。",
    brandKeywords: ["创新", "务实", "高效", "卓越", "现代化"],
    servicePhilosophy: "创新务实、高效卓越。用创新思维提升服务品质，用务实态度保障运行安全。",
    recruitmentPreferences: [
      "创新思维活跃",
      "解决问题能力强",
      "务实的工作态度",
      "适应现代化管理理念",
      "综合素质较好",
    ],
    interviewStyle: "偏现代化，注重候选人的综合素质和创新潜力。面试官会通过开放性问题了解候选人的思维方式。",
    keyAreas: [
      { name: "创新能力", weight: 25 },
      { name: "解决问题的能力", weight: 25 },
      { name: "务实态度", weight: 25 },
      { name: "综合素质", weight: 25 },
    ],
    highScoreCharacteristics: [
      "回答体现创新思维，不墨守成规",
      "面对问题时能提出具体可行的解决方案",
      "态度务实，不空谈",
      "综合素质全面",
    ],
    deductionPoints: [
      "思维固化，缺乏灵活性",
      "空谈理论，没有实际可行的想法",
      "态度浮躁，不够务实",
    ],
    idealCandidateProfile: "思维活跃、做事踏实。不只会按部就班，而是会思考'如何做得更好'。适应深圳的创新氛围和快节奏。",
    questionDirections: [
      { category: "创新能力", proportion: 25, examples: ["请举例说明你用创新方法解决的一个问题。", "如何看待传统服务模式与创新的关系？"] },
      { category: "解决问题", proportion: 25, examples: ["遇到从未遇到过的问题时，你的处理思路是什么？", "请分享一次你成功解决问题的经历。"] },
      { category: "务实态度", proportion: 25, examples: ["你如何理解务实和创新之间的关系？", "请举例说明你如何把想法落到实处。"] },
      { category: "综合素质", proportion: 25, examples: ["你觉得自己最大的优势是什么？", "如何在新环境中快速适应？"] },
    ],
    aiInterviewerPersona: "开放型面试官。问题灵活多样，不局限于传统面试套路。会通过情景题和开放题考察候选人的思维方式和解决问题的能力。",
  },

  "吉祥": {
    name: "上海吉祥航空股份有限公司",
    abbreviation: "吉祥航空",
    foundedYear: 2006,
    headquarters: "上海",
    positioning: "民营航空公司的代表之一，以高效运营和灵活应变著称。",
    brandKeywords: ["高效", "成本意识", "灵活", "团队", "战斗力"],
    servicePhilosophy: "高效运营、灵活服务。在保持成本优势的前提下提供超出预期的服务体验。",
    recruitmentPreferences: [
      "成本意识强",
      "多岗位适应能力好",
      "执行力强",
      "团队合作精神突出",
      "抗压能力好",
    ],
    interviewStyle: "偏务实高效，节奏较快。面试官直接切入核心问题，注重候选人的执行力和适应性。不会有过多的寒暄。",
    keyAreas: [
      { name: "执行力", weight: 30 },
      { name: "适应能力", weight: 25 },
      { name: "团队协作", weight: 25 },
      { name: "成本意识", weight: 20 },
    ],
    highScoreCharacteristics: [
      "回答问题直接、高效、不拖泥带水",
      "展现多岗位适应意愿和能力",
      "有较强的执行力和结果导向",
      "体现团队合作精神",
    ],
    deductionPoints: [
      "回答拖沓、没有重点",
      "只愿意做单一岗位工作",
      "缺乏抗压能力",
      "对成本效率没有基本认知",
    ],
    idealCandidateProfile: "反应快、执行力强。不挑活，愿意在不同岗位锻炼。适应快节奏工作环境，有较强的抗压能力。",
    questionDirections: [
      { category: "执行力", proportion: 30, examples: ["请举例说明你如何在短时间内完成一项任务。", "如何平衡工作质量和效率？"] },
      { category: "适应能力", proportion: 25, examples: ["你如何看待轮岗制度？", "如果被安排到不熟悉的岗位，你如何应对？"] },
      { category: "团队协作", proportion: 25, examples: ["在团队中遇到配合不顺畅的情况怎么办？", "请分享一次团队合作的成功经历。"] },
      { category: "成本意识", proportion: 20, examples: ["你如何理解航空公司的成本控制？", "在保证服务质量的前提下，如何节约资源？"] },
    ],
    aiInterviewerPersona: "高效型面试官。节奏紧凑，直击核心。不会绕圈子，每个问题都有明确的考察目的。候选人的回答如果过于冗长会被打断引导。",
  },

  "春秋": {
    name: "春秋航空股份有限公司",
    abbreviation: "春秋航空",
    foundedYear: 2005,
    headquarters: "上海",
    positioning: "中国最大的廉价航空公司，以低成本、高效率运营模式著称。",
    brandKeywords: ["低成本", "高效率", "严管理", "灵活", "务实"],
    servicePhilosophy: "安全、准点、低价、便捷。在保证安全的前提下，通过高效的运营管理降低票价，让更多人坐得起飞机。",
    recruitmentPreferences: [
      "成本控制意识强",
      "工作效率高",
      "抗压能力强",
      "适应严格管理制度",
      "有多岗位工作意愿",
    ],
    interviewStyle: "直接高效、节奏紧凑。面试官会直截了当地提问，不会有过多的形式化流程。注重候选人的抗压能力和工作效率。",
    keyAreas: [
      { name: "工作效率", weight: 30 },
      { name: "抗压能力", weight: 25 },
      { name: "成本意识", weight: 25 },
      { name: "适应能力", weight: 20 },
    ],
    questionDirections: [
      { category: "工作效率", proportion: 30, examples: ["在短时间过站情况下，你如何高效完成工作？", "如何平衡工作效率和服务质量？"] },
      { category: "抗压能力", proportion: 25, examples: ["航班密集时你如何管理自己的精力和情绪？", "面对高强度工作节奏，你的应对策略是什么？"] },
      { category: "成本意识", proportion: 25, examples: ["你怎么理解低成本航空的服务理念？", "在控制成本的前提下，如何保证服务质量？"] },
      { category: "职业认知", proportion: 20, examples: ["为什么选择春秋航空？", "你对低成本航空的发展前景怎么看？"] },
    ],
    highScoreCharacteristics: [
      "理解低成本运营模式，不盲目追求奢华服务",
      "展现高效工作能力",
      "抗压能力强，情绪稳定",
      "有节约意识，不铺张浪费",
      "愿意接受不同岗位的工作安排",
    ],
    deductionPoints: [
      "对低成本航空模式不理解或轻视",
      "工作效率观念淡薄",
      "不能接受高强度工作",
      "只愿意做'体面'的工作，不愿做一线服务",
    ],
    idealCandidateProfile: "务实、高效、能吃苦。不追求表面光鲜，更看重实际能力和结果。适应严格的管理制度，能接受快节奏、高强度的工作环境。有节约意识，认同'把钱花在刀刃上'的理念。",
    aiInterviewerPersona: "直接务实型面试官。问题简洁直接，不会绕弯子。会通过压力性问题考察候选人的抗压能力和真实想法。对'假大空'的回答零容忍。",
  },
};

/**
 * 获取指定航空公司的完整画像
 * 如果未找到匹配航司，返回国航画像作为默认
 */
export function getAirlineProfile(company?: string): AirlineProfile {
  return AIRLINE_PROFILES[company || "国航"] || AIRLINE_PROFILES["国航"];
}

/**
 * 获取航空公司的核心考察权重映射（用于评分调整）
 * 返回：{ "安全意识": 30, "服务意识": 25, ... }
 */
export function getAirlineWeights(company?: string): Record<string, number> {
  const profile = getAirlineProfile(company);
  const weights: Record<string, number> = {};
  for (const area of profile.keyAreas) {
    weights[area.name] = area.weight;
  }
  return weights;
}

export default AIRLINE_PROFILES;
