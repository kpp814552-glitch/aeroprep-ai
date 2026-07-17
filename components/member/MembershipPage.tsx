"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown, CheckCircle2, XCircle, Sparkles, Clock, CreditCard, X,
  Brain, MessageSquare, BookOpen, BarChart3, Infinity, Star, Zap,
  ChevronDown, ChevronUp, Shield,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel } from "@/components/ui/glass";
import { PLANS, activateMember, type PlanId } from "@/lib/member/member-storage";

const FAQS = [
  { q: "购买会员后如何生效？", a: "完成支付后系统自动激活会员权限，无需额外操作。你可以在个人中心查看会员到期时间。" },
  { q: "会员到期后数据会丢失吗？", a: "不会。你的面试记录、学习收藏、优化历史等数据永久保存。续费后即可恢复全部功能。" },
  { q: "免费用户可以使用哪些功能？", a: "免费用户永久开放【资料中心】浏览和【AI优化】功能。AI面试可免费试用3次，但不生成面试报告。" },
  { q: "支持哪些支付方式？", a: "目前支持支付宝扫码支付。支付完成后点击「我已完成付款」按钮，系统校验通过后自动激活。" },
  { q: "可以退款吗？", a: "会员为数字虚拟商品，购买后不支持退款。建议先使用免费功能体验产品，确认合适后再购买。" },
  { q: "会员时长如何计算？", a: "从支付成功激活那一刻开始计算，按自然天计算（24小时为1天）。不是按自然日。" },
];

const FEATURE_COMPARE = [
  { feature: "资料中心（全部内容）", free: "✅", member: "✅", highlight: false },
  { feature: "AI 内容优化", free: "✅", member: "✅", highlight: false },
  { feature: "AI 模拟面试", free: "3次", member: "无限次", highlight: true },
  { feature: "面试评分报告", free: "❌", member: "完整报告", highlight: true },
  { feature: "逐题分析与建议", free: "❌", member: "✅", highlight: true },
  { feature: "岗位专项题库", free: "基础", member: "全部岗位", highlight: true },
  { feature: "航司面试真题", free: "部分", member: "全部", highlight: true },
  { feature: "语音识别输入", free: "✅", member: "✅", highlight: false },
  { feature: "学习收藏与记录", free: "✅", member: "✅", highlight: false },
  { feature: "会员标识与专属权益", free: "❌", member: "✅", highlight: true },
];

const BENEFITS = [
  { icon: Brain, title: "AI模拟面试", desc: "无限次岗位定向模拟面试，每次题目动态生成，贴合航司真实面试场景" },
  { icon: BarChart3, title: "专业评分报告", desc: "面试结束后自动生成完整评分报告，含逐题分析与改进建议" },
  { icon: BookOpen, title: "全岗位题库", desc: "解锁全部岗位面试题库，涵盖飞行、机务、空乘、空管等9大岗位" },
  { icon: Star, title: "优先新功能", desc: "会员可优先体验新上线的功能与内容更新，持续提升求职竞争力" },
];

