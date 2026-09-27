import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { formatOrderNotice, resolveNotifyWebhook, sendWebhook } from "@/lib/notify/order-webhook";

/**
 * 新订单提醒设置（仅管理员）
 * GET  ：查看当前地址（环境变量优先）
 * POST ：保存地址；body.test = true 时发送一条测试消息
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const target = await resolveNotifyWebhook(guard.ctx.db);
  return NextResponse.json({
    configured: Boolean(target),
    source: target?.source ?? null,
    url: target?.url ?? "",
    envOverride: Boolean(process.env.ORDER_WEBHOOK_URL?.trim()),
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, user: admin, serviceRole } = guard.ctx;

  let body: { url?: string; test?: boolean } = {};
  try {
    body = await request.json();
  } catch { /* ignore */ }

  if (body.test) {
    const target = await resolveNotifyWebhook(db);
    if (!target) {
      return NextResponse.json({ error: "还没有配置提醒地址" }, { status: 400 });
    }
    const ok = await sendWebhook(
      target.url,
      formatOrderNotice({
        orderId: "AP-TEST-0001",
        packLabel: "10 次面试",
        credits: 10,
        amount: 16,
        email: "test@example.com",
        appliedAt: new Date().toISOString(),
      }),
    );
    return ok
      ? NextResponse.json({ success: true })
      : NextResponse.json(
          { error: "发送失败，请确认地址是企业微信/钉钉/飞书群机器人的 Webhook" },
          { status: 502 },
        );
  }

  if (typeof body.url !== "string") {
    return NextResponse.json({ error: "缺少地址" }, { status: 400 });
  }
  const url = body.url.trim();
  // 允许 https，以及本地调试用的 http://localhost / 127.0.0.1
  const isLocalHttp = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url);
  // 也允许直接粘贴 PushPlus 的 token（纯字母数字串）
  const isToken = /^[A-Za-z0-9_-]{16,64}$/.test(url);
  if (url && !isLocalHttp && !isToken && !/^https:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "请填写 Webhook 地址（https:// 开头），或直接粘贴 PushPlus 的 token" },
      { status: 400 },
    );
  }
  if (url.length > 500) {
    return NextResponse.json({ error: "地址过长" }, { status: 400 });
  }

  const { error } = await db.from("site_config").upsert(
    {
      key: "order_webhook",
      value: url,
      updated_at: new Date().toISOString(),
      updated_by: admin.email || admin.id,
    },
    { onConflict: "key" },
  );

  if (error) {
    return NextResponse.json(
      {
        error: "保存失败：数据库策略拒绝写入（详见 lib/supabase/admin-policies.sql）",
        detail: error.message,
        meta: { serviceRole },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, configured: Boolean(url) });
}
