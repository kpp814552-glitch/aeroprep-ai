"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle as CheckCircleIcon,
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
  INTRO_CREDIT_PACK,
  PRICE_PER_INTERVIEW,
  getCredits,
  getQuotaSummary,
  submitCreditOrder,
  subscribeCredits,
  syncServerMember,
  type CreditPack,
} from "@/lib/member/member-storage";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/member/wallet";

const FIVE_PACK = CREDIT_PACKS.find((pack) => pack.id === "c5");
const TEN_PACK = CREDIT_PACKS.find((pack) => pack.id === "c10");

type MyOrder = {
  id: string;
  credits: number;
  amount: number;
  status: OrderStatus;
  appliedAt: string;
  reviewedAt?: string;
  note?: string;
};

export default function MembershipPage() {
  const { user } = useAuth();
  // 从面试页因"次数不足"跳过来时，给一句明确的原因提示
  const searchParams = useSearchParams();
  const quotaNotice = searchParams.get("reason") === "quota";
  const [selected, setSelected] = useState<CreditPack | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<"pay" | "result">("pay");
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [supportContact, setSupportContact] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [payError, setPayError] = useState("");
  const [quota, setQuota] = useState<{ freeLeft: number; credits: number; isMember: boolean } | null>(null);
  const [creditedBanner, setCreditedBanner] = useState<number | null>(null);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [introEligible, setIntroEligible] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);

  useEffect(() => {
    const quotaSync = window.setTimeout(() => setQuota(getQuotaSummary()), 0);
    // 收款码（管理员可在后台更换，存数据库）
    fetch("/api/site-config?key=payment_qr", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setQrSrc(typeof d?.value === "string" && d.value ? d.value : "/qr-payment.jpg"))
      .catch(() => setQrSrc("/qr-payment.jpg"));
    // 客服联系方式（管理员后台设置；没设置就不显示）
    fetch("/api/site-config?key=support_contact", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSupportContact(typeof d?.value === "string" ? d.value.trim() : ""))
      .catch(() => setSupportContact(""));
    return () => window.clearTimeout(quotaSync);
  }, []);

  const loadMyOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/member/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMyOrders(Array.isArray(data.orders) ? data.orders : []);
      setIntroEligible(Boolean(data.firstOrderEligible));
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
    setCurrentOrderId("");
    setOrderCopied(false);
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

    if (selected.id === INTRO_CREDIT_PACK.id) {
      setIntroEligible(false);
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

  const showIntroOffer = !user || introEligible;

  return (
    <AppFrame>
      <main className="relative z-10 min-h-dvh-safe">
        <div className="stagger-section relative mx-auto max-w-5xl px-5 pb-32 pt-12 md:px-8 md:pt-20">
          {/* ===== HERO ===== */}
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <Coins className="h-3 w-3 text-amber-500" /> 面试次数
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              首单 <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">¥{INTRO_CREDIT_PACK.price}</span>
              ，正式价 ¥{PRICE_PER_INTERVIEW} / 次
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              每个账号首次面试免费。首单可 ¥{INTRO_CREDIT_PACK.price} 体验 1 次（仅限一次）；正式价单次 ¥{PRICE_PER_INTERVIEW}，
              5 次 ¥{FIVE_PACK?.price ?? 9.9}、10 次 ¥{TEN_PACK?.price ?? 16.9} 更划算，次数长期有效。
            </p>
          </div>

          {/* ===== 到账提示 ===== */}
          {quotaNotice ? (
            <div className="mx-auto mt-6 flex max-w-lg items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-700 shadow-sm">
              <span className="mt-0.5">⚠️</span>
              <span>
                <strong className="font-semibold">面试次数已用完</strong>，购买后即可继续模拟面试。
                <span className="mt-1 block text-xs text-rose-500">
                  每个账号第 1 次面试免费；已完成并生成报告才扣次数，中途退出不扣。
                </span>
              </span>
            </div>
          ) : null}

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

          {/* ===== 首单体验 ===== */}
          {showIntroOffer ? (
            <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-[24px] border border-amber-200/70 bg-[linear-gradient(120deg,rgba(255,251,235,0.96),rgba(255,247,237,0.72))] px-5 py-5 shadow-[0_18px_46px_rgba(245,158,11,0.10)] md:px-7">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">新用户首单体验</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {user
                        ? "当前账号符合首单资格，支付 ¥1 即可获得 1 次完整 AI 面试。"
                        : "登录后即可享受首单 ¥1 体验完整 AI 面试，每个账号仅限一次。"}
                    </p>
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center justify-between gap-4 md:w-auto">
                  <p className="text-3xl font-bold text-amber-600">¥{INTRO_CREDIT_PACK.price}</p>
                  <button
                    type="button"
                    onClick={() => handlePay(INTRO_CREDIT_PACK)}
                    className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-medium text-white shadow-sm transition hover:brightness-110"
                  >
                    {user ? "首单体验" : "登录后领取"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

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
                  className={`group relative flex h-full cursor-pointer flex-col rounded-2xl border px-5 py-7 text-left outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-[0.98] ${
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
                  <div className="mt-5 text-center">
                    <p className="text-4xl font-bold text-slate-900">¥{pack.price}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {pack.credits === 1
                        ? `¥${pack.price} / 次`
                        : `折合 ¥${(pack.price / pack.credits).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} / 次`}
                    </p>
                  </div>

                  <div className="mt-3 flex min-h-6 items-center justify-center">
                    {pack.save ? (
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-600">
                        比单次购买省 ¥{pack.save}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                        按次购买
                      </span>
                    )}
                  </div>

                  <p className="mt-2 flex min-h-10 items-start justify-center text-center text-xs leading-5 text-slate-400">
                    {pack.desc}
                  </p>

                  <div className="mt-auto pt-6">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePay(pack);
                      }}
                      className={`w-full rounded-full px-4 py-2.5 text-xs font-medium transition ${
                        isActive
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:brightness-110"
                          : "bg-slate-900/5 text-slate-600 hover:bg-slate-900/10"
                      }`}
                    >
                      立即购买 · ¥{pack.price}
                    </button>
                  </div>
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
                      <div
                        role="img"
                        aria-label="支付宝收款码"
                        className="h-full w-full bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${JSON.stringify(qrSrc)})` }}
                      />
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

                  {payError ? (
                    <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs text-rose-600">
                      {payError}
                    </div>
                  ) : null}

                  {supportContact ? (
                    <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                      支付遇到问题？联系客服
                      <span className="ml-1 font-medium text-slate-600">{supportContact}</span>
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setStep("result")}
                    disabled={!currentOrderId || Boolean(payError)}
                    className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
                  >
                    {payError ? "订单生成失败" : "我已知晓"}
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
