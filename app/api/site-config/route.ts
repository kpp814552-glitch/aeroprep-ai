import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

/** 允许通过该接口读写的配置项 */
const ALLOWED_KEYS = new Set(["payment_qr", "payment_note", "support_contact"]);
/** 可以公开读取的配置项（客服 webhook 之类的只在管理端接口读取） */
const PUBLIC_READ_KEYS = ALLOWED_KEYS;
/** 管理员可写、但不公开读取的配置项（新订单提醒 webhook） */
const ADMIN_ONLY_KEYS = new Set(["order_webhook", "order_webhook_secret"]);

/** 公开读取（收款码等需要展示给所有访客） */
export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!PUBLIC_READ_KEYS.has(key)) {
    return NextResponse.json({ error: "不支持的配置项" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_config")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    // 表不存在 / 策略异常时不要让前端报错，回传空值即可
    return NextResponse.json({ key, value: null, warning: error.message });
  }

  return NextResponse.json({ key, value: data?.value ?? null, updatedAt: data?.updated_at ?? null });
}

/** 管理员写入 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, user: admin, serviceRole } = guard.ctx;

  let body: { key?: string; value?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const key = body.key || "";
  if (!ALLOWED_KEYS.has(key) && !ADMIN_ONLY_KEYS.has(key)) {
    return NextResponse.json({ error: "不支持的配置项" }, { status: 400 });
  }
  if (typeof body.value !== "string") return NextResponse.json({ error: "缺少内容" }, { status: 400 });
  if (key === "support_contact" && body.value.length > 300) {
    return NextResponse.json({ error: "客服联系方式请控制在 300 字以内" }, { status: 400 });
  }
  if (key === "order_webhook" && body.value.length > 500) {
    return NextResponse.json({ error: "webhook 地址过长" }, { status: 400 });
  }
  if (body.value.length > 900_000) return NextResponse.json({ error: "图片过大，请压缩后再上传" }, { status: 413 });

  const { error } = await db
    .from("site_config")
    .upsert(
      {
        key,
        value: body.value,
        updated_at: new Date().toISOString(),
        updated_by: admin.email || admin.id,
      },
      { onConflict: "key" },
    );

  if (error) {
    return NextResponse.json(
      {
        error:
          "保存失败：数据库策略拒绝写入。请在 Vercel 配置 SUPABASE_SERVICE_ROLE_KEY，或为 site_config 表添加管理员写入策略（详见 lib/supabase/admin-policies.sql）。",
        detail: error.message,
        meta: { serviceRole },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, key });
}
