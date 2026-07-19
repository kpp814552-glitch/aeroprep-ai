import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径 —— 不校验登录
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  // API 路由 —— 由各 route handler 自己校验
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // 检查是否有 Supabase auth cookie（无需 import @supabase/ssr，避免 Edge 运行时崩溃）
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith("sb-"));
  if (!hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
