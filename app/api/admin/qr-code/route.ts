import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/qr-code — 获取支付宝收款码（公开，无需登录）
export async function GET() {
  const supabase = await createClientInternal();
  const { data } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", "alipay_qr_code")
    .maybeSingle();

  return NextResponse.json({
    qrCode: data?.value || "",
  });
}

// POST /api/admin/qr-code — 保存支付宝收款码（仅管理员）
export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 检查管理员身份
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });
  }

  const body = await request.json();
  const qrCode = body.qrCode;

  if (typeof qrCode !== "string") {
    return NextResponse.json({ error: "qrCode 字段必填" }, { status: 400 });
  }

  // 写入 site_config
  const { error } = await supabase.from("site_config").upsert(
    {
      key: "alipay_qr_code",
      value: qrCode,
      updated_at: new Date().toISOString(),
      updated_by: user.email || user.id,
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error("[QR Code] upsert error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// 内部 helper：用于 GET（不需要 request 对象）
async function createClientInternal() {
  const { createServerClient } = await import("@supabase/ssr");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}
