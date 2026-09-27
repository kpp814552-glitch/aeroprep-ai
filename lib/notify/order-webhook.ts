// ============================================================
// 新订单提醒（企业微信 / 钉钉 / 飞书 群机器人）
// ------------------------------------------------------------
// 用户提交购买申请后，立刻推一条消息到管理员手机，省掉"自己盯后台"的步骤。
// 存储：优先用环境变量 ORDER_WEBHOOK_URL（最安全，不进数据库）；
// 其次用后台保存的 site_config.order_webhook。webhook 泄露最多是被人往群里
// 发消息骚扰（各平台都有 20 条/分钟限制），不涉及资金，因此可接受。
// 公开读接口 /api/site-config 不暴露这个 key，只有管理端接口能读到。
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type NotifyWebhookTarget = {
  url: string;
  source: "env" | "database";
};

/** 群里显示的文本按各平台的格式包一层 */
export function buildWebhookPayload(url: string, content: string) {
  // 飞书的字段名和其它两家不同
  if (url.includes("open.feishu.cn")) {
    return { msg_type: "text", content: { text: content } };
  }
  // 企业微信 / 钉钉 都是 msgtype + text.content
  return { msgtype: "text", text: { content } };
}

/** 发送一条群消息；失败只记日志，不影响下单主流程 */
export async function sendWebhook(url: string, content: string) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildWebhookPayload(url, content)),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.warn("[Notify] webhook 返回非 200:", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notify] webhook 发送失败:", error instanceof Error ? error.message : error);
    return false;
  }
}

/** 环境变量优先，其次取管理员在后台配置的地址 */
export async function resolveNotifyWebhook(db: SupabaseClient): Promise<NotifyWebhookTarget | null> {
  const fromEnv = process.env.ORDER_WEBHOOK_URL?.trim();
  if (fromEnv) return { url: fromEnv, source: "env" };

  try {
    const { data, error } = await db
      .from("site_config")
      .select("value")
      .eq("key", "order_webhook")
      .maybeSingle();
    if (error) return null;
    const url = (data?.value as string | null)?.trim();
    return url ? { url, source: "database" } : null;
  } catch {
    return null;
  }
}

export type NewOrderNotice = {
  orderId: string;
  packLabel: string;
  credits: number;
  amount: number;
  email: string | null;
  appliedAt: string;
};

export function formatOrderNotice(notice: NewOrderNotice) {
  const time = new Date(notice.appliedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  return [
    "【AeroPrep 新订单待审核】",
    `订单号：${notice.orderId}`,
    `套餐：${notice.packLabel}（${notice.credits} 次 / ¥${notice.amount}）`,
    `用户：${notice.email || "未知"}`,
    `时间：${time}`,
    "核对到账后到后台 →「交易与次数」→ 订单管理 点「通过」",
  ].join("\n");
}

/** 下单成功后调用（不 await，避免拖慢用户） */
export function notifyNewOrder(db: SupabaseClient, notice: NewOrderNotice) {
  void (async () => {
    const target = await resolveNotifyWebhook(db);
    if (!target) return;
    await sendWebhook(target.url, formatOrderNotice(notice));
  })();
}
