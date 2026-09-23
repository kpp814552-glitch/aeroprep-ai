import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径 —— 不校验登录
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/opengraph-image");

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

  // 管理后台：渲染前先向服务端确认管理员身份，非管理员直接 404
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    try {
      const check = await fetch(new URL("/api/admin/check", request.nextUrl.origin), {
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      });
      if (!check.ok) {
        return new NextResponse("Not Found", { status: 404 });
      }
    } catch {
      // 校验服务异常时按拒绝处理
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
