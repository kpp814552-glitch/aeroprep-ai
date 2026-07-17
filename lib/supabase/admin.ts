import { createClient } from "@supabase/supabase-js";

let _adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Creates a Supabase admin client using the service_role key.
 * Bypasses RLS — only use in trusted server contexts (admin API routes).
 * The client is cached after first creation for better performance.
 */
export function createAdminClient() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("[supabase/admin] Missing SUPABASE_SERVICE_ROLE_KEY, falling back to anon key");
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
