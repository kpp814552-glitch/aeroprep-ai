"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";

const FAQS = [
  {
    q: "AeroPrep AI 是什么？",
    a: "AeroPrep AI 是一款面向民航求职者的 AI 面试训练平台，提供 AI 模拟面试、简历优化、面试回答优化、岗位专项题库等功能，帮助求职者高效备战航司校招和社招面试。",
  },
  {
    q: "免费用户可以做什么？",
    a: "免费用户永久开放【资料中心】浏览和【AI优化】功能。AI模拟面试可免费体验3次，但不生成面试评分报告。其余功能需升级会员后使用。",
  },
  {
    q: "购买会员后如何生效？",
    a: "完成支付宝支付后，点击「我已完成付款」按钮，系统校验通过后自动激活会员权限。无需额外操作，可在个人中心查看会员到期时间。",
  },
  {
    q: "会员到期后数据会丢失吗？",
    a: "不会。你的面试记录、学习收藏、优化历史等数据永久保存在本地。续费后即可恢复全部功能。",
  },
  {
    q: "支持哪些支付方式？",
    a: "目前支持支付宝扫码支付。付款后点击「我已完成付款」按钮，系统通过订单校验后自动激活，确保只有实际到账才开通权限。",
  },
  {
    q: "可以退款吗？",
    a: "会员为数字虚拟商品，购买后不支持退款。建议先使用免费功能体验产品，确认合适后再购买。",
  },
  {
    q: "AI面试评分准确吗？",
    a: "AI面试评分基于民航岗位能力模型、航司招聘偏好、考官打分逻辑综合评估，分数仅供参考。建议结合评分报告中的具体建议针对性提升。",
  },
  {
    q: "可以用手机使用吗？",
    a: "可以。AeroPrep AI 采用响应式设计，在手机、平板、电脑上均可正常使用。建议在面试训练时使用电脑和耳机以获得最佳体验。",
  },
  {
    q: "面试问题是随机生成的吗？",
    a: "是的。AI 会根据你选择的岗位、招聘方式（校招/社招）、目标航司以及简历内容，动态生成差异化面试题目。每次面试题目不重复。",
  },
  {
    q: "如何联系客服？",
    a: "目前可通过网站内反馈渠道提交问题。如有紧急问题，可联系管理员邮箱处理。",
  },
];

export default function FaqPage() {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <AppFrame>
      <main className="relative z-10 min-h-screen">
        <div className="pointer-events-none fixed inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-50/40 via-sky-50/15 to-transparent blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur-md">
              <HelpCircle className="h-3 w-3 text-sky-500" />F A Q
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900">
              常见问题
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              关于 AeroPrep AI 的常见疑问
            </p>
          </div>

          {/* FAQ List */}
          <div className="mt-12">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === i ? null : i)}
                  className="flex w-full items-center justify-between py-4 text-left transition hover:bg-white/30"
                >
                  <span className="text-sm font-medium text-slate-800">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition duration-200 ${
                      openId === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openId === i && (
                  <div className="pb-5">
                    <p className="text-xs leading-6 text-slate-500">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
