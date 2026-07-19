"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Crown, Sparkles, Clock, CreditCard, X, CheckCircle as CheckCircleIcon, Brain, BookOpen, BarChart3, Infinity, Star, Zap, ChevronDown, Shield } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { PLANS, activateMember, type PlanId } from "@/lib/member/member-storage";

const FAQS = [
  { q: "购买会员后如何生效？", a: "完成支付后系统自动激活会员权限，无需额外操作。可在个人中心查看会员到期时间。" },
  { q: "会员到期后数据会丢失吗？", a: "不会。面试记录、学习收藏、优化历史等数据永久保存。续费后即可恢复全部功能。" },
  { q: "免费用户可以使用哪些功能？", a: "永久开放【资料中心】和【AI优化】。AI面试可免费试用3次，但不生成面试报告。" },
  { q: "会员时长如何计算？", a: "从支付成功激活那一刻起计算，按自然天（24小时为1天），不是按自然日。" },
];

export default function MembershipPage() {
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<"pay"|"result">("pay");
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [payError, setPayError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();
  // Hardcoded QR code image
  useEffect(() => {
    setQrSrc("/qr-payment.jpg");
  }, []);

  const handlePay = async (planId: PlanId) => {
    setSelected(planId);
    setShowPayment(true);
    setPayError("");
    try {
      const plan = PLANS.find((p) => p.id === planId);
      const res = await fetch("/api/payment/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, amount: plan?.priceNum }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "创建订单失败");
      setCurrentOrderId(data.orderId);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "创建订单失败");
    }
  };

;

  const selectedPlan = PLANS.find((p) => p.id === selected);

  return (
    <AppFrame>
      <main className="relative z-10 min-h-screen">
        {/* Single continuous background */}
        <div className="pointer-events-none fixed inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[1200px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-50/40 via-sky-50/20 to-transparent blur-3xl" />
          <div className="absolute -left-60 top-1/4 h-[600px] w-[600px] rounded-full bg-sky-50/25 blur-3xl" />
          <div className="absolute -right-60 top-1/3 h-[600px] w-[600px] rounded-full bg-amber-50/25 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-5 pb-32 pt-12 md:px-8 md:pt-20">
          
          {/* ===== HERO ===== */}
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <Crown className="h-3 w-3 text-amber-500" />会 员
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              选择你的<span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">会员计划</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              免费用户永久使用<strong>资料中心</strong>和<strong>AI优化</strong>。
              AI面试可免费体验3次。升级会员解锁全部功能。
            </p>
          </div>

          {/* ===== PLAN CARDS ===== */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isActive = selected === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelected(plan.id)}
                  className={`group relative flex flex-col rounded-2xl border px-5 py-7 text-left transition-all duration-300 active:scale-[0.98] ${
                    isActive
                      ? "border-amber-300 bg-white shadow-xl ring-2 ring-amber-200/50"
                      : plan.recommended
                      ? "border-amber-200/60 bg-white shadow-md hover:shadow-lg"
                      : "border-white/80 bg-white/60 shadow-sm hover:shadow-md"
                  }`}
                >
                  {plan.recommended && !isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1 text-[10px] font-semibold text-white shadow-md flex items-center gap-1 whitespace-nowrap">
                      <Sparkles className="h-3 w-3" />学生优选
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-[10px] font-semibold text-white shadow-md whitespace-nowrap">
                      已选择
                    </div>
                  )}
                  {isActive && <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-gradient-to-b from-amber-400 to-orange-500" />}

                  <div className="relative z-10 flex flex-1 flex-col">
                    <p className={`text-center text-base font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}>{plan.label}</p>
                    <div className="mt-4 text-center">
                      <span className="text-4xl font-bold text-slate-900">¥{plan.price.replace("元", "")}</span>
                      <span className="ml-1 text-sm text-slate-400">
                        {plan.id === "30day" ? "/月" : plan.id === "1day" ? "/天" : "/3天"}
                      </span>
                    </div>
                    <p className="mt-1 text-center text-xs text-slate-400">{plan.desc}</p>
                    <div className="my-5 border-t border-dashed border-white/60" />
                    <div className="flex-1 space-y-3">
                      {(plan.id === "1day" ? [
                        [Infinity, "24小时无限AI面试"],
                        [BarChart3, "完整面试评分报告"],
                        [BookOpen, "全部岗位题库"],
                        [Star, "全站功能无限制"],
                      ] : plan.id === "3day" ? [
                        [Infinity, "72小时无限AI面试"],
                        [BarChart3, "完整面试复盘报告"],
                        [BookOpen, "全部岗位题库"],
                        [Star, "全站功能解锁"],
                        [Shield, "优先体验新功能"],
                      ] : [
                        [Infinity, "30天无限AI模拟面试"],
                        [BarChart3, "专业面试评分报告"],
                        [BookOpen, "持续更新面试题库"],
                        [Star, "全部功能全开"],
                        [Shield, "优先体验新功能"],
                        [Zap, "会员专属标识"],
                      ]).map(([Icon, text]) => (
                        <div key={String(text)} className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                            <Icon className="h-3 w-3 text-emerald-600" />
                          </div>
                          <span className="text-xs text-slate-600">{String(text)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handlePay(plan.id); }}
                      className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                        isActive || plan.recommended
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:brightness-110"
                          : "border border-slate-200/60 bg-white/80 text-slate-700 hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      <Crown className="h-4 w-4" />
                      立即开通 · {plan.price}
                    </button>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ===== Review Notice ===== */}
          <div className="mx-auto mt-8 max-w-md text-center">
            <p className="text-[11px] leading-5 text-slate-400">
              💳 付款后人工审核预计 5 分钟 ~ 2 小时 · 审核人员在线时间 8:00 – 23:00
            </p>
          </div>

          {/* ===== FOOTER ===== */}
          <div className="mx-auto mt-16 max-w-lg text-center">
            <Crown className="mx-auto h-7 w-7 text-amber-400" />
            <p className="mt-3 text-sm text-slate-500">选择上方套餐，立即解锁全部功能</p>
          </div>
        </div>

        {/* ===== PAYMENT MODAL ===== */}
        {showPayment && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm" onClick={() => setShowPayment(false)}>
            <div className="w-full max-w-sm rounded-[24px] border border-white/40 bg-white p-6 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
              
              {/* Step 1: Pay instruction */}
              {step === "pay" && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      <Crown className="mr-1.5 inline h-4 w-4 text-amber-500" />扫码支付
                    </h2>
                    <button type="button" onClick={() => { setShowPayment(false); setStep("pay"); }} className="rounded-full p-1 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl bg-gradient-to-b from-amber-50 to-white px-4 py-4 text-center">
                    <p className="text-xs text-slate-400">当前套餐</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{selectedPlan.label}</p>
                    <p className="mt-1 text-3xl font-bold text-amber-600">¥{selectedPlan.price.replace("元", "")}</p>
                  </div>

                  {/* QR Code */}
                  <div className="mx-auto mt-5 flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-white overflow-hidden">
                    {qrSrc ? (
                      <img src={qrSrc} alt="支付宝收款码" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <CreditCard className="mx-auto h-10 w-10 text-amber-400" />
                        <p className="mt-2 text-xs font-medium text-slate-600">支付宝收款码</p>
                        <p className="mt-1 text-[10px] text-slate-400">扫码支付 ¥{selectedPlan.price.replace("元", "")}</p>
                      </div>
                    )}
                  </div>

                  {/* Order number + note */}
                  <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-amber-700 mb-1">⚠️ 支付时请备注以下订单号</p>
                    <p className="text-sm font-mono font-bold text-amber-800 tracking-wider">{currentOrderId}</p>
                  </div>

                  <button type="button" onClick={() => setStep("result")}
                    className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:brightness-110">
                    我已知晓
                  </button>
                </>
              )}

              {/* Step 2: Result */}
              {step === "result" && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">支付确认</h2>
                    <button type="button" onClick={() => { setShowPayment(false); setStep("pay"); }} className="rounded-full p-1 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-slate-600">请确认是否已完成支付？</p>
                    <p className="mt-1 text-xs text-slate-400">订单号：{currentOrderId}</p>
                  </div>

                  {payError && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs text-rose-600">{payError}</div>}

                  <div className="mt-6 flex gap-3">
                    <button type="button" onClick={async () => {
                      setShowPayment(false); setStep("pay");
                      // Save failed order
                      const records = JSON.parse(localStorage.getItem("aeroprep_payments") || "[]");
                      records.unshift({ orderId: currentOrderId, planId: selected, amount: selectedPlan.priceNum, status: "failed", createdAt: new Date().toISOString() });
                      localStorage.setItem("aeroprep_payments", JSON.stringify(records));
                    }}
                      className="flex-1 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100">
                      支付失败
                    </button>
                    <button type="button" onClick={async () => {
                      setSubmitted(true);
                      // Save pending order + submit application
                      const records = JSON.parse(localStorage.getItem("aeroprep_payments") || "[]");
                      records.unshift({ orderId: currentOrderId, planId: selected, amount: selectedPlan.priceNum, status: "pending", createdAt: new Date().toISOString() });
                      localStorage.setItem("aeroprep_payments", JSON.stringify(records));
                      // Also submit to server
                      try {
                        await fetch("/api/member/apply", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ orderId: currentOrderId, planId: selected }),
                        });
                      } catch {}
                    }}
                      className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:brightness-110">
                      支付成功
                    </button>
                  </div>

                  {submitted && (
                    <div className="mt-4 text-center py-2">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                        <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">申请已提交</h3>
                      <p className="mt-1 text-xs text-slate-500">管理员审核通过后，会员自动生效</p>
                      <p className="mt-1 text-[10px] text-slate-400">订单号：{currentOrderId}</p>
                      <button type="button" onClick={() => { setShowPayment(false); setStep("pay"); setSubmitted(false); }}
                        className="mt-4 inline-flex rounded-full bg-slate-100 px-6 py-2 text-xs text-slate-600 transition hover:bg-slate-200">
                        完成
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </AppFrame>
  );
}
