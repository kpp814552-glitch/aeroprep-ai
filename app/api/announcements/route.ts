import { NextRequest, NextResponse } from "next/server";
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
  return NextResponse.json({ announcements: data || [] });
}
