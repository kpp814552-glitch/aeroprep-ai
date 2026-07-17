"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown, CheckCircle2, Clock, CreditCard, X,
  Brain, BarChart3, BookOpen, Sparkles, Zap, Shield, Infinity,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel } from "@/components/ui/glass";
import { PLANS, activateMember, type PlanId } from "@/lib/member/member-storage";

const FEATURE_COMPARE = [
  { feature: "资料中心浏览", free: "✅", member: "✅" },
  { feature: "AI 内容优化", free: "✅", member: "✅" },
  { feature: "AI 模拟面试", free: "3次", member: "无限次" },
  { feature: "面试评分报告", free: "❌", member: "完整报告" },
  { feature: "全岗位专项题库", free: "基础", member: "全部" },
  { feature: "收藏与学习记录", free: "✅", member: "✅" },
];

export default function MembershipPage() {
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paid, setPaid] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [payError, setPayError] = useState("");
  const router = useRouter();

  const handlePay = async (planId: PlanId) => {
    setSelected(planId);
    setShowPayment(true);
    setPaid(false);
    setPayError("");
    setConfirming(false);
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

  const handleConfirmPayment = async () => {
    if (!selected || !currentOrderId) return;
    setConfirming(true);
    setPayError("");
    try {
      const plan = PLANS.find((p) => p.id === selected);
      const res = await fetch("/api/payment/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: currentOrderId, planId: selected, amount: plan?.priceNum }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "支付确认失败");
      activateMember(selected);
      setPaid(true);
      setTimeout(() => { setShowPayment(false); router.push("/"); }, 1500);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "支付确认失败，请重试");
    } finally {
      setConfirming(false);
    }
  };

  const selectedPlan = PLANS.find((p) => p.id === selected);
  const expiresAt = selectedPlan
    ? new Date(Date.now() + selectedPlan.days * 86400000)
        .toLocaleString("zh-CN", { hour12: false })
        .replace(/\//g, "-")
    : "";

  return (
    <AppFrame>
      <main className="relative z-10 flex h-[calc(100dvh-80px)] flex-col overflow-hidden">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0" aria-hidden="true">
          <div className="absolute -left-60 -top-60 h-[700px] w-[700px] rounded-full bg-amber-100/15 blur-3xl" />
          <div className="absolute -bottom-60 -right-60 h-[700px] w-[700px] rounded-full bg-sky-100/15 blur-3xl" />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-5 pb-4 pt-3 md:px-8">
          
          {/* ===== Header ===== */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                <Crown className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900">会员计划</h1>
                <p className="text-[10px] text-slate-400">免费用户3次面试 · 会员无限次</p>
              </div>
            </div>
            {selected && (
              <button
                type="button"
                onClick={() => handlePay(selected)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-xs font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95"
              >
                <Crown className="h-3 w-3" />
                立即开通 {PLANS.find(p => p.id === selected)?.price}
              </button>
            )}
          </div>

          {/* ===== Main Content ===== */}
          <div className="flex flex-1 gap-4 overflow-hidden">
            {/* === Left: Plan Cards === */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {PLANS.map((plan) => {
                const isActive = selected === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelected(plan.id)}
                    className={`group relative flex shrink-0 items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 active:scale-[0.99] ${
                      isActive
                        ? "border-amber-300 bg-white shadow-md ring-2 ring-amber-200/50"
                        : "border-white/80 bg-white/60 shadow-sm hover:border-amber-200/60 hover:shadow-md"
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-gradient-to-b from-amber-400 to-orange-500" />}
                    
                    <div className="relative z-10 flex flex-1 items-center gap-4">
                      {/* Price */}
                      <div className="w-24 shrink-0 text-center">
                        <span className="text-2xl font-bold text-slate-900">¥{plan.price.replace("元", "")}</span>
                        <p className="text-[10px] text-slate-400">
                          {plan.id === "30day" ? "/30天" : plan.id === "1day" ? "/天" : "/3天"}
                        </p>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{plan.label}</p>
                          {plan.recommended && (
                            <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[8px] font-medium text-white flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" />推荐
                            </span>
                          )}
                          {isActive && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-medium text-amber-700">已选</span>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">{plan.desc}</p>
                      </div>

                      {/* Features */}
                      <div className="hidden gap-x-5 gap-y-1 sm:grid sm:grid-cols-2">
                        {plan.id === "1day" && (
                          <>
                            <MiniFeature icon={Infinity} text="无限AI面试" />
                            <MiniFeature icon={BarChart3} text="评分报告" />
                            <MiniFeature icon={BookOpen} text="全部题库" />
                            <MiniFeature icon={Shield} text="全站解锁" />
                          </>
                        )}
                        {plan.id === "3day" && (
                          <>
                            <MiniFeature icon={Infinity} text="无限AI面试" />
                            <MiniFeature icon={BarChart3} text="完整复盘报告" />
                            <MiniFeature icon={BookOpen} text="全部题库" />
                            <MiniFeature icon={Shield} text="全站解锁" />
                          </>
                        )}
                        {plan.id === "30day" && (
                          <>
                            <MiniFeature icon={Infinity} text="无限面试" />
                            <MiniFeature icon={BarChart3} text="专业报告" />
                            <MiniFeature icon={BookOpen} text="持续更新题库" />
                            <MiniFeature icon={Zap} text="会员专属" />
                          </>
                        )}
                      </div>

                      {/* Check */}
                      <div className={`shrink-0 rounded-full border-2 p-1 transition ${
                        isActive ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"
                      }`}>
                        <div className={`h-2.5 w-2.5 rounded-full transition ${
                          isActive ? "bg-amber-500" : "bg-transparent"
                        }`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* === Right: Feature Compare + Why === */}
            <div className="flex w-72 shrink-0 flex-col gap-3">
              {/* Feature Compare */}
              <GlassPanel className="flex-1 overflow-hidden px-0 py-0">
                <div className="flex items-center gap-2 border-b border-white/30 bg-slate-50/40 px-4 py-2.5">
                  <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-[11px] font-semibold text-slate-600">功能对比</span>
                </div>
                <div className="divide-y divide-white/30 px-4">
                  {FEATURE_COMPARE.map((item, i) => (
                    <div key={i} className="flex items-center py-2 text-[11px]">
                      <span className="flex-1 text-slate-600">{item.feature}</span>
                      <span className={`w-10 text-center text-xs font-medium ${
                        item.free === "❌" ? "text-slate-300" : "text-emerald-600"
                      }`}>{item.free}</span>
                      <span className={`w-10 text-center text-xs font-medium ${
                        item.member === "❌" ? "text-slate-300" : "text-emerald-600"
                      }`}>{item.member}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              {/* Why Member */}
              <GlassPanel className="shrink-0 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-[11px] font-semibold text-slate-600">会员权益</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {[
                    { icon: Brain, text: "无限模拟面试" },
                    { icon: BarChart3, text: "完整评分报告" },
                    { icon: BookOpen, text: "全部岗位题库" },
                    { icon: Shield, text: "全功能解锁" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/50 px-2 py-1.5">
                      <item.icon className="h-3 w-3 text-amber-600" />
                      <span className="text-[10px] text-slate-600">{item.text}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>

        {/* ===== PAYMENT MODAL ===== */}
        {showPayment && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm" onClick={() => { if (!paid) setShowPayment(false); }}>
            <div className="w-full max-w-sm rounded-[24px] border border-white/40 bg-white p-6 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  <Crown className="mr-1.5 inline h-4 w-4 text-amber-500" />
                  开通会员
                </h2>
                {!paid && (
                  <button type="button" onClick={() => setShowPayment(false)} className="rounded-full p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-b from-amber-50 to-white px-4 py-4 text-center">
                <p className="text-xs text-slate-400">当前套餐</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedPlan.label}</p>
                <p className="mt-1 text-3xl font-bold text-amber-600">¥{selectedPlan.price.replace("元", "")}</p>
              </div>

              <div className="mx-auto mt-5 flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-white">
                <div className="text-center">
                  <CreditCard className="mx-auto h-10 w-10 text-amber-400" />
                  <p className="mt-2 text-xs font-medium text-slate-600">支付宝扫码支付</p>
                  <p className="mt-1 text-[10px] text-slate-300">（请联系管理员获取收款码）</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-center">
                <p className="text-xs text-slate-500">开通后有效期至</p>
                <p className="mt-1 text-sm font-medium text-sky-700">
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  {expiresAt}
                </p>
              </div>

              {currentOrderId && <p className="mt-2 text-center text-[10px] text-slate-400">订单号: {currentOrderId.slice(0, 16)}...</p>}
              <p className="mt-2 text-center text-xs text-slate-400">付款后点击下方按钮，系统校验通过后自动解锁</p>

              {payError && <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-center text-xs text-rose-600">{payError}</div>}

              <div className="mt-4 flex gap-3">
                {!paid && (
                  <button type="button" onClick={() => setShowPayment(false)}
                    className="flex-1 rounded-full border border-white/40 bg-white/60 px-4 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-white/80">
                    取消
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={paid || confirming}
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs font-medium text-white shadow-sm transition ${
                    paid
                      ? "bg-emerald-500 cursor-default"
                      : confirming
                      ? "bg-slate-300 cursor-wait"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110"
                  }`}
                >
                  {paid ? "✅ 开通成功！" : confirming ? "校验中..." : "我已完成付款"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppFrame>
  );
}

function MiniFeature({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50">
        <Icon className="h-2.5 w-2.5 text-emerald-600" />
      </div>
      <span className="text-[10px] text-slate-500">{text}</span>
    </div>
  );
}
