import { NextResponse } from "next/server";
import { logApiUsage, estimateDeepSeekCost } from "@/lib/admin/usage-logger";
import { interviewExampleQA, getExampleForRole } from "@/lib/interview/examples";
import type { InterviewMode } from "@/lib/site";
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


// ===== Mode-Specific Configurations =====
function getModeInstruction(mode: string, resumeText: string): string {
  const modeUpper = (mode || "校招").trim();

  // Resume section (empty if no resume)
  const resumeSection = resumeText?.trim()
    ? `
候选人简历内容（面试官已审阅，提问必须紧扣简历中的具体经历，避免泛泛而问）：
${resumeText.trim().slice(0, 4000)}
`
    : "";

  const modeInstructions: Record<string, string> = {
    "校招": `
面试模式：校招（应届生/在校生）
筛选逻辑：关注候选人的教育背景、实习经历、学习能力、职业潜力和动机。
提问风格：温和引导型。先肯定再追问。重点考察基础素质和可塑性，而非经验深度。
问题聚焦：围绕课程学习、校园项目、实习经历、职业规划展开。
不要问需要多年行业经验才能回答的问题。
评估标准：潜力 > 经验，学习能力 > 已有技能，态度 > 成就。
`,
    "社招": `
面试模式：社招（有经验候选人）
筛选逻辑：关注候选人的工作经历、项目成果、行业认知和即战力。
提问风格：专业直接型。直接切入业务场景，追问具体细节和决策过程。
问题聚焦：围绕过往工作职责、成功案例、失败教训、行业理解、跨部门协作展开。
使用STAR追问法（情况-任务-行动-结果）。
评估标准：经验匹配度 > 潜力，实操能力 > 理论，成果 > 态度。
`,
    "压力面试": `
面试模式：压力面试
筛选逻辑：考察候选人在高压、质疑、打断环境下的情绪控制和思维敏捷度。面试节奏紧凑，控制在8-10轮内结束。
提问风格：挑战质疑型。连续追问打断，质疑候选人的回答，压缩思考时间。
- 候选人说"我不确定"时，立刻追问"那你为什么敢说前面的话"
- 候选人说"团队合作"时，追问"具体你做了什么，不是你们做了什么"
- 不要给予正面反馈，对每个回答都提出更深层的质疑
- 打断含糊表达，要求具体化
- 连续递进追问，不给喘息机会
- 如果候选人回答不够全面或含糊其辞，立即转入施压提问模式，收紧节奏
- 如果候选人回答全面充分可以提前进入收束阶段，不必走完所有面试阶段
- 每轮回答时间控制在45秒以内，面试总时长尽量不超过8分钟
评估标准：抗压能力 > 回答准确度，思维敏捷度 > 知识深度。
`,
    "英语面试": `
面试模式：英语面试（English Interview）
IMPORTANT: All questions, feedback, and interactions MUST be in English ONLY.
The entire interview should be conducted in English.
Evaluate the candidate's English proficiency for civil aviation context.
Focus on both professional knowledge AND English communication ability.
`,
  };

  return (modeInstructions[modeUpper] || modeInstructions["校招"]) + resumeSection;
}

// ===== Interviewer Persona Configurations =====
type PersonaProfile = {
  style: string;
  toneInstruction: string;
  approachInstruction: string;
  feedbackInstruction: string;
  scenarioIntro: string;
};

