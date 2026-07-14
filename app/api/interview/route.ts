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
function getModeInstruction(
  mode: string,
  resumeText: string,
  resumeQuality?: { score: number; deductions: string[]; comment: string }
): string {
  const modeUpper = (mode || "校招").trim();

  // Resume section (empty if no resume)
  // Variation seed: changes every minute to ensure different questions each time
  const now = new Date();
  const variationSeed = now.getHours() * 60 + now.getMinutes();
  const focusDirections = [
    "岗位专业操作与实际经验",
    "团队配合与情景处置",
    "安全意识与规章执行",
    "职业规划与学习能力",
    "心理素质与抗压能力",
  ];
  const focusIndex = variationSeed % focusDirections.length;

  const resumeSection = resumeText?.trim()
    ? `
【📄 简历详细内容（面试官已仔细研读，以下列经历为提问参考）】
${resumeText.trim().slice(0, 4000)}

【📌 面试差异化指令】
面试轮次标识：${now.toISOString().slice(0, 16).replace("T", " ")}
为确保每次面试不雷同，本次面试请侧重以下方向：${focusDirections[focusIndex]}
面试问题类型分配建议：
- 约 4-5 题基于简历中的具体经历深入展开
- 约 2-3 题为独立情景模拟/专业知识/通识类问题（面试官自由发挥，不依赖简历）
请合理安排两种类型，确保面试全面覆盖候选人能力。`
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

  // Resume quality evaluation section
  const qualitySection = resumeQuality
    ? `\n【简历质量评估（面试官已完成审阅）】
简历评分：${resumeQuality.score}/100（60分为及格线）
${resumeQuality.deductions.length > 0 ? `扣分项：\n${resumeQuality.deductions.map((d: string) => `- ${d}`).join("\n")}` : ""}
评语：${resumeQuality.comment}

\u26a0\ufe0f 面试官指令：简历质量已计入综合评分。请遵循以下规则：
1. 如果简历评分低于60分，面试官应在面试中通过追问重点验证候选人的实际能力是否符合简历所述
2. 对简历中的扣分项（如无实习、无项目、非专业院校等）进行针对性追问
3. 面试最终总评分应综合简历质量（权重20%）和面试表现（权重80%）
4. 如果候选人简历优秀（85分以上），可在评分中适当体现
5. 如果候选人简历较差（50分以下），面试官应更加严格地评审其面试表现
`
    : "";

  return (modeInstructions[modeUpper] || modeInstructions["校招"]) + resumeSection + qualitySection;
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
  // // console.log('[LLM Request] action=' + (prompt.includes('"action":"report"') ? 'report' : prompt.includes('"action":"next"') ? 'next' : 'start') + ' prompt_length=' + prompt.length);
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    signal: controller.signal,
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

  clearTimeout(timeoutId);

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
  // // console.log('[LLM Response] elapsed=' + elapsed + 'ms content_length=' + content.length);

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

function buildFallbackStartQuestion(role: InterviewRole, company?: string) {
  const base = getRoleConfig(role).firstQuestion;
  return company ? `${company}面试官：${base}` : base;
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
你现在是一家真实航空公司的招聘面试官。请严格遵循以下【岗位能力模型】的指导，围绕岗位要求展开面试。

【岗位能力模型】（必须严格遵守）
${(() => { const r = getRoleModel(role); return `
岗位：${r.label}
核心能力权重：${r.abilities.map(a => `${a.name}${a.weight}%`).join("、")}
问题方向示例：${r.abilities.slice(0,4).map(a => `【${a.name}】${a.questionExamples[0]}`).join("\n")}
`; })()}

【问题生成优先级规则】
第一优先级（70%）：当前岗位核心能力要求——必须围绕岗位展开
第二优先级（20%）：航空公司招聘特点和文化
第三优先级（10%）：用户个人经历——仅作为辅助追问，禁止围绕用户背景展开
严禁：用户说什么就围绕什么展开。用户回答个人经历后必须回归岗位核心能力。

【航空公司画像】
${(() => { const p = getAirlineProfile(company); return `
企业定位：${p.positioning}
品牌关键词：${p.brandKeywords.join("、")}
服务理念：${p.servicePhilosophy}
面试风格：${p.interviewStyle}
重点考察能力权重：${p.keyAreas.map(a => `${a.name}${a.weight}%`).join("、")}
考察方向比例：${(p.questionDirections || []).map(d => `${d.category}${d.proportion}%`).join("、")}
面试官性格：${p.aiInterviewerPersona}
理想候选人画像：${p.idealCandidateProfile}
`; })()}

面试背景：
- 航司：${company || "航空公司"}
- 岗位：${roleConfig.label}
- 面试官人格：${persona || "成熟专业HR"}
${modeInstruction}

要求：
- 这是全新的一场面试，请严格遵循上方航空公司画像的风格
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
你现在是一家真实航空公司的招聘面试官。在追问时请严格遵循【岗位能力模型】。

【岗位能力模型】（追问必须围绕核心能力，不得偏离）
${(() => { const r = getRoleModel(role); return `
岗位：${r.label}
核心能力：${r.abilities.map(a => `${a.name}`).join("、")}
关键信息采集：${r.keyInfoToCollect.join("、")}
没有相关经历的候选人：${r.fallbackDirection}
`; })()}

【动态追问规则】
1. 用户回答后，必须先判断是否与岗位核心能力相关
2. 如果用户提到个人经历，先简短肯定，然后追问该经历如何帮助其胜任岗位
3. 如果用户回答与岗位无关，温和地将话题引回岗位核心能力
4. 严禁顺着用户个人经历深入追问，除非该经历与岗位直接相关
5. 岗位能力占追问权重的70%，用户个人信息仅占30%

【航空公司画像】
${(() => { const p = getAirlineProfile(company); return `
企业定位：${p.positioning}
品牌关键词：${p.brandKeywords.join("、")}
服务理念：${p.servicePhilosophy}
面试风格：${p.interviewStyle}
重点考察能力权重：${p.keyAreas.map(a => `${a.name}${a.weight}%`).join("、")}
高分回答特点：${p.highScoreCharacteristics.slice(0, 3).join("；")}
扣分行为：${p.deductionPoints.slice(0, 3).join("；")}
面试官性格：${p.aiInterviewerPersona}
理想候选人画像：${p.idealCandidateProfile}
`; })()}

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
你是一名拥有15年经验的民航招聘培训专家，曾参与国内大型航司乘务员、地勤、航空服务岗位招聘与培训。请根据以下面试记录，以"航空公司招聘面试官 + 民航职业培训导师"双重视角，生成一份专业的《民航求职成长报告》。

面试岗位：${roleConfig.label}
航空公司：${company || "目标航司"}
面试模式：${mode || "校招"}
面试官风格：${personaCfg.style}

${modeInstruction}
面试官人格：${persona || "专业型HR"}
面试官对应风格：${personaCfg.style}

【航空公司招聘画像】
${(() => { const p = getAirlineProfile(company); return `
企业定位：${p.positioning}
品牌关键词：${p.brandKeywords.join("、")}
服务理念：${p.servicePhilosophy}
招聘偏好：${p.recruitmentPreferences.join("；")}
高分回答特点：${p.highScoreCharacteristics.join("；")}
扣分行为：${p.deductionPoints.join("；")}
`; })()}

撰写报告时请保持与面试官人格一致的观察视角和措辞风格，并以上述航空公司招聘标准为评估依据。

【岗位评价重心】（评价必须围绕岗位核心能力展开）
${(() => { const r = getRoleModel(role); return `
岗位：${r.label}
核心评价维度权重：${(r.scoringModel || r.abilities).map(a => `${a.name}${a.weight}%`).join("、")}
评分维度：${(r.scoringModel || r.abilities).map(a => a.name).join("、")}
禁止：对非核心能力（如与岗位无关的专业背景）进行过度评价。
`; })()}

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

⚠️ 以最严苛、最犀利、不留情面的态度评分。禁止重复或相似的评价内容。

评分标准（极其严格）：
- 回答极差/沉默不语/回答过短（少于10字）：0 到 25 分
- 回答空泛、无行业深度、无具体内容：25 到 45 分
- 回答基本完整但缺乏专业深度和实操细节：45 到 60 分
- 回答有内容但不全面/有亮点但不足：60 到 72 分
- 优秀（极少给出，必须有充分理由）：72 到 80 分
- 极其优秀（几乎不给）：80 分以上

评分规则：
1. 必须结合问题与回答的匹配度、结构性、专业相关性、岗位动机来打分
2. 各维度评分超过75分必须附上极其充分的具体理由，否则默认不超过72分
3. 回答极短（少于10字）或包含无效内容（嗯、啊、我不确定等）的题目，评分不得超过25分
4. 禁止因为回答完整就给高分——必须严格审查回答质量、专业深度和行业认知
5. 每条评价和建议必须从完全不同角度出发，严禁出现任何重复或相似的评语内容
6. 不要因为其他题目答得好就影响本题评分，每道题独立评分

参考基础评分（可调整）：
${JSON.stringify(fallbackReport ?? {}, null, 2)}

请输出以下JSON结构，其中 fullReport 字段按【报告结构】要求生成完整Markdown格式报告：

{
  "scores": {
    "expressionAbility": 0,
    "logicalThinking": 0,
    "professionalKnowledge": 0,
    "roleFit": 0,
    "articulation": 0,
    "adaptability": 0,
    "serviceAwareness": 0
  },
  "totalScore": 0,
  "overallEvaluation": "面试官整体印象（3-5句）",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["不足1", "不足2", "不足3"],
  "improvementSuggestions": ["建议1（与其余建议完全不同角度）", "建议2（全新维度）", "建议3（另一个独立维度）"],
  "recommendedTraining": ["训练1", "训练2", "训练3"],
  "hiringProbability": 0,
  "narrativeSummary": "一句话总结",
  "highlights": ["亮点1", "亮点2"],
  "comprehensiveEvaluation": "一、面试综合评价：不少于300字，结合用户具体表现，说明整体印象、最大优势和最大短板",
  "perQuestionAnalysis": ["三、第1题：问题复述+优点+不足+面试官评价+优化示范（每道题必须独立分析，角度完全不同，严禁重复）", "三、第2题：与前面的题完全不同的独立分析"],
  "personalProfile": "四、个人能力画像（像职业测评报告一样列出优势项和风险点）",
  "careerMatch": "五、岗位匹配分析（分析适合空中乘务/民航空保/地勤服务/民航管理等哪些方向）",
  "improvementPlan": "六、未来提升方案（含7天快速提升计划和30天能力提升计划，每天具体可执行任务）",
  "nextPrediction": "七、下一次面试预测（保持现状的成功概率和风险，完成训练后的预计提升）",
  "growthMessage": "八、成长寄语（像航空培训老师面对学生说话，专业且有温度）",
  "competitiveLevel": "A/B/C/D",
  "competitiveScore": 0,
  "competitiveRange": "80%-90%",
  "competitiveStrengths": ["优势因素1", "优势因素2"],
  "competitiveWeaknesses": ["限制因素1", "限制因素2"],
  "interviewerPerspective": "四、如果我是航空公司面试官，我会关注...",
  "externalFactors": "五、真实录取还受到招聘人数、报考人数、学历背景、外语能力、形象条件、航空公司招聘要求、面试官主观判断等影响。",
  "trainingProjection": "六、完成30天训练后预计提升空间..."
}

【报告结构要求】
一、面试综合评价（不少于300字，结合具体回答）
二、综合能力评分（6维评分各附带评价说明）
三、面试问题逐题分析（每个问题：回答表现、优点、不足、面试官评价、优化示范）
四、个人能力画像（优势项+风险点）
五、岗位匹配分析（适合方向+原因+补足能力）
六、未来提升方案（7天计划+30天计划，具体可执行）
七、下一次面试预测（概率+风险+预计提升）
八、成长寄语（专业有温度）

注意：
- 语音识别（ASR）质量可能影响部分回答的转录完整性，术语不准确或回答偏简短可能是识别问题而非用户能力问题。
  请在 comprehensiveEvaluation 开头用一句话简要提及识别质量影响，但不在后续分析中反复批评。
- comprehensiveEvaluation 必须结合用户真实回答，不能模板化
- perQuestionAnalysis 每个元素针对一个面试问题
- 优化示范不要给标准答案，要根据用户特点优化作答方向
- 字数控制在1500-2500字
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
      articulation:
        typeof candidate.scores?.articulation === "number"
          ? candidate.scores.articulation
          : fallback.scores.articulation,
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
