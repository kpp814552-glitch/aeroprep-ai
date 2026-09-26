// ============================================================
// 服务端钱包读写（乐观锁 + 自动重试）
// ------------------------------------------------------------
// 两个存储位置各司其职（受数据库行级策略约束）：
//   users.pending_plan   用户自己的账本：已消耗次数 + 自己提交的申请
//   site_config.credits:* 管理端核发账本：累计核发 + 审核结论
// 这样管理员核发只需要写自己有权限写的 site_config，
// 用户扣减只写自己的行，两条链路都不依赖越权写入。
// ============================================================

import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyRegistry,
  parseRegistry,
  parseWalletDoc,
  serializeRegistry,
  serializeWalletDoc,
  type GrantRegistry,
  type WalletDoc,
} from "./wallet";

export const PACKS: Record<string, { credits: number; amount: number; label: string }> = {
  c1: { credits: 1, amount: 2, label: "1 次面试" },
  c5: { credits: 5, amount: 9, label: "5 次面试" },
  c10: { credits: 10, amount: 16, label: "10 次面试" },
};

export const PRICE_PER_INTERVIEW = 2;

export type WalletRow = { raw: string | null; doc: WalletDoc };
export type RegistryRow = { raw: string | null; registry: GrantRegistry };

/** 管理端核发表的 key：对用户 ID 做哈希，避免在公共可读的表里直接暴露用户 ID */
export function registryKey(userId: string): string {
  const digest = createHmac("sha256", "aeroprep-credits-v1").update(userId).digest("hex").slice(0, 24);
  return `credits:${digest}`;
}

export function makeOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AP${ts}${rand}`;
}

// ------------------------------------------------------------
// 用户账本（users.pending_plan）
// ------------------------------------------------------------

export async function loadWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<WalletRow | { error: string }> {
  const { data, error } = await supabase
    .from("users")
    .select("pending_plan")
    .eq("id", userId)
    .single();

  if (error) return { error: error.message };
  const raw = (data?.pending_plan as string | null) ?? null;
  return { raw, doc: parseWalletDoc(raw) };
}

/** 条件写入：只有 pending_plan 仍等于读到的值时才会成功 */
async function saveWallet(
  supabase: SupabaseClient,
  userId: string,
  doc: WalletDoc,
  expectedRaw: string | null,
): Promise<boolean> {
  let query = supabase
    .from("users")
    .update({ pending_plan: serializeWalletDoc(doc) })
    .eq("id", userId);

  query = expectedRaw === null ? query.is("pending_plan", null) : query.eq("pending_plan", expectedRaw);

  const { data, error } = await query.select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export type MutateOutcome<T> = {
  /** true 表示需要落库 */
  commit: boolean;
  value: T;
};

export type MutateResult<T> = {
  ok: boolean;
  value: T | null;
  error?: string;
};

/** 读-改-写用户账本，带乐观锁与重试 */
export async function mutateWallet<T>(
  supabase: SupabaseClient,
  userId: string,
  fn: (doc: WalletDoc) => MutateOutcome<T>,
  attempts = 4,
): Promise<MutateResult<T>> {
  let lastError = "写入失败，请重试";

  for (let i = 0; i < attempts; i += 1) {
    const row = await loadWallet(supabase, userId);
    if ("error" in row) {
      lastError = row.error;
      continue;
    }

    const outcome = fn(row.doc);
    if (!outcome.commit) return { ok: true, value: outcome.value };

    const saved = await saveWallet(supabase, userId, row.doc, row.raw);
    if (saved) return { ok: true, value: outcome.value };
    lastError = "数据被并发修改，已自动重试";
  }

  return { ok: false, value: null, error: lastError };
}

// ------------------------------------------------------------
// 管理端核发账本（site_config）
// ------------------------------------------------------------

export async function loadRegistry(
  db: SupabaseClient,
  userId: string,
): Promise<RegistryRow | { error: string }> {
  const { data, error } = await db
    .from("site_config")
    .select("value")
    .eq("key", registryKey(userId))
    .maybeSingle();

  if (error) return { error: error.message };
  const raw = (data?.value as string | null) ?? null;
  return { raw, registry: raw ? parseRegistry(raw) : emptyRegistry() };
}

async function saveRegistry(
  db: SupabaseClient,
  userId: string,
  registry: GrantRegistry,
  expectedRaw: string | null,
): Promise<boolean> {
  const key = registryKey(userId);
  const value = serializeRegistry(registry);
  const updated_at = new Date().toISOString();

  if (expectedRaw === null) {
    const { error } = await db.from("site_config").insert({ key, value, updated_at });
    return !error;
  }

  const { data, error } = await db
    .from("site_config")
    .update({ value, updated_at })
    .eq("key", key)
    .eq("value", expectedRaw)
    .select("key");

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

/** 读-改-写核发账本，带乐观锁与重试（仅管理员调用） */
export async function mutateRegistry<T>(
  db: SupabaseClient,
  userId: string,
  fn: (registry: GrantRegistry) => MutateOutcome<T>,
  attempts = 4,
): Promise<MutateResult<T>> {
  let lastError = "写入失败，请重试";

  for (let i = 0; i < attempts; i += 1) {
    const row = await loadRegistry(db, userId);
    if ("error" in row) {
      lastError = row.error;
      continue;
    }

    const outcome = fn(row.registry);
    if (!outcome.commit) return { ok: true, value: outcome.value };

    const saved = await saveRegistry(db, userId, row.registry, row.raw);
    if (saved) return { ok: true, value: outcome.value };
    lastError = "数据被并发修改，已自动重试";
  }

  return { ok: false, value: null, error: lastError };
}