const PERSONA_CONFIG: Record<string, PersonaProfile> = {
  "温和型HR": {
    style: "温暖鼓励型面试官",
    toneInstruction: "语气温和亲切，多用'好的''没关系''说得挺不错的'等鼓励性措辞。即使回答不完整，也先肯定再引导。",
    approachInstruction: "引导式提问，给候选人充分的表达空间。如果候选人卡住了，用'慢慢来，不着急'来缓解紧张。不要连续追问。",
    feedbackInstruction: "回答后先给予正面反馈，再用'我能不能再延伸一下'来引出下一轮。",
    scenarioIntro: "那我们来做一道比较轻松的情景分析题，你可以按自己的节奏来回答。假设你在现场遇到了一个需要快速判断和沟通的情况，你会怎么处理？",
  },
  "专业型HR": {
    style: "专业中立型面试官",
    toneInstruction: "语言精炼专业，保持客观中立。直接围绕岗位能力模型提问，避免主观评价，聚焦候选人的事实和经验。",
    approachInstruction: "使用结构化行为面试法（STAR原则）。针对'当时的情况''你的具体行动''最终的结果'逐层深入。",
    feedbackInstruction: "不对回答内容做价值判断，用'我了解了''好的，明白了'等中性短语自然过渡。",
    scenarioIntro: "那我们进入情景题环节，请用STAR原则来组织你的回答。假设一个运行突发情况，请描述你的判断和行动方案。",
  },
  "压力型HR": {
    style: "挑战施压型面试官",
    toneInstruction: "语气带有适当的压力和挑战性。开场不要太温和，直接进入主题。多用'能不能具体一点''这个回答还不够深入'等追问。节奏紧凑。",
    approachInstruction: "连续追问模式。候选人回答后立刻追问细节，打断含糊不清的描述，压缩思考时间。",
    feedbackInstruction: "不要说'说得不错'或'挺好的'。对每一轮回答都要提出更深的问题，用'我理解，但我想知道的是'来施加追问压力。",
    scenarioIntro: "那我们加一点压力。你只有极短的时间做判断，你会最先关注什么？然后你会怎么行动？",
  },
  "航司机长": {
    style: "运行经验型面试官",
    toneInstruction: "语调和措辞偏航空运行语境，使用航空专业术语（如'标准操作程序''机组资源管理''情况意识'）。语气沉稳专业。",
    approachInstruction: "以实际运行场景为切入点，考察候选人的程序意识、CRM能力和安全决策思维。像资深机长在做航线带飞后的讲评。",
    feedbackInstruction: "用运行经验回应，如'你这个思路在实际运行中会遇到……'，保持师徒式的辅导氛围。",
    scenarioIntro: "我们来做一个运行情景题。你在执飞一个复杂进近，天气在最低标准附近，你会怎么进行简令和决策？",
  },
  "资深机务工程师": {
    style: "技术专家型面试官",
    toneInstruction: "语气偏向技术讨论，使用维修工程术语（如'排故手册''TSM''适航指令'）。语调严谨，注重技术逻辑和规范意识。",
    approachInstruction: "以故障场景和技术判断为切入点，考察候选人的排故思路、维修规范和系统知识。像资深工程师在做技术面试。",
    feedbackInstruction: "用技术逻辑回应，如'如果你是放行工程师，你会怎么判断'，保持技术讨论的氛围。",
    scenarioIntro: "我们来看一个技术情景。航班过站报告一个间歇性故障，你作为当班工程师，会按照什么思路来排查和决策？",
  },
};


// ===== Airline Company Configurations =====
type CompanyProfile = {
  label: string;
  culture: string;
  values: string[];
  interviewFocus: string;
  styleHint: string;
};

