import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 管理后台渲染前先把会话刷新一次，并把刷新后的 cookie 写回浏览器。
 *
 * 为什么必须在 middleware 里做：
 *  - Server Component 不能写 cookie，刷新结果会丢；
 *  - 如果交给 /api/admin/check 顺手刷新，它的 Set-Cookie 也回不到浏览器，
 *    浏览器仍拿着已被轮换掉的 refresh token，最终会被判定为登出。
 */
async function refreshSession(request: NextRequest, response: NextResponse) {
  let nextResponse = response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          nextResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            nextResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return nextResponse;
}

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
      // 先刷新会话（顺带把新 cookie 带给浏览器），再校验身份
      const response = await refreshSession(request, NextResponse.next({ request }));
      const cookieHeader = request.cookies
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
      const check = await fetch(new URL("/api/admin/check", request.nextUrl.origin), {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      });
      if (!check.ok) {
        return new NextResponse("Not Found", { status: 404 });
      }
      return response;
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
