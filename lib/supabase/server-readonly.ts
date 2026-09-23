import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * 只读 Supabase 客户端（Server Component 用）。
 * 只负责"读当前登录用户"，不写 cookie —— cookie 刷新由 middleware/route handler 负责。
 */
export async function createReadonlyServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server Component 不能写 cookie，这里保持只读
        },
      },
    },
  );
}
