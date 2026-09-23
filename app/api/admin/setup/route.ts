import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowlistedAdmin } from "@/lib/admin/auth";

/**
 * 初始化管理员标记（补写 users.is_admin 用）。
 *
 * 安全约束：只有"身份白名单内的账号"（内置管理员 user id / ADMIN_EMAILS 邮箱 /
 * app_metadata.role=admin）才能调用。普通登录用户调用会直接 403，
 * 杜绝"任何登录用户一键把自己变成管理员"。
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!isAllowlistedAdmin(user)) {
    return NextResponse.json(
      { error: "该账号不在管理员白名单内，无法开通后台权限。" },
      { status: 403 },
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_admin) {
    return NextResponse.json({ message: "已经是管理员了" });
  }

  const { error } = await supabase
    .from("users")
    .update({ is_admin: true })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "设置成功，请刷新页面" });
}
