import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { walletBalance } from "@/lib/member/wallet";
import { loadRegistry, mutateWallet } from "@/lib/member/wallet-server";

/**
 * 扣减 1 次已购次数（服务端权威）。
 * 幂等：同一 key（面试会话 ID）重复上报只会扣一次。
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let key = "";
  try {
    const body = await request.json();
    key = body?.key ? String(body.key).slice(0, 120) : "";
  } catch { /* ignore */ }

  // 没有传 key 时生成一个请求内稳定的幂等键，保证重试不会重复扣减
  if (!key) {
    key = `auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const registryRow = await loadRegistry(supabase, user.id);
  const registry = "error" in registryRow ? undefined : registryRow.registry;

  const result = await mutateWallet(supabase, user.id, (doc) => {
    const wallet = {
      granted: doc.legacyGranted + (registry?.granted || 0),
      used: doc.used,
      left: walletBalance(doc, registry),
    };

    // 幂等：同一场面试重复上报
    if (key && doc.lastConsume?.key === key) {
      return { commit: false, value: { charged: false, duplicate: true, wallet } };
    }

    if (wallet.left <= 0) {
      return { commit: false, value: { charged: false, duplicate: false, wallet } };
    }

    doc.used += 1;
    if (key) doc.lastConsume = { key, at: new Date().toISOString() };
    const next = {
      granted: doc.legacyGranted + (registry?.granted || 0),
      used: doc.used,
      left: walletBalance(doc, registry),
    };
    return { commit: true, value: { charged: true, duplicate: false, wallet: next } };
  });

  if (!result.ok || !result.value) {
    return NextResponse.json({ error: result.error || "扣减失败" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result.value });
}
