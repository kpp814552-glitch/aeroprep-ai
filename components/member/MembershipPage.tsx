"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, CheckCircle2, Lock, Sparkles, X, Clock, CreditCard } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel } from "@/components/ui/glass";
import { PLANS, activateMember, type PlanId } from "@/lib/member/member-storage";

export default function MembershipPage() {
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paid, setPaid] = useState(false);
  const router = useRouter();

  const handlePay = () => {
    if (!selected) return;
    setShowPayment(true);
    setPaid(false);
  };

  const handleConfirmPayment = () => {
    if (!selected) return;
    activateMember(selected);
    setPaid(true);
    setTimeout(() => {
      setShowPayment(false);
      router.push("/");
    }, 1500);
  };

  const selectedPlan = PLANS.find((p) => p.id === selected);
  const expiresAt = selectedPlan
    ? new Date(Date.now() + selectedPlan.days * 86400000)
        .toLocaleString("zh-CN", { hour12: false })
        .replace(/\//g, "-")
    : "";

  return (
    <AppFrame>
      <main className="relative z-10 min-h-screen px-5 pb-24 pt-12 md:px-8 md:pt-16">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-amber-100/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-sky-100/15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl stagger-section">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <Crown className="h-3 w-3 text-amber-500" />会 员
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              会员<span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">全站解锁权限</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              免费用户规则：永久开放【资料中心】【AI优化功能】；AI面试仅可免费试用3次，<strong>不生成、不解锁面试报告</strong>；其余所有功能全部封锁，仅会员可使用。
            </p>
          </div>

          {/* Plan Cards */}
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isActive = selected === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelected(plan.id)}
                  className={`group relative overflow-hidden rounded-2xl border px-5 py-6 text-left transition-all duration-300 active:scale-[0.98] ${
                    isActive
                      ? "border-amber-300 bg-white shadow-lg ring-2 ring-amber-200"
                      : "border-white/80 bg-white/60 shadow-sm hover:scale-[1.02] hover:shadow-md"
                  }`}
                >
                  {/* Accent bar */}
                  {isActive && <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-amber-400 to-orange-500" />}
                  {plan.recommended && !isActive && (
                    <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[9px] font-medium text-white shadow-sm">推荐</div>
                  )}
                  {isActive && (
                    <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[9px] font-medium text-white shadow-sm">已选</div>
                  )}
                  <div className="relative z-10">
                    <p className={`text-base font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}>{plan.label}</p>
                    <p className="mt-3">
                      <span className="text-3xl font-bold text-slate-900">{plan.price.replace("元", "")}</span>
                      <span className="ml-1 text-sm text-slate-400">元</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{plan.desc}</p>
                    <div className="mt-4 space-y-1.5">
                      {["无限AI面试", "完整评分报告", "全部功能解锁"].map((f) => (
                        <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{f}
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pay Button */}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handlePay}
              disabled={!selected}
              className={`inline-flex h-[52px] w-[260px] items-center justify-center gap-2 rounded-2xl text-sm font-medium text-white shadow-lg transition-all active:scale-[0.98] ${
                selected
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 hover:shadow-xl"
                  : "bg-slate-300 cursor-not-allowed shadow-none"
              }`}
            >
              <Crown className="h-4 w-4" />
              立即支付{selected ? ` ${PLANS.find((p) => p.id === selected)?.price}` : ""}
            </button>
          </div>
        </div>

        {/* Payment Modal */}
        {showPayment && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm" onClick={() => { if (!paid) setShowPayment(false); }}>
            <div className="w-full max-w-sm rounded-[24px] border border-white/40 bg-white p-6 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">支付宝扫码开通会员</h2>
                {!paid && (
                  <button type="button" onClick={() => setShowPayment(false)} className="rounded-full p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-b from-amber-50 to-white px-4 py-4 text-center">
                <p className="text-xs text-slate-500">当前套餐</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedPlan.label}</p>
                <p className="text-2xl font-bold text-amber-600">{selectedPlan.price}</p>
              </div>

              {/* Simulated QR Code */}
              <div className="mx-auto mt-5 flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-white">
                <div className="text-center">
                  <CreditCard className="mx-auto h-10 w-10 text-amber-400" />
                  <p className="mt-2 text-xs text-slate-400">支付宝收款码</p>
                  <p className="mt-1 text-[10px] text-slate-300">（模拟）扫码完成支付</p>
                </div>
              </div>

              {/* Expiry Preview */}
              <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-center">
                <p className="text-xs text-slate-500">开通后有效期至</p>
                <p className="mt-1 text-sm font-medium text-sky-700">
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  {expiresAt}
                </p>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">付款完成后点击下方按钮自动解锁会员权限</p>

              <div className="mt-4 flex gap-3">
                {!paid && (
                  <button type="button" onClick={() => setShowPayment(false)}
                    className="flex-1 rounded-full border border-white/40 bg-white/60 px-4 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-white/80">
                    关闭
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={paid}
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs font-medium text-white shadow-sm transition ${
                    paid
                      ? "bg-emerald-500 cursor-default"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110"
                  }`}
                >
                  {paid ? "✅ 开通成功！" : "我已完成付款"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppFrame>
  );
}
