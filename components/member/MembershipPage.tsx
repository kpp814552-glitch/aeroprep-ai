"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle as CheckCircleIcon,
  ChevronDown,
  Coins,
  CreditCard,
  Crown,
  Sparkles,
  X,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import LoginModal from "@/components/auth/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import {
  CREDIT_PACKS,
  PRICE_PER_INTERVIEW,
  getCredits,
  getQuotaSummary,
  submitCreditOrder,
  subscribeCredits,
  syncServerMember,
  type CreditPack,
} from "@/lib/member/member-storage";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/member/wallet";

type MyOrder = {
  id: string;
  credits: number;
  amount: number;
  status: OrderStatus;
  appliedAt: string;
  reviewedAt?: string;
  note?: string;
};

const FAQS = [
  {
    q: "面试如何计费？",
    a: `按次收费：单次 ¥${PRICE_PER_INTERVIEW}，每个账号可免费体验 1 次（与账号绑定，换设备不重置）。买 5 次 ¥9（省 ¥1）、10 次 ¥16（省 ¥4），最低 ¥1.6/次。购买的次数长期有效，用完为止。`,
  },
  {
    q: "购买后次数如何到账？",
    a: "扫码支付时请备注订单号，支付完成后点击「我已完成付款」。管理员核对到账后将次数入账，重新进入本页即可看到剩余次数。",
  },
  {
    q: "次数会过期吗？",
    a: "不会。购买的面试次数长期有效，不设有效期，随时可以开始训练。",
  },
  {
    q: "如何查看剩余次数？",
    a: "本页顶部会显示你的剩余免费次数和已购次数，每次完成面试后自动扣减一次。",
  },
  {
    q: "中途退出或刷新会扣次数吗？",
    a: "不会。只有完整做完并生成面试报告才会扣 1 次；中途退出、刷新或网络中断都不扣次数。如果面试没做完，重新进入会自动恢复到上次进度，继续答完即可。",
  },
  {
    q: "重新开始一场怎么算？",
    a: "每次完整做完并生成报告算一场，扣 1 次。主动放弃当前进度、重新开始，不会被额外扣费——只有做完的那一场计费。",
  },
  {
    q: "可以退款吗？",
    a: "面试次数为数字虚拟商品，购买后不支持退款。建议先用免费额度完整体验一次，确认合适后再购买。",
  },
];

