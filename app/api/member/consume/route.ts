import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deriveUsage, FREE_TRIAL_LIMIT, totalGranted } from "@/lib/member/wallet";
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

  // 已完成面试条数：与状态接口同一套推导，保证扣减口径一致
  const { count: totalInterviews } = await supabase
    .from("interviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const result = await mutateWallet(supabase, user.id, (doc) => {
    const usage = deriveUsage(totalInterviews || 0, doc.used);
    const paidFloor = Math.max(0, (totalInterviews || 0) - FREE_TRIAL_LIMIT);
    const granted = totalGranted(doc, registry);
    const wallet = {
      granted,
      used: usage.paidUsed,
      left: Math.max(0, granted - usage.paidUsed),
    };

    // 幂等：同一场面试重复上报
    if (key && doc.lastConsume?.key === key) {
      return { commit: false, value: { charged: false, duplicate: true, wallet } };
    }

    if (wallet.left <= 0) {
      return { commit: false, value: { charged: false, duplicate: false, wallet } };
    }

    // 与"已完成面试条数"对齐：
    // - 保存面试记录与扣次接口存在并发，如果记录已先落库，paidFloor 已包含本场，不能再额外 +1
    // - 如果扣次先到达，则只需把账本从当前值推进 1 次
    doc.used = paidFloor > doc.used ? paidFloor : doc.used + 1;
    if (key) doc.lastConsume = { key, at: new Date().toISOString() };
    const next = {
      granted,
      used: doc.used,
      left: Math.max(0, granted - doc.used),
    };
    return { commit: true, value: { charged: true, duplicate: false, wallet: next } };
  });

  if (!result.ok || !result.value) {
    return NextResponse.json({ error: result.error || "扣减失败" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result.value });
}
