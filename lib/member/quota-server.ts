// ============================================================
// 服务端权威额度：和 /api/member/status 用同一套口径
// ------------------------------------------------------------
// 页面上的额度判断都在浏览器里（localStorage + 状态接口），可以绕过。
// 所有真正花钱的接口（出题、语音合成、报告）都必须先用这里的结果把关。
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_TRIAL_LIMIT, deriveUsage, totalGranted } from "./wallet";
import { loadRegistry, loadWallet } from "./wallet-server";

export type ServerQuota = {
  /** 免费额度是否还没用 */
  freeLeft: number;
  /** 已购次数剩余 */
  left: number;
  /** 限时会员（不扣次数） */
  isMember: boolean;
};

export async function loadServerQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServerQuota> {
  const [profileRes, walletRow, registryRow, interviewCount] = await Promise.all([
    supabase.from("users").select("member_until").eq("id", userId).single(),
    loadWallet(supabase, userId),
    loadRegistry(supabase, userId),
    supabase.from("interviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const doc = "error" in walletRow
    ? { v: 3 as const, used: 0, legacyGranted: 0, orders: [] }
    : walletRow.doc;
  const registry = "error" in registryRow ? undefined : registryRow.registry;

  const usage = deriveUsage(interviewCount.count || 0, doc.used);
  const granted = totalGranted(doc, registry);
  const memberUntil = (profileRes.data?.member_until as string | null) ?? null;

  return {
    freeLeft: Math.max(0, FREE_TRIAL_LIMIT - usage.freeUsed),
    left: Math.max(0, granted - usage.paidUsed),
    isMember: !!memberUntil && memberUntil > new Date().toISOString(),
  };
}

/** 是否还有任意可用额度（免费 / 已购 / 限时会员） */
export function hasQuota(quota: ServerQuota) {
  return quota.isMember || quota.freeLeft > 0 || quota.left > 0;
}
