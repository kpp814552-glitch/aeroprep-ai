import { createClient } from "@supabase/supabase-js";

let _adminClient: ReturnType<typeof createClient> | null = null;

/**
 * 判断当前环境是否配置了可用的 service_role key。
 * 常见的坑：key 被填成 anon key / 占位文本，这里做一次 JWT 角色校验。
 */
export function hasServiceRole(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) return false;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/**
 * Creates a Supabase admin client using the service_role key.
 * Bypasses RLS — only use in trusted server contexts (admin API routes).
 * The client is cached after first creation for better performance.
 */
export function createAdminClient() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || !hasServiceRole()) {
    console.warn("[supabase/admin] Missing or invalid SUPABASE_SERVICE_ROLE_KEY, falling back to anon key");
    // Fallback to anon key client (no RLS bypass, but no SSR cookie overhead)
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  } else {
    _adminClient = createClient(url, key);
  }
  
  return _adminClient;
}
