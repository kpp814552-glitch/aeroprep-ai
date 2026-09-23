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

  // 其余页面一律允许"游客预览"：内容可以看，具体操作由页面内的登录弹窗拦截
  // （历史上这里会把未登录用户直接踢回首页，导致连页面长什么样都看不到）

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
