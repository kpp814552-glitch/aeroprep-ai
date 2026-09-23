// ============================================================
// 管理员身份判定（服务端唯一入口）
// ------------------------------------------------------------
// 背景：public.users.is_admin 是"用户自己也能改"的列（行级策略只限制到"自己的行"），
// 所以它只能作为展示用的提示，不能作为唯一凭据。
//
// 判定顺序（任一命中即为管理员）：
//   1) 账号的 user id 在 ADMIN_USER_IDS 白名单里
//      —— id 是主键且外键指向 auth.users，用户无法修改，因此不可伪造
//   2) 邮箱在 ADMIN_EMAILS 环境变量白名单里
//   3) auth.users 的 app_metadata.role === "admin"
//      —— app_metadata 只有 service_role / 控制台能写，用户在客户端改不了
//
// 三条都不命中 → 一律按普通用户处理（失败即拒绝）。
// ============================================================

import type { SupabaseClient, User } from "@supabase/supabase-js";

/** 内置管理员账号（不可伪造：id 无法被用户修改） */
const ADMIN_USER_IDS: string[] = [
  "ce39e948-a4c6-4c93-bb40-b80bb1146f91",
];

/** 环境变量里的额外白名单（逗号分隔邮箱），方便以后加人而不用改代码 */
export function adminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type IdentityLike = Pick<User, "id" | "email" | "app_metadata">;

/** 只做身份白名单判断（不查库），可安全用于渲染前的快速拦截 */
export function isAllowlistedAdmin(identity: IdentityLike | null | undefined): boolean {
  if (!identity) return false;
  if ((identity.app_metadata as Record<string, unknown> | undefined)?.role === "admin") return true;
  if (ADMIN_USER_IDS.includes(identity.id)) return true;
  const email = (identity.email || "").toLowerCase();
  return email.length > 0 && adminEmailAllowlist().includes(email);
}

/**
 * 完整判定：身份白名单 + 数据库 is_admin 兜底。
 * 结果是"白名单即可"，这样即使 is_admin 被误清空，真正的管理员也不会被锁在外面。
 */
export async function isPlatformAdmin(
  session: SupabaseClient,
  identity: IdentityLike | null | undefined,
): Promise<boolean> {
  if (!identity) return false;
  if (isAllowlistedAdmin(identity)) return true;

  // 兜底：数据库标记为管理员，且邮箱/ID 在白名单里才算（防止自提权）
  const { data } = await session.from("users").select("is_admin").eq("id", identity.id).single();
  return data?.is_admin === true && adminEmailAllowlist().length > 0 &&
    adminEmailAllowlist().includes((identity.email || "").toLowerCase());
}
