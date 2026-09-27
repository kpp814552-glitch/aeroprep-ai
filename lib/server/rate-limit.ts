// ============================================================
// 轻量限流（按用户 + 接口做的滑动窗口）
// ------------------------------------------------------------
// 目的：挡住"一个账号脚本狂刷付费接口"这种最朴素也最常见的滥用，
// 避免 DeepSeek / 火山 TTS 的额度被刷爆。
//
// 说明：计数放在服务端进程内存里，适合单实例与突发流量兜底；
// 如果以后要做跨实例的精确限流，把这里换成 Redis / 数据库计数即可，
// 调用方不需要改。
// ============================================================

type Store = Map<string, number[]>;

const globalStore = globalThis as unknown as { __aeroprepRateLimitStore?: Store };
const store: Store = (globalStore.__aeroprepRateLimitStore ??= new Map());

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((at) => now - at < windowMs);

  if (hits.length >= limit) {
    store.set(key, hits);
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  hits.push(now);
  store.set(key, hits);

  // 顺手清理过期记录，避免长期运行把内存撑大
  if (store.size > 2000) {
    for (const [k, times] of store) {
      if (!times.length || now - times[times.length - 1] > windowMs) store.delete(k);
    }
  }

  return { ok: true, remaining: limit - hits.length };
}
