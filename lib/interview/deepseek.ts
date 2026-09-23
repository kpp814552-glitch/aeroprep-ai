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
  /** 用量归类（写进 api_usage_logs.endpoint，便于后台分别统计面试 / 优化成本） */
  endpoint?: string;
};

export type DeepSeekRawResult = {
  /** 模型返回的原始正文 */
  content: string;
  /** 解析出的 JSON（失败为 null） */
  parsed: unknown | null;
  /** 是否因为 token 用尽被截断 */
  truncated: boolean;
  /** 本次真实 token 用量（接口未返回时为 null） */
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
};

/** 与 callDeepSeek 相同，但额外返回原始正文，便于调用方做兜底展示 */
export async function callDeepSeekRaw(
  apiKey: string,
  prompt: string,
  options: DeepSeekCallOptions = {}
): Promise<DeepSeekRawResult> {
  const {
    maxTokens = 16000,
    reasoningEffort = "low",
    timeoutMs = 110000,
    endpoint = "interview",
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
      endpoint,
    }).catch(() => {});
  }

  const content = choice?.message?.content || choice?.text || "";

  // 截断是静默降级的根源，必须显式告警
  if (finishReason === "length") {
    console.error(
      `[LLM] 回复被截断 finish_reason=length（${Date.now() - startTime}ms, 正文长度=${content.length}）。请提高 max_tokens。`
    );
  }

  return {
    content,
    parsed: parseJsonResponse(content),
    truncated: finishReason === "length",
    usage: usage
      ? {
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        }
      : null,
  };
}

/** 便捷版：只返回解析后的 JSON（调用方自行断言类型） */
export async function callDeepSeek<T = any>(
  apiKey: string,
  prompt: string,
  options: DeepSeekCallOptions = {}
): Promise<T | null> {
  const { parsed } = await callDeepSeekRaw(apiKey, prompt, options);
  return parsed as T | null;
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
