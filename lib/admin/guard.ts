// ============================================================
// 管理端接口守卫
// ------------------------------------------------------------
// 1) 用带用户会话的客户端校验身份（必须是 is_admin）
// 2) 数据读写优先使用 service_role 客户端（绕开 RLS，跨用户稳定可用）
//    未配置时退回会话客户端，此时依赖数据库行级策略
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { adminEmailAllowlist, isPlatformAdmin } from "@/lib/admin/auth";

export type AdminContext = {
  /** 带用户会话的客户端（身份校验用） */
  session: SupabaseClient;
  /** 数据读写客户端（service role 优先） */
  db: SupabaseClient;
  user: { id: string; email: string | null };
  /** 是否启用了 service_role（false 时跨用户操作依赖 RLS 策略） */
  serviceRole: boolean;
  /** 是否配置了 ADMIN_EMAILS 白名单（未配置时存在"自提权"风险） */
  allowlistEnforced: boolean;
};

export type AdminGuardResult =
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: NextResponse };

export async function requireAdmin(request: NextRequest): Promise<AdminGuardResult> {
  const session = (await createClient()) as unknown as SupabaseClient;

  const { data: { user } } = await session.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  }

  // 管理员身份必须来自不可伪造的白名单（user id / 邮箱 / app_metadata），
  // 不能只信 users.is_admin —— 那一列用户自己也能改。
  if (!(await isPlatformAdmin(session, user))) {
    return { ok: false, response: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }

  const serviceRole = hasServiceRole();
  const db = serviceRole ? (createAdminClient() as unknown as SupabaseClient) : session;

  return {
    ok: true,
    ctx: {
      session,
      db,
      user: { id: user.id, email: user.email ?? null },
      serviceRole,
      allowlistEnforced: adminEmailAllowlist().length > 0,
    },
  };
}