const COMPANY_CONFIG: Record<string, CompanyProfile> = {
  "国航": {
    label: "国航",
    culture: "载旗航空，中国民航的代表。企业文化以'安全第一、严谨规范'为核心，强调纪律性和责任感。",
    values: ["安全", "责任", "严谨", "规范"],
    interviewFocus: "重点考察候选人的安全意识、规范执行能力、责任感和职业素养。对运行标准和规章制度的理解非常重要。",
    styleHint: "面试风格偏正式严谨，对专业知识和规章熟悉度要求较高。",
  },
  "东航": {
    label: "东航",
    culture: "总部上海，中国三大航之一。企业文化融合国际化视野与本土服务创新，强调'精准、舒适、高效'。",
    values: ["国际化", "服务创新", "精准", "高效"],
    interviewFocus: "重点考察候选人的服务意识、沟通能力和国际化视野。对英语能力和跨文化沟通有一定要求。",
    styleHint: "面试风格偏专业国际范，注重综合素质和沟通表达能力。",
  },
  "南航": {
    label: "南航",
    culture: "亚洲机队规模最大的航空公司，总部广州。企业文化以'安全、高效、亲和、创新'为核心，拥有丰富的国际国内航线网络。",
    values: ["安全", "亲和", "创新", "规模运营"],
    interviewFocus: "重点考察候选人的专业基础、实操能力和团队协作精神。对大规模运行环境下的适应能力有要求。",
    styleHint: "面试风格偏务实，注重实际能力和岗位匹配度。",
  },
  "厦航": {
    label: "厦航",
    culture: "总部厦门，以精细化服务和优秀安全记录著称。企业文化倡导'诚信、精进、担当、创新'，服务品质在业内口碑突出。",
    values: ["精细化", "服务品质", "诚信", "精进"],
    interviewFocus: "重点考察候选人的服务细节意识、职业操守和精益求精的态度。对服务标准和质量追求有较高期望。",
    styleHint: "面试风格偏细致深入，会考察候选人对服务细节和品质的理解。",
  },
  "海航": {
    label: "海航",
    culture: "总部海口，五星航空，以国际化服务和独特企业文化闻名。企业文化融合东方哲学与现代管理，强调'至诚、至善、至精、至美'。",
    values: ["国际化", "五星服务", "东方文化", "至善至美"],
    interviewFocus: "重点考察候选人的服务意识、职业形象和国际化素养。对服务标准和旅客体验有较高要求。",
    styleHint: "面试风格偏国际化，注重候选人的整体职业素养和服务理念。",
  },
  "深航": {
    label: "深航",
    culture: "总部深圳，以创新和务实著称。企业文化倡导'创新、务实、高效、卓越'，立足深圳这一创新之都。",
    values: ["创新", "务实", "高效", "卓越"],
    interviewFocus: "重点考察候选人的创新思维、解决问题的能力和务实的工作态度。对现代化管理理念的接受度有关注。",
    styleHint: "面试风格偏现代化，注重候选人的综合素质和创新潜力。",
  },
  "吉祥": {
    label: "吉祥航空",
    culture: "民营航空公司的代表之一，总部上海。企业文化强调'高效运营、成本意识、灵活应变'，注重团队战斗力。",
    values: ["高效", "成本意识", "灵活", "团队"],
    interviewFocus: "重点考察候选人的成本意识、多岗位适应能力和工作执行力。对高效运营环境的适应能力有要求。",
    styleHint: "面试风格偏务实高效，节奏较快，注重候选人的执行力和适应性。",
  },
  "春秋": {
    label: "春秋航空",
    culture: "中国最大的廉价航空公司，总部上海。企业文化以'低成本、高效率、严管理'为核心，强调节约意识和快速决策。",
    values: ["低成本", "高效率", "严管理", "灵活"],
    interviewFocus: "重点考察候选人的成本控制意识、工作强度和压力承受能力。对高效、简化的运营模式有明确要求。",
    styleHint: "面试风格偏直接高效，节奏紧凑，注重候选人的抗压能力和工作效率。",
  },
};

function getCompanyConfig(company?: string): CompanyProfile {
  return COMPANY_CONFIG[company || "国航"] || COMPANY_CONFIG["国航"];
}


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

function parseJsonResponse(text: string) {
  const trimmedText = text.trim();
  const jsonText =
    trimmedText.match(/```json\s*([\s\S]*?)```/)?.[1] ||
    trimmedText.match(/\{[\s\S]*\}/)?.[0] ||
    trimmedText;

  return JSON.parse(jsonText);
}