export default function MembershipPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<CreditPack | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<"pay" | "result">("pay");
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [payError, setPayError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [quota, setQuota] = useState<{ freeLeft: number; credits: number; isMember: boolean } | null>(null);
  const [creditedBanner, setCreditedBanner] = useState<number | null>(null);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [orderCopied, setOrderCopied] = useState(false);

  useEffect(() => {
    setQuota(getQuotaSummary());
    // 收款码（管理员可在后台更换，存数据库）
    fetch("/api/site-config?key=payment_qr", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setQrSrc(typeof d?.value === "string" && d.value ? d.value : "/qr-payment.jpg"))
      .catch(() => setQrSrc("/qr-payment.jpg"));
  }, []);

  const loadMyOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/member/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMyOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch { /* 忽略网络异常 */ }
  }, []);

  const refreshQuota = () => setQuota(getQuotaSummary());

  // 次数变化（到账/扣减）即时刷新面板
  useEffect(() => {
    return subscribeCredits(() => setQuota(getQuotaSummary()));
  }, []);

  // 购买页每 10 秒快速同步一次：管理员通过后无需刷新即可到账
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const before = getCredits();
      await syncServerMember().catch(() => {});
      if (cancelled) return;
      const after = getCredits();
      if (after > before) {
        setCreditedBanner(after - before);
        setQuota(getQuotaSummary());
        window.setTimeout(() => setCreditedBanner(null), 8000);
      }
      loadMyOrders();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    tick();
    const interval = window.setInterval(tick, 10000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadMyOrders]);

  const handlePay = async (pack: CreditPack) => {
    setSelected(pack);
    // 游客可以先浏览；真正下单前引导登录 / 注册
    if (!user) {
      setShowLogin(true);
      return;
    }
    setShowPayment(true);
    setStep("pay");
    setSubmitted(false);
    setPayError("");
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "创建订单失败");
      setCurrentOrderId(data.orderId);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "创建订单失败");
    }
  };

  const handleSubmitPaid = async () => {
    if (!selected) return;
    setSubmitted(true);
    setPayError("");

    // 生成服务端订单：管理员审核通过后次数直接写入服务端钱包
    const result = await submitCreditOrder(selected.id, currentOrderId);
    if (!result.ok) {
      setSubmitted(false);
      setPayError(result.error || "提交失败，请稍后重试");
      return;
    }

    try {
      const records = JSON.parse(localStorage.getItem("aeroprep_payments") || "[]");
      records.unshift({
        orderId: currentOrderId,
        packId: selected.id,
        credits: selected.credits,
        amount: selected.price,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("aeroprep_payments", JSON.stringify(records.slice(0, 50)));
    } catch { /* ignore */ }

    loadMyOrders();
  };

  return (
    <AppFrame>
      <main className="relative z-10 min-h-dvh-safe">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[1200px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-50/40 via-sky-50/20 to-transparent blur-3xl" />
          <div className="absolute -left-60 top-1/4 h-[600px] w-[600px] rounded-full bg-sky-50/25 blur-3xl" />
          <div className="absolute -right-60 top-1/3 h-[600px] w-[600px] rounded-full bg-amber-50/25 blur-3xl" />
        </div>

        <div className="stagger-section relative mx-auto max-w-5xl px-5 pb-32 pt-12 md:px-8 md:pt-20">
          {/* ===== HERO ===== */}
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <Coins className="h-3 w-3 text-amber-500" /> 面试次数
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              按次付费，<span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">¥{PRICE_PER_INTERVIEW} / 次起</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              每个账号首次面试免费。单次 ¥{PRICE_PER_INTERVIEW}，买 5 次或 10 次有优惠（最低 ¥1.6/次），次数长期有效。
            </p>
          </div>

          {/* ===== 到账提示 ===== */}
          {creditedBanner ? (
            <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-center text-sm font-medium text-emerald-700 shadow-sm">
              🎉 {creditedBanner} 次面试已到账，可以开始训练了
            </div>
          ) : null}

          {/* ===== QUOTA STATUS ===== */}
          {quota && (
            <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-6 py-5 shadow-sm">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-slate-400">免费剩余</p>
                  <p className="mt-1 text-3xl font-bold text-slate-800">{quota.freeLeft}</p>
                </div>
                <div className="h-10 w-px bg-amber-200/70" />
                <div className="text-center">
                  <p className="text-xs text-slate-400">已购次数</p>
                  <p className="mt-1 text-3xl font-bold text-amber-600">{quota.credits}</p>
                </div>
              </div>
              {quota.isMember && (
                <p className="mt-3 flex items-center justify-center gap-1 text-xs text-emerald-600">
                  <Crown className="h-3 w-3" /> 限时会员有效期内，不限次数
                </p>
              )}
              {!quota.isMember && quota.freeLeft === 0 && quota.credits === 0 && (
                <p className="mt-3 text-center text-xs text-amber-700">
                  免费次数已用完，购买次数后即可继续面试训练
                </p>
              )}
              {/* 计费规则说明：让用户明确"什么时候会扣次数" */}
              <div className="mt-4 space-y-1 border-t border-amber-200/60 pt-3 text-[11px] leading-5 text-slate-500">
                <p>· 扣减顺序：先用免费次数，再用已购次数</p>
                <p>· <span className="font-medium text-slate-600">只有完整做完并生成报告才扣 1 次</span>；中途退出、刷新或放弃重开都不扣</p>
                <p>· 每次面试重新开始都算独立一场，完成一场扣 1 次</p>
              </div>
            </div>
          )}

          {/* ===== 我的订单 ===== */}
          {myOrders.length > 0 && (
            <div className="mx-auto mt-10 max-w-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">我的购买记录</h2>
                <span className="text-[10px] text-slate-400">审核通过后次数自动到账，本页无需刷新</span>
              </div>
              <div className="space-y-2">
                {myOrders.slice(0, 6).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700">
                        {o.credits} 次面试 · ¥{o.amount}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{o.id}</p>
                      {o.reviewedAt ? (
                        <p className="mt-0.5 text-[10px] text-slate-400">处理时间 {new Date(o.reviewedAt).toLocaleString("zh-CN")}</p>
                      ) : null}
                      {o.note ? <p className="mt-0.5 text-[10px] text-slate-400">{o.note}</p> : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] ${
                        o.status === "approved"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : o.status === "pending"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== PACK CARDS ===== */}
          <div className="stagger-section mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => {
              const isActive = selected?.id === pack.id;
              return (
                <div
                  key={pack.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(pack)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(pack);
                    }
                  }}
                  className={`group relative flex cursor-pointer flex-col rounded-2xl border px-5 py-7 text-left outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-[0.98] ${
                    isActive
                      ? "scale-[1.02] border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-[0_18px_40px_rgba(251,191,36,0.28)] ring-2 ring-amber-200/60"
                      : "border-white/60 bg-white/70 shadow-sm hover:-translate-y-1 hover:border-amber-200/70 hover:shadow-lg"
                  }`}
                >
                  {pack.recommended && !isActive && (
                    <span className="soft-pulse absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      推荐
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                      style={{ animation: "softEnter 0.32s ease both" }}
                    >
                      <CheckCircleIcon className="h-3 w-3" />
                      已选
                    </span>
                  )}

                  <p className="text-center text-base font-semibold text-slate-800">{pack.label}</p>
                  <p className="mt-4 text-center">
                    <span className="text-4xl font-bold text-slate-900">¥{pack.price}</span>
                    <span className="ml-1 text-xs text-slate-400">
                      （¥{(pack.price / pack.credits).toFixed(1).replace(/\.0$/, "")}/次）
                    </span>
                  </p>
                  {pack.save ? (
                    <p className="mt-1.5 text-center">
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-medium text-rose-600">
                        比单次购买省 ¥{pack.save}
                      </span>
                    </p>
                  ) : null}
                  <p className="mt-2 text-center text-xs text-slate-400">{pack.desc}</p>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePay(pack);
                    }}
                    className={`mt-6 w-full rounded-full px-4 py-2.5 text-xs font-medium transition ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:brightness-110"
                        : "bg-slate-900/5 text-slate-600 hover:bg-slate-900/10"
                    }`}
                  >
                    立即购买 · ¥{pack.price}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ===== FEATURE LIST ===== */}
          <div className="mx-auto mt-14 grid max-w-4xl gap-3 sm:grid-cols-2">
            {[
              "AI 模拟面试：岗位化提问 + 实时语音对话",
              "专业评分报告：七维评分 + 逐题分析",
              "面试官视角点评与个性化提升方案",
              "资料中心与 AI 优化功能永久免费",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 rounded-2xl border border-white/50 bg-white/50 px-4 py-3.5 text-sm text-slate-600">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {item}
              </div>
            ))}
          </div>

          {/* ===== FAQ ===== */}
          <div className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-center text-lg font-semibold text-slate-800">常见问题</h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/50 bg-white/60">
              {FAQS.map((faq, i) => (
                <div key={faq.q} className="border-b border-slate-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/40"
                  >
                    <span className="text-sm font-medium text-slate-700">{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden px-5 transition-all duration-200 ease-out ${
                      openFaq === i ? "max-h-96 pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"
                    }`}
                  >
                    <p className="text-xs leading-6 text-slate-500">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== PAYMENT MODAL ===== */}
        {showPayment && selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
            onClick={() => setShowPayment(false)}
          >
            <div
              className="rise-in w-full max-w-sm rounded-[24px] border border-white/40 bg-white p-6 shadow-xl backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {step === "pay" && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      <Coins className="mr-1.5 inline h-4 w-4 text-amber-500" />
                      扫码支付
                    </h2>
                    <button
                      type="button"
                      onClick={() => { setShowPayment(false); setStep("pay"); }}
                      className="rounded-full p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl bg-gradient-to-b from-amber-50 to-white px-4 py-4 text-center">
                    <p className="text-xs text-slate-400">当前购买</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{selected.label}</p>
                    <p className="mt-1 text-3xl font-bold text-amber-600">¥{selected.price}</p>
                  </div>

                  <div className="mx-auto mt-5 flex h-44 w-44 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-amber-200 bg-white">
                    {qrSrc ? (
                      <img src={qrSrc} alt="支付宝收款码" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <CreditCard className="mx-auto h-10 w-10 text-amber-400" />
                        <p className="mt-2 text-xs font-medium text-slate-600">支付宝收款码</p>
                        <p className="mt-1 text-[10px] text-slate-400">扫码支付 ¥{selected.price}</p>
                      </div>
                    )}
                  </div>

                  {/* 支付三步说明 */}
                  <ol className="mt-4 space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">
                    <li>1. 扫码支付 ¥{selected.price}（支付宝/微信）</li>
                    <li>2. 付款备注里填下面的订单号</li>
                    <li>3. 回到本页点「我已知晓」→「支付成功」提交申请</li>
                  </ol>

                  <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-center">
                    <p className="mb-1 text-sm font-semibold text-amber-700">支付时请备注以下订单号</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="font-mono text-sm font-bold tracking-wider text-amber-800">{currentOrderId || "生成中..."}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!currentOrderId) return;
                          try {
                            await navigator.clipboard.writeText(currentOrderId);
                            setOrderCopied(true);
                            window.setTimeout(() => setOrderCopied(false), 1800);
                          } catch { /* 用户拒绝剪贴板权限时忽略 */ }
                        }}
                        disabled={!currentOrderId}
                        className="rounded-full bg-white px-2.5 py-1 text-[10px] text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        {orderCopied ? "已复制" : "复制"}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] text-amber-600/80">订单号也会显示在下方「我的购买记录」里</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("result")}
                    className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:brightness-110"
                  >
                    我已知晓
                  </button>
                </>
              )}

              {step === "result" && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">支付确认</h2>
                    <button
                      type="button"
                      onClick={() => { setShowPayment(false); setStep("pay"); }}
                      className="rounded-full p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {!submitted ? (
                    <>
                      <div className="mt-6 text-center">
                        <p className="text-sm text-slate-600">请确认是否已完成支付？</p>
                        <p className="mt-1 text-xs text-slate-400">订单号：{currentOrderId}</p>
                      </div>

                      {payError && (
                        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs text-rose-600">{payError}</div>
                      )}

                      <div className="mt-6 flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setShowPayment(false); setStep("pay"); }}
                          className="flex-1 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                        >
                          支付失败
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitPaid}
                          className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:brightness-110"
                        >
                          支付成功
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 py-2 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                        <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">申请已提交</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        管理员核对到账后，{selected.credits} 次面试将自动入账
                      </p>
                      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
                        核对通常在 5 分钟内完成，最晚不超过 24 小时。<br />
                        本页「我的购买记录」会显示审核进度，到账后页面会自动提示，无需反复刷新。
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">订单号：{currentOrderId}</p>
                      <button
                        type="button"
                        onClick={() => { setShowPayment(false); setStep("pay"); setSubmitted(false); refreshQuota(); }}
                        className="mt-4 inline-flex rounded-full bg-slate-100 px-6 py-2 text-xs text-slate-600 transition hover:bg-slate-200"
                      >
                        完成
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <LoginModal
          open={showLogin}
          onClose={() => setShowLogin(false)}
          message="登录后即可购买面试次数（新账号首次面试免费）"
        />
      </main>
    </AppFrame>
  );
}
