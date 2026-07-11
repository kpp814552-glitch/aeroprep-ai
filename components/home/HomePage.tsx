import Link from "next/link";
import {
  ArrowRight,
  MessageSquareText,
  Mic,
  Sparkles,
  Waves,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { GlassLinkButton } from "@/components/ui/glass-link";
import AnnouncementsBanner from "@/components/home/AnnouncementsBanner";
import { interviewHighlights } from "@/lib/site";
import { PREP_COUNTDOWN_SECONDS } from "@/lib/interview/config";

const modules = [
  {
    href: "/interview",
    title: "AI面试",
    description: "模拟航空公司真实问答节奏，进入沉浸式面试训练。",
    icon: Mic,
    tone: "from-sky-200/80 to-white/10",
  },
  {
    href: "/chat",
    title: "AI优化",
    description: "围绕民航专业知识、岗位认知与复习难点随时发问。",
    icon: MessageSquareText,
    tone: "from-cyan-200/80 to-white/10",
  },
];

export default function HomePage() {
  const moduleCount = modules.length;
  return (
    <AppFrame>
      <AnnouncementsBanner />
      <main className="relative z-10 px-5 pb-14 pt-8 md:px-8 md:pb-20 md:pt-10">
        <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <GlassPanel className="soft-enter overflow-hidden px-6 py-8 md:px-10 md:py-12">
            <div className="hero-grid absolute inset-0 opacity-80" />
            <div className="orbital-float absolute right-10 top-10 hidden h-20 w-20 rounded-full bg-white/30 blur-xl md:block" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/48 px-4 py-2 text-xs font-medium tracking-[0.24em] text-slate-600 uppercase">
                <Sparkles className="h-4 w-4 text-blue-500" />
                AeroPrep AI
              </div>

              <div className="mt-12 max-w-3xl">
                <h1 className="text-balance text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl md:leading-[1.02]">
                  重新定义民航求职训练
                </h1>
                <p className="text-balance mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-xl">
                  与AI面试官进行真实航空公司模拟面试
                </p>
              </div>

              <div className="soft-enter-delay mt-10 flex flex-col gap-3 sm:flex-row">
                <GlassLinkButton href="/interview" className="px-6 py-3.5 text-base">
                  开始AI面试
                  <ArrowRight className="h-4 w-4" />
                </GlassLinkButton>
                <GlassLinkButton
                  href="/chat"
                  variant="secondary"
                  className="px-6 py-3.5 text-base"
                >
                  进入AI优化
                </GlassLinkButton>
              </div>

              <div className="soft-enter-delay-2 mt-14 grid gap-3 sm:grid-cols-3">
                {interviewHighlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/36 bg-white/34 px-4 py-4 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="soft-enter-delay flex flex-col justify-between overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-x-12 top-8 h-24 rounded-full bg-sky-200/24 blur-2xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Dynamic Glass
              </p>
              <div className="mt-8 space-y-4">
                <div className="glass-card rounded-[28px] p-5">
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),rgba(211,235,255,0.58),rgba(88,140,220,0.24),rgba(255,255,255,0.08))]">
                    <div className="absolute inset-6 rounded-[24px] border border-white/55 bg-white/22" />
                    <div className="absolute inset-x-12 top-10 h-10 rounded-full bg-white/36 blur-xl" />
                    <div className="absolute bottom-10 left-10 right-10 rounded-[22px] border border-white/40 bg-slate-950/55 px-5 py-4 text-white shadow-[0_18px_40px_rgba(2,12,32,0.32)]">
                      <div className="flex items-center gap-3">
                        <Waves className="h-4 w-4 text-sky-300" />
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-300">
                          Vision Interview
                        </p>
                      </div>
                      <p className="mt-3 text-lg font-medium">
                        与 AI 面试官进行真实航空公司模拟面试
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card rounded-[24px] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      Immersive
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{PREP_COUNTDOWN_SECONDS}s</p>
                    <p className="mt-2 text-sm text-slate-600">问题思考倒计时</p>
                  </div>
                  <div className="glass-card rounded-[24px] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      Session
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{moduleCount}模块</p>
                    <p className="mt-2 text-sm text-slate-600">AI面试与AI优化</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>

        <section className="mx-auto mt-6 grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr]">
          {modules.map((module, index) => {
            const Icon = module.icon;

            return (
              <Link key={module.href} href={module.href} className="group">
                <GlassCard className="soft-enter relative overflow-hidden px-6 py-7 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_22px_60px_rgba(29,72,136,0.16)] md:px-7 md:py-8">
                  <div
                    className={`absolute inset-x-8 top-0 h-18 rounded-full bg-gradient-to-r ${module.tone} blur-2xl`}
                  />
                  <div className="relative flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/60 text-slate-900 shadow-[inset_0_1px_3px_rgba(255,255,255,0.7)]">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="rounded-full bg-white/46 px-3 py-1 text-xs tracking-[0.22em] text-slate-500 uppercase">
                        0{index + 1}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                        {module.title}
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
                        {module.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      立即进入
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </section>
      </main>
    </AppFrame>
  );
}
