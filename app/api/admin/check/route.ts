import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";

/**
 * 轻量校验：当前会话是否具备管理后台权限。
 * 供 middleware 在渲染 /admin 之前调用（拿不到权限就直接 404，连页面壳都不下发）。
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  return NextResponse.json({ admin: true });
}