export default function MembershipPage() {
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paid, setPaid] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [payError, setPayError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
      <main className="relative z-10 min-h-screen overflow-hidden">
        {/* Background Glow */}
        <div className="pointer-events-none fixed inset-0" aria-hidden="true">
          <div className="absolute -left-60 -top-60 h-[700px] w-[700px] rounded-full bg-amber-100/15 blur-3xl" />
          <div className="absolute -bottom-60 -right-60 h-[700px] w-[700px] rounded-full bg-sky-100/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-100/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-5 pb-32 pt-12 md:px-8 md:pt-20">
          
          {/* ========== HERO ========== */}
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <Crown className="h-3 w-3 text-amber-500" />会 员
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              选择你的<span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">会员计划</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              免费用户永久使用<strong>资料中心</strong>和<strong>AI优化</strong>功能。
              AI面试可免费体验3次。升级会员解锁全部功能，获得完整的面试训练体验。
            </p>
          </div>

          {/* ========== PLAN CARDS ========== */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isActive = selected === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`group relative flex flex-col rounded-2xl border px-5 py-7 text-left transition-all duration-300 ${
                    isActive
                      ? "border-amber-300 bg-white shadow-xl ring-2 ring-amber-200/50"
                      : plan.recommended
                      ? "border-amber-200/60 bg-white shadow-md hover:shadow-lg"
                      : "border-white/80 bg-white/60 shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Badge */}
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

                  {/* Accent bar when selected */}
                  {isActive && <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-gradient-to-b from-amber-400 to-orange-500" />}

                  <div className="relative z-10 flex flex-1 flex-col">
                    {/* Plan Name */}
                    <p className={`text-center text-base font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                      {plan.label}
                    </p>

                    {/* Price */}
                    <div className="mt-4 text-center">
                      <span className="text-4xl font-bold text-slate-900">¥{plan.price.replace("元", "")}</span>
                      <span className="ml-1 text-sm text-slate-400">
                        {plan.id === "30day" ? "/月" : plan.id === "1day" ? "/天" : "/3天"}
                      </span>
                    </div>
                    <p className="mt-1 text-center text-xs text-slate-400">{plan.desc}</p>

                    {/* Divider */}
                    <div className="my-5 border-t border-dashed border-white/60" />

                    {/* Feature List */}
                    <div className="flex-1 space-y-3">
                      {plan.id === "1day" && (
                        <>
                          <FeatureRow icon={Infinity} text="24小时无限AI面试" />
                          <FeatureRow icon={BarChart3} text="完整面试评分报告" />
                          <FeatureRow icon={BookOpen} text="全部岗位题库" />
                          <FeatureRow icon={Star} text="全站功能无限制" />
                        </>
                      )}
                      {plan.id === "3day" && (
                        <>
                          <FeatureRow icon={Infinity} text="72小时无限AI面试" />
                          <FeatureRow icon={BarChart3} text="完整面试复盘报告" />
                          <FeatureRow icon={BookOpen} text="全部岗位题库" />
                          <FeatureRow icon={Star} text="全站功能解锁" />
                          <FeatureRow icon={Shield} text="优先体验新功能" />
                        </>
                      )}
                      {plan.id === "30day" && (
                        <>
                          <FeatureRow icon={Infinity} text="30天无限AI模拟面试" />
                          <FeatureRow icon={BarChart3} text="专业面试评分报告" />
                          <FeatureRow icon={BookOpen} text="持续更新民航面试题库" />
                          <FeatureRow icon={Star} text="全部功能全开" />
                          <FeatureRow icon={Shield} text="优先体验新功能" />
                          <FeatureRow icon={Zap} text="会员专属标识" />
                        </>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      type="button"
                      onClick={() => handlePay(plan.id)}
                      className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                        isActive
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:brightness-110"
                          : plan.recommended
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:brightness-110"
                          : "border border-slate-200/60 bg-white/80 text-slate-700 hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      <Crown className="h-4 w-4" />
                      立即开通 · {plan.price}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========== WHY UPGRADE ========== */}
          <div className="mx-auto mt-20 max-w-4xl">
            <h2 className="text-center text-2xl font-semibold text-slate-900">为什么选择会员？</h2>
            <p className="mt-2 text-center text-sm text-slate-500">解锁全部功能，让AI面试训练真正帮你拿到Offer</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b, i) => (
                <GlassPanel key={i} className="px-5 py-6 text-center transition hover:shadow-md">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 shadow-inner">
                    <b.icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-800">{b.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{b.desc}</p>
                </GlassPanel>
              ))}
            </div>
          </div>

          {/* ========== FEATURE COMPARE TABLE ========== */}
          <div className="mx-auto mt-20 max-w-4xl">
            <h2 className="text-center text-2xl font-semibold text-slate-900">完整功能对比</h2>
            <p className="mt-2 text-center text-sm text-slate-500">免费用户 vs 会员用户</p>
            <GlassPanel className="mt-8 overflow-hidden px-0 py-0">
              <div className="divide-y divide-white/40">
                {/* Table Header */}
                <div className="flex items-center bg-slate-50/60 px-5 py-3 text-xs font-semibold text-slate-600">
                  <div className="flex-1">功能</div>
                  <div className="w-20 text-center">免费</div>
                  <div className="w-20 text-center">会员</div>
                </div>
                {FEATURE_COMPARE.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center px-5 py-3.5 text-xs transition ${
                      item.highlight ? "bg-amber-50/40" : "hover:bg-white/40"
                    }`}
                  >
                    <div className="flex-1 font-medium text-slate-700">{item.feature}</div>
                    <div className={`w-20 text-center text-sm ${item.free === "❌" ? "text-slate-300" : "text-emerald-600"}`}>
                      {item.free}
                    </div>
                    <div className={`w-20 text-center text-sm ${item.member === "❌" ? "text-slate-300" : "text-emerald-600"}`}>
                      {item.member}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          {/* ========== FAQ ========== */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-center text-2xl font-semibold text-slate-900">常见问题</h2>
            <p className="mt-2 text-center text-sm text-slate-500">关于会员的常见疑问</p>
            <div className="mt-8 space-y-3">
              {FAQS.map((faq, i) => (
                <GlassPanel key={i} className="overflow-hidden px-5 py-0 transition hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between py-4 text-left"
                  >
                    <span className="text-sm font-medium text-slate-800">{faq.q}</span>
                    {openFaq === i ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-white/40 pb-4">
                      <p className="pt-3 text-xs leading-6 text-slate-500">{faq.a}</p>
                    </div>
                  )}
                </GlassPanel>
              ))}
            </div>
          </div>

          {/* ========== FOOTER CTA ========== */}
          <div className="mx-auto mt-20 max-w-lg text-center">
            <GlassPanel className="px-8 py-8">
              <Crown className="mx-auto h-8 w-8 text-amber-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">准备好开始了吗？</h3>
              <p className="mt-2 text-xs text-slate-500">选择上方套餐，立即解锁全部功能</p>
            </GlassPanel>
          </div>
        </div>

        {/* ========== PAYMENT MODAL ========== */}
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

              {/* QR Code */}
              <div className="mx-auto mt-5 flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-white">
                <div className="text-center">
                  <CreditCard className="mx-auto h-10 w-10 text-amber-400" />
                  <p className="mt-2 text-xs font-medium text-slate-600">支付宝扫码支付</p>
                  <p className="mt-1 text-[10px] text-slate-300">（请联系管理员获取收款码）</p>
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

function FeatureRow({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
        <Icon className="h-3 w-3 text-emerald-600" />
      </div>
      <span className="text-xs text-slate-600">{text}</span>
    </div>
  );
}
