import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("announcements")
    .select("title, content, type, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json(
    { announcements: data || [] },
    {
      // 公告更新频率低：CDN 缓存 60 秒，过期后 5 分钟内先用旧值后台刷新
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
