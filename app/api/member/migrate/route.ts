import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { walletBalance, type CreditOrder } from "@/lib/member/wallet";
import { loadRegistry, makeOrderId, mutateWallet } from "@/lib/member/wallet-server";

/** 单次迁移申请上限：防止有人伪造一个巨大的数字来白拿次数 */
const MAX_LEGACY_CLAIM = 10;

/**
 * 旧版遗留次数的迁移入口。
 *
 * 安全设计：不再"自己申报自己到账"。这里只登记一条 channel=legacy 的
 * **待审核申请**，最终是否到账由管理员在后台核对后核发（写入 site_config 核发账本，
 * 用户没有写权限）。因此伪造请求最多只能生成一条待审核记录，拿不到任何次数。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let credits = 0;
  try {
    const body = await request.json();
    credits = Math.floor(Number(body?.credits) || 0);
  } catch { /* ignore */ }

  if (credits <= 0) {
    return NextResponse.json({ success: true, migrated: 0, pending: false });
  }
  const claim = Math.min(credits, MAX_LEGACY_CLAIM);

  const registryRow = await loadRegistry(supabase, user.id);
  const registry = "error" in registryRow ? undefined : registryRow.registry;

  const result = await mutateWallet<{ pending: boolean; orderId?: string; left: number }>(
    supabase,
    user.id,
    (doc) => {
      const left = walletBalance(doc, registry);
      const hasHistory =
        doc.used > 0 ||
        doc.orders.length > 0 ||
        doc.legacyGranted > 0 ||
        (registry?.granted || 0) > 0;

      // 已经有账本记录（含待审核申请）就不再受理，避免重复申报
      if (hasHistory) {
        return { commit: false, value: { pending: false, left } };
      }

      const order: CreditOrder = {
        id: makeOrderId(),
        packId: "legacy",
        credits: claim,
        amount: 0,
        channel: "legacy",
        status: "pending",
        appliedAt: new Date().toISOString(),
        note: "历史遗留次数迁移申请（需管理员核对）",
      };
      doc.orders.push(order);
      return { commit: true, value: { pending: true, orderId: order.id, left } };
    },
  );

  if (!result.ok || !result.value) {
    return NextResponse.json({ error: result.error || "提交失败" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    migrated: 0,
    pending: result.value.pending,
    orderId: result.value.orderId,
    claim: result.value.pending ? claim : 0,
    left: result.value.left,
  });
}
