import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeOrders, totalGranted, walletBalance } from "@/lib/member/wallet";
import { loadRegistry, loadWallet } from "@/lib/member/wallet-server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";

  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (all) {
    // Return all members (for admin panel)
    if (!user) return NextResponse.json({ members: [] });
    const { data: adminCheck } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ members: [] });

    const { data: members } = await supabase
      .from("users")
      .select("id, email, username, member_until")
      .not("member_until", "is", null)
      .order("member_until", { ascending: false });

    return NextResponse.json({ members: members || [] });
  }

  // Normal: return current user status
  if (!user) {
    return NextResponse.json({
      isMember: false,
      grantedCredits: 0,
      wallet: { granted: 0, used: 0, left: 0 },
      orders: [],
    });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("member_until, pending_plan")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({
      isMember: false,
      grantedCredits: 0,
      wallet: { granted: 0, used: 0, left: 0 },
      orders: [],
    });
  }

  const memberUntil = profile.member_until;
  const now = new Date().toISOString();
  const isMember = !!memberUntil && memberUntil > now;

  // 服务端权威钱包 = 用户账本（已用/申请） + 管理端核发账本
  const walletRow = await loadWallet(supabase, user.id);
  const registryRow = await loadRegistry(supabase, user.id);

  const doc = "error" in walletRow ? { v: 3 as const, used: 0, legacyGranted: 0, orders: [] } : walletRow.doc;
  const registry = "error" in registryRow ? undefined : registryRow.registry;

  const wallet = {
    granted: totalGranted(doc, registry),
    used: doc.used,
    left: walletBalance(doc, registry),
    legacyGranted: doc.legacyGranted,
  };
  const orders = mergeOrders(doc.orders, registry).slice(0, 20);

  // 遗留限时会员的套餐推断
  let planId: string | null = null;
  if (isMember && memberUntil) {
    const days = Math.round((new Date(memberUntil).getTime() - Date.now()) / 86400000);
    if (days >= 27) planId = "30day";
    else if (days >= 2) planId = "3day";
    else planId = "1day";
  }

  return NextResponse.json({
    isMember,
    memberUntil: memberUntil || null,
    planId,
    // 兼容旧客户端字段：次数已改为服务端账本，不再走"领取"握手
    grantedCredits: 0,
    wallet,
    orders,
    legacyPlan: doc.legacy || null,
  });
}
