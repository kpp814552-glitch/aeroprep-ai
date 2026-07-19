import { logApiUsage, estimateDeepSeekCost } from "@/lib/admin/usage-logger";

export async function callDeepSeek(apiKey: string, prompt: string) {
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

function parseJsonResponse(text: string) {
  try {
    const idx = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (idx === -1 || end === -1) throw new Error("No JSON found");
    return JSON.parse(text.slice(idx, end + 1));
  } catch { return null; }
}
