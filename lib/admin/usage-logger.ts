import { createClient } from '@supabase/supabase-js'

type UsageLog = {
  userId?: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  characters: number
  cost: number
  endpoint: string
}

/**
 * Log API token/character usage to Supabase api_usage_logs table.
 * Uses anon key for insert (RLS allows public inserts).
 */
export async function logApiUsage(log: UsageLog) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { error } = await supabase.from('api_usage_logs').insert({
    user_id: log.userId ?? null,
    model: log.model,
    input_tokens: log.inputTokens,
    output_tokens: log.outputTokens,
    total_tokens: log.totalTokens,
    characters: log.characters,
    cost: log.cost,
    endpoint: log.endpoint,
  })

  if (error) {
    console.error('[UsageLogger] Failed to log usage:', error.message)
  }
}

/**
 * DeepSeek pricing: ¥1 per 1M input tokens, ¥2 per 1M output tokens (approx).
 * Convert to CNY as float.
 */
export function estimateDeepSeekCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 1
  const outputCost = (outputTokens / 1_000_000) * 2
  return inputCost + outputCost
}

/**
 * Volcengine TTS pricing: ~¥2 per 10K characters.
 */
export function estimateTTSCost(characters: number): number {
  return (characters / 10_000) * 2
}
