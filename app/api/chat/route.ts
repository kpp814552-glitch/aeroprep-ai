import { NextResponse } from "next/server";
import { logApiUsage, estimateDeepSeekCost } from "@/lib/admin/usage-logger";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProfessionalMode =
  | "flight-technology"
  | "aviation-meteorology"
  | "flight-management"
  | "air-traffic-control"
  | "aircraft-systems"
  | "general";

type Language = "zh-CN" | "en" | "ja" | "ko";

type ChatRequestBody = {
  messages: Message[];
  webSearch?: boolean;
  professionalMode?: ProfessionalMode;
  examMode?: boolean;
  language?: Language;
};

const professionalModePrompts: Record<ProfessionalMode, string> = {
  "flight-technology":
    "当前专业模式：飞行技术。重点回答飞行原理、飞行性能、飞行程序、飞行训练、机组决策和运行安全相关问题。",
  "aviation-meteorology":
    "当前专业模式：航空气象。重点回答天气图、METAR/TAF、危险天气、能见度、云、风切变、结冰、雷暴和气象决策相关问题。",
  "flight-management":
    "当前专业模式：飞行运行管理。重点回答航班运行控制、签派放行、运行规章、风险评估、运行标准和航司运行流程相关问题。",
  "air-traffic-control":
    "当前专业模式：空中交通管制。重点回答管制程序、间隔标准、陆空通话、空域运行、流量管理和应急处置相关问题。",
  "aircraft-systems":
    "当前专业模式：飞机系统。重点回答机体、动力装置、液压、电气、燃油、环控、航电、起落架和维护排故相关问题。",
  general:
    "当前专业模式：通用民航。综合回答民航学习、考试复习、面试准备、航校流程和职业发展相关问题。",
};

const languagePrompts: Record<Language, string> = {
  "zh-CN": "Always answer in Simplified Chinese.",
  en: "Always answer in English.",
  ja: "Always answer in Japanese.",
  ko: "Always answer in Korean.",
};

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return (
    (message.role === "system" ||
      message.role === "user" ||
      message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function isProfessionalMode(value: unknown): value is ProfessionalMode {
  return (
    value === "flight-technology" ||
    value === "aviation-meteorology" ||
    value === "flight-management" ||
    value === "air-traffic-control" ||
    value === "aircraft-systems" ||
    value === "general"
  );
}

function isLanguage(value: unknown): value is Language {
  return value === "zh-CN" || value === "en" || value === "ja" || value === "ko";
}

function buildSystemPrompt(
  professionalMode: ProfessionalMode,
  examMode: boolean,
  language: Language
) {
  return `
你是 AeroPrep AI 民航智能助手，专注中国民航领域。回答必须专业、准确、条理清晰，始终基于中国民航法规（CCAR）体系和行业实践。

你是一名资深民航培训讲师，具备航空公司运行管理和教学经验。

核心知识领域：
- CCAR-61/66/91/121/135 等民航法规体系
- 飞行技术与机组资源管理（CRM）
- 机务维修与适航管理
- 飞机系统（动力、液压、电气、航电）
- 飞行运行控制与签派放行
- 空中交通管制程序与标准
- 航空气象分析与决策
- 民航英语与陆空通话
- 航空公司面试流程与技巧
- 民航安全管理体系（SMS）

${professionalModePrompts[professionalMode]}

${examMode
  ? `考试模式：已开启。回答时优先按考试复习方式组织内容，包括考点、易错点、记忆提示、典型题型和简短答案模板。`
  : `考试模式：未开启。回答时优先提供实用、清晰、面向理解的专业解释。`
}

语言要求：
${languagePrompts[language]}

联网搜索注意：如果用户问题涉及最新政策、时事新闻或实时数据，你可以结合联网搜索结果为用户提供更准确的回答。

要求：

1. 回答结构：先给出核心结论，再分点说明依据和细节，最后补充延伸信息（如有）。
2. 语言风格：专业、简洁、条理清晰，避免冗余铺垫。使用民航行业术语，但对关键术语给出简短解释。
3. 引用规范：涉及法规、标准、数据时注明出处（如 CCAR-91 部第 X 条、ICAO 附件等）。
4. 不确定处理：当不确定或信息可能存在时效性时，明确说明"建议查阅最新官方文件确认"。
5. 对于面试相关问题，从面试官视角出发，分析考察意图并提供答题策略。
6. 涉及实操或程序性问题时，区分"法规要求"与"实际操作"的差异。
7. 回答长度适中：简单问题 3-5 个要点，复杂问题 5-8 个要点。
`;
}

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing DeepSeek API key in DEEPSEEK_API_KEY" },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (
    !body?.messages ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    !body.messages.every(isMessage)
  ) {
    return NextResponse.json(
      { error: "Request body must include a valid non-empty messages array." },
      { status: 400 }
    );
  }

  const professionalMode = isProfessionalMode(body.professionalMode)
    ? body.professionalMode
    : "general";
  const webSearch = body.webSearch === true;
  const examMode = body.examMode === true;
  const language = isLanguage(body.language) ? body.language : "zh-CN";
  const conversationMessages = body.messages.filter(
    (message) => message.role !== "system"
  );


  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
 model: "deepseek-v4-flash",
  enable_search: webSearch,

  messages: [
      {
        role: "system",
        content: buildSystemPrompt(professionalMode, examMode, language)
      },

    ...conversationMessages
  ],

  temperature: 0.3,
  max_tokens: 1200,
}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `DeepSeek request failed: ${errorText}` },
      { status: 502 }
    );
  }

  const data = await response.json();
  const assistantContent =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    "DeepSeek 未返回有效回答。";

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
      endpoint: 'chat',
    }).catch(() => {});
  }

  return NextResponse.json({ assistant: assistantContent, raw: data });
}
