import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Route Handler / Server Action 用的 Supabase 客户端。
 *
 * cookie 必须通过 next/headers 的 cookieStore 读写：Supabase 在服务端刷新
 * access token 时会对 refresh token 做轮换，只有让 Next 把新 cookie 写回响应，
 * 浏览器端才能拿到新的 refresh token。
 *
 * 旧实现把新 cookie 写在一个临时构造的 NextResponse 上，而那个 response
 * 从来没有被 return，刷新结果被静默丢弃 —— 浏览器继续使用已被轮换掉的
 * refresh token，刷新失败后就会被判定为登出（表现为接口突然返回"请先登录"）。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 中不能写 cookie：忽略即可，
            // 真正的刷新由 Route Handler 负责。
          }
        },
      },
    }
  );
}