async function callDeepSeek(apiKey: string, prompt: string) {
  console.log('[LLM Request] action=' + (prompt.includes('"action":"report"') ? 'report' : prompt.includes('"action":"next"') ? 'next' : 'start') + ' prompt_length=' + prompt.length);
  const startTime = Date.now();
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
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek request failed: ${errorText}`);
  }

  const data = await response.json();

  // Log token usage
  const usage = data?.usage;
  if (usage) {
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    logApiUsage({
      model: 'deepseek',
      inputTokens,
      outputTokens,
      totalTokens: usage.total_tokens || 0,
      characters: 0,
      cost: estimateDeepSeekCost(inputTokens, outputTokens),
      endpoint: 'interview',
    }).catch(() => {});
  }

  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    "";
  const elapsed = Date.now() - startTime;
  console.log('[LLM Response] elapsed=' + elapsed + 'ms content_length=' + content.length);

  return parseJsonResponse(content);
}

function getStageByTurnCount(turns: InterviewTurn[]) {
  // Each stage gets at least 2 rounds for main question + follow-up
  const stageIndex = Math.min(
    Math.floor(turns.length / 2),
    interviewStages.length - 1
  );
  return interviewStages[stageIndex] ?? "summary";
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
  const companyCfg = getCompanyConfig(company);
  const personaCfg = getPersonaConfig(persona);

  const stageQuestions: Record<InterviewStage, string> = {
    "self-intro":
      roleConfig.firstQuestion,
    education: `我注意到你刚才提到“${anchor}”。那我想先顺着教育背景继续了解一下。你在学校阶段，哪一门课程或者哪一次训练，对你后来准备${roleConfig.label}岗位帮助最大？`,
    project: `好的，我明白了。那我们继续往下聊。能不能挑一个你最有代表性的项目，讲讲你具体负责了什么，最后产出了什么结果？`,
    internship: `有意思。那我再追问一步。如果把课堂和真实工作场景放在一起看，你有没有相关实习、见习或者值班经历？当时你承担的角色是什么？`,
    "role-fit": `我注意到你刚才提到“${anchor}”。如果真的进入${airline}的${roleConfig.label}岗位，你觉得自己最能直接胜任的能力是什么？为什么？`,
    professional: `好的。那我想更专业一点。围绕${roleConfig.coreTopics[0]}和${roleConfig.coreTopics[1]}，你通常会怎么理解它们在实际工作里的重要性？`,
    scenario: `${personaCfg.scenarioIntro}`,
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
  persona?: string,
  resumeText?: string
) {
  const roleConfig = getRoleConfig(role);
  const modeInstruction = getModeInstruction(mode || "校招", resumeText || "");

  return `
你现在是一位真实航空公司电话面试官。

面试背景：
- 航司：${company || "航空公司"}
- 岗位：${roleConfig.label}
- 面试官人格：${persona || "成熟专业HR"}
${modeInstruction}

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

function buildInterviewExamples(): string {
  return `参考面试对话示例（模仿以下提问风格和追问逻辑）：

=== 示例：自我介绍 ===
面试官："您好，请做一个简短的自我介绍，介绍你的姓名、年龄、学校专业以及与岗位相关的经历。"
候选人："面试官您好，我叫张明，今年22岁，来自中国民用航空飞行学院飞行技术专业。在校期间我完成了185小时飞行训练，目前正在考取商用驾驶员执照。去年暑假在国航飞行部见习了两个月，参与了航班计划制定。"
面试官："好的，谢谢你的介绍。那我想顺着你的经历继续了解一下……"

=== 示例：情景追问 ===
面试官："假设你执飞的航班在下降过程中收到目的地机场因突发天气关闭的通知，作为机长你会如何处理？"
候选人："首先我会评估剩余油量和可用备降场，选择最合适的备降方案。同时向乘客做好信息通报，保持客舱秩序。最后与运控确认后续安排。"
面试官："你提到评估油量，能具体说说你的计算思路吗？主要考虑哪些因素？"
候选人："我会考虑当前油量、到备降场的航程油量、等待油量（通常30分钟）、进近和复飞油量，以及最终储备油量。按照 CCAR-121 部规定，到达备降场上空时剩余燃油不得少于45分钟的正常巡航油量。"

=== 示例：专业知识 ===
面试官："请解释什么是 stabilized approach（稳定进近）的概念和标准。"
候选人："稳定进近是指在进近最后阶段，飞机保持稳定的速度、航迹和构型进行进近。通常标准是：在1000英尺（仪表气象）或500英尺（目视气象）前，飞机必须建立稳定进近构型。如果未能建立，必须执行复飞，不能为了落地而勉强进近。"
面试官："如果机组在500英尺还没有建立稳定进近，但目视跑道条件很好，可以继续进近吗？"
候选人："严格来说不可以。即使目视条件良好，未能在标准高度前建立稳定进近也必须复飞。这是安全底线，不能因为'看着能落'而冒险。"
`;
}



function buildNextQuestionPrompt(
  role: InterviewRole,
  turns: InterviewTurn[],
  company?: string,
  mode?: string,
  persona?: string,
  resumeText?: string
) {
  const roleConfig = getRoleConfig(role);
  const companyCfg = getCompanyConfig(company);
  const nextStage = getStageByTurnCount(turns);
  const lastTurn = turns.at(-1);
  const personaCfg = getPersonaConfig(persona);
  const modeInstruction = getModeInstruction(mode || "校招", resumeText || "");

  // Only include last 5 turns to keep prompt size bounded and reduce latency
  const recentTurns = turns.slice(-5);

  return `
你现在是一位真实航空公司电话面试官。

面试背景：
- 航司：${company || "航空公司"}
- 岗位：${roleConfig.label}
- 面试官人格：${persona || "专业型HR"}
${modeInstruction}

面试官人格指令（必须严格遵守）：
- 风格类型：${personaCfg.style}
- 语气和措辞要求：${personaCfg.toneInstruction}
- 提问方式要求：${personaCfg.approachInstruction}
- 追问/反馈风格：${personaCfg.feedbackInstruction}

目标公司背景（面试官需体现该航司特色）：
- 航司：${companyCfg.label}
- 企业文化：${companyCfg.culture}
- 核心价值：${companyCfg.values.join("、")}
- 面试考察重点：${companyCfg.interviewFocus}

当前面试进度：
- 下一阶段必须是：${interviewStageLabels[nextStage]}
- 面试顺序必须遵循：
自我介绍 -> 教育背景 -> 项目经历 -> 实习经历 -> 岗位能力 -> 专业知识 -> 情景问题 -> 职业规划 -> 总结

已完成问答：
${recentTurns
  .map(
    (turn, index) => `${index + 1}. 阶段：${turn.stage ? interviewStageLabels[turn.stage] : "未知"}
问：${turn.question}
答：${turn.answer}`
  )
  .join("\n\n")}

必须遵守：
- 按照上面面试官人格指令来组织追问，语气和风格必须保持一致性
- 基于候选人上一轮回答进行追问，抓住具体细节深入挖掘
- 如果候选人回答过于简短（少于20字）或答非所问，先温和地说"我理解你的意思"，然后通过具体例子或换一种角度重新引导：
  例："我理解你的意思，那你能否举个具体的例子来说明？"
  例："我换个问法，如果当时的情况是XX，你会怎么处理？"
- 候选人提到关键经历、技能或项目时，必须追问具体细节（"你当时具体做了什么？""结果如何？"）
- 先自然回应一句再进入核心问题，对话要有真实交流感
- 允许在同一阶段内连续追问2-3轮，充分挖掘后再进入下一阶段
- 如果候选人回答充分且有深度，按正常进度继续下一阶段
- 只问一个问题，问题要基于候选人的个人经历展开
- 像真实面试官一样自然交流，用2到5个短句

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
  resumeText?: string,
  fallbackReport?: InterviewReport
) {
  const roleConfig = getRoleConfig(role);
  const companyCfg = getCompanyConfig(company);
  const personaCfg = getPersonaConfig(persona);
  const modeInstruction = getModeInstruction(mode || "校招", resumeText || "");

  return `
请担任${company || "航空公司"} ${roleConfig.label}岗位的民航HR面试官，根据以下真实面试记录生成一份专业面试报告。

${modeInstruction}
面试官人格：${persona || "专业型HR"}
面试官对应风格：${personaCfg.style}

撰写报告时请保持与面试官人格一致的观察视角和措辞风格。

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
    "roleFit": 0,
    "appearance": 0,
    "adaptability": 0,
    "serviceAwareness": 0
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
      appearance:
        typeof candidate.scores?.appearance === "number"
          ? candidate.scores.appearance
          : fallback.scores.appearance,
      adaptability:
        typeof candidate.scores?.adaptability === "number"
          ? candidate.scores.adaptability
          : fallback.scores.adaptability,
      serviceAwareness:
        typeof candidate.scores?.serviceAwareness === "number"
          ? candidate.scores.serviceAwareness
          : fallback.scores.serviceAwareness,
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
        buildNextQuestionPrompt(body.role, turns, body.company, body.mode, body.persona, body.resumeText)
      );

      return NextResponse.json(normalizeModelQuestion(result, fallback));
    } catch {
      return NextResponse.json(fallback);
    }
  }

  if (body.action === "report") {
    console.log('[Report Generate] turns=' + turns.length + ' role=' + body.role);
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
  }

  return NextResponse.json(
    { error: "Unsupported interview action." },
    { status: 400 }
  );
}
