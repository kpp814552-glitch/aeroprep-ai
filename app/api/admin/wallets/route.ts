import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import {
  mergeOrders,
  parseRegistry,
  parseWalletDoc,
  totalGranted,
  walletBalance,
  type CreditOrder,
  type GrantRegistry,
} from "@/lib/member/wallet";
import { registryKey } from "@/lib/member/wallet-server";

export type WalletSummary = {
  userId: string;
  email: string;
  username: string;
  granted: number;
  used: number;
  left: number;
  pendingCount: number;
  isAdmin: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  orders: CreditOrder[];
};

/** 次数钱包总览（会员管理） */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { db, serviceRole, allowlistEnforced } = guard.ctx;

  const url = new URL(request.url);
  const keyword = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(500, Math.max(10, Number(url.searchParams.get("limit")) || 100));
  const onlyWithBalance = url.searchParams.get("withBalance") === "true";

  const { data, error } = await db
    .from("users")
    .select("id, email, username, pending_plan, created_at, is_admin")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: registryRows } = await db
    .from("site_config")
    .select("key, value")
    .like("key", "credits:%");

  const registryMap = new Map<string, GrantRegistry>();
  for (const row of registryRows || []) {
    registryMap.set(row.key as string, parseRegistry(row.value));
  }

  const wallets: WalletSummary[] = [];

  for (const user of data || []) {
    const doc = parseWalletDoc(user.pending_plan);
    const registry = registryMap.get(registryKey(user.id as string));
    const orders = mergeOrders(doc.orders, registry);
    const email = (user.email as string) || "";
    const username = (user.username as string) || "";

    if (keyword && !email.toLowerCase().includes(keyword) && !username.toLowerCase().includes(keyword)) {
      continue;
    }

    const hasActivity = orders.length > 0;
    if (onlyWithBalance && walletBalance(doc, registry) <= 0 && !hasActivity) continue;

    wallets.push({
      userId: user.id as string,
      email,
      username,
      granted: totalGranted(doc, registry),
      used: doc.used,
      left: walletBalance(doc, registry),
      pendingCount: orders.filter((o) => o.status === "pending").length,
      isAdmin: user.is_admin === true,
      createdAt: (user.created_at as string) || "",
      lastActivityAt: orders[0]?.appliedAt || null,
      orders: orders.slice(0, 5),
    });
  }

  wallets.sort((a, b) => {
    const at = a.lastActivityAt || a.createdAt;
    const bt = b.lastActivityAt || b.createdAt;
    return at < bt ? 1 : -1;
  });

  return NextResponse.json({
    wallets: wallets.slice(0, limit),
    total: wallets.length,
    meta: { serviceRole, allowlistEnforced, scannedUsers: (data || []).length },
  });
}
