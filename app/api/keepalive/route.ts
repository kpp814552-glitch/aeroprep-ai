import { NextResponse } from "next/server";

/**
 * Supabase 保活接口
 *
 * Supabase 免费版项目在连续 7 天无 API 活动后会被自动暂停。
 * 该接口通过定时任务（Vercel Cron）每天发起一次轻量数据库查询，
 * 保持项目活跃，避免被暂停导致全站登录/数据功能不可用。
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, reason: "supabase env not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${url}/rest/v1/announcements?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: err instanceof Error ? err.message : "unknown error",
        at: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
