import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { walletBalance, type CreditOrder } from "@/lib/member/wallet";
import { loadRegistry, mutateWallet } from "@/lib/member/wallet-server";

/**
 * 一次性迁移：把旧版存在浏览器里的剩余次数登记到服务端（用户自己那一侧）。
 * 仅在服务端完全没有任何记录时生效，避免重复迁移。
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let credits = 0;
  try {
    const body = await request.json();
    credits = Math.floor(Number(body?.credits) || 0);
  } catch { /* ignore */ }

  if (credits <= 0 || credits > 1000) {
    return NextResponse.json({ success: true, migrated: 0 });
  }

  const registryRow = await loadRegistry(supabase, user.id);
  const registry = "error" in registryRow ? undefined : registryRow.registry;

  const result = await mutateWallet<{ migrated: number; left: number }>(supabase, user.id, (doc) => {
    const hasLedger =
      doc.legacyGranted > 0 ||
      doc.used > 0 ||
      doc.orders.length > 0 ||
      (registry?.granted || 0) > 0;
    if (hasLedger) {
      return { commit: false, value: { migrated: 0, left: walletBalance(doc, registry) } };
    }

    const order: CreditOrder = {
      id: `MIG${Date.now().toString(36).toUpperCase()}`,
      packId: "legacy",
      credits,
      amount: 0,
      channel: "legacy",
      status: "approved",
      appliedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      note: "历史本地次数迁移到服务端",
    };
    doc.legacyGranted = credits;
    doc.orders.push(order);
    return { commit: true, value: { migrated: credits, left: walletBalance(doc, registry) } };
  });

  if (!result.ok || !result.value) {
    return NextResponse.json({ error: result.error || "迁移失败" }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...result.value });
}
