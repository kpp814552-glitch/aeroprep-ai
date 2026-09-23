import { logApiUsage, estimateDeepSeekCost } from "@/lib/admin/usage-logger";

type DeepSeekCallOptions = {
  /**
   * 输出上限。注意：deepseek-v4-flash 是推理模型，
   * token 预算同时包含"思考过程"和"正文"，报告生成需要预留充足空间
   * （实测 6 题报告：思考约 4400 + 正文约 2400 tokens）。
   */
  maxTokens?: number;
  /** 思考强度。low 在质量与耗时之间取得平衡；none 关闭思考（最快）。 */
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** 请求超时（毫秒） */
  timeoutMs?: number;
};

export async function callDeepSeek(
  apiKey: string,
  prompt: string,
  options: DeepSeekCallOptions = {}
) {
  const {
    maxTokens = 16000,
    reasoningEffort = "low",
    timeoutMs = 110000,
  } = options;

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      max_tokens: maxTokens,
      reasoning_effort: reasoningEffort,
    }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek request failed: ${errorText}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const finishReason = choice?.finish_reason;

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

  const content = choice?.message?.content || choice?.text || "";

  // 截断是静默降级的根源，必须显式告警
  if (finishReason === "length") {
    console.error(
      `[LLM] 回复被截断 finish_reason=length（${Date.now() - startTime}ms, 正文长度=${content.length}）。请提高 max_tokens。`
    );
  }

  return parseJsonResponse(content);
}

function parseJsonResponse(text: string) {
  try {
    const idx = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (idx === -1 || end === -1) throw new Error("No JSON found");
    return JSON.parse(text.slice(idx, end + 1));
  } catch (e) {
    console.error(
      `[LLM] JSON 解析失败（正文长度=${text.length}）: ${e instanceof Error ? e.message : String(e)}`
    );
    return null;
  }
}
