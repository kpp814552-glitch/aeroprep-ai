"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Clock,
  Mic,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import AnnouncementsBanner from "@/components/home/AnnouncementsBanner";
import WaterLightBackground from "@/components/home/WaterLightBackground";

const HERO_FEATURES = [
  { icon: Target, label: "岗位化出题", text: "围绕目标岗位能力，而不是通用聊天" },
  { icon: Mic, label: "实时语音面试", text: "面试官语音提问，回答实时记录" },
  { icon: ShieldCheck, label: "完整能力报告", text: "评分、逐题分析和提升建议" },
];

const INTERVIEW_FACTS = ["5–10 分钟", "最多 8 题", "语音互动", "详细报告"];

export default function HomePage() {
  const router = useRouter();
  const pageRef = useRef<HTMLElement | null>(null);
  const heroPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    router.prefetch("/interview");
  }, [router]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const handlePointerMove = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const normalizedX = event.clientX / window.innerWidth;
        const normalizedY = event.clientY / window.innerHeight;
        const x = (normalizedX - 0.5) * 28;
        const y = (normalizedY - 0.5) * 20;
        pageRef.current?.style.setProperty("--water-x", `${x.toFixed(2)}px`);
        pageRef.current?.style.setProperty("--water-y", `${y.toFixed(2)}px`);
        heroPanelRef.current?.style.setProperty(
          "--glass-light-x",
          `${(16 + normalizedX * 68).toFixed(1)}%`,
        );
        heroPanelRef.current?.style.setProperty(
          "--glass-light-y",
          `${(2 + normalizedY * 40).toFixed(1)}%`,
        );
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <AppFrame>
      <AnnouncementsBanner />
      <WaterLightBackground />

      <main ref={pageRef} className="relative z-10 overflow-hidden">
        <section className="relative flex min-h-[calc(100dvh-96px)] items-center justify-center overflow-hidden px-5 pb-16 pt-8 md:px-8 md:pb-20">
          <div className="relative z-10 flex w-full max-w-[1080px] flex-col items-center">
            <Link
              href="/learning"
              className="group inline-flex max-w-[620px] items-center gap-2 text-center text-xs leading-6 text-slate-600 transition hover:text-slate-900"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              <span className="line-clamp-1">
                岗位模型、语音体验与能力报告持续升级
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5" />
            </Link>

            <div className="relative mt-6 flex w-full justify-center">
              <div className="pointer-events-none absolute top-1/2 h-16 w-[72%] max-w-[620px] -translate-y-1/2 rounded-full bg-white/42 blur-3xl" />
              <h1 className="relative text-center text-4xl font-normal tracking-[0.055em] text-[#14213d] sm:text-5xl md:text-[58px] md:leading-[1.12]">
                探索民航求职新可能
              </h1>
            </div>

            <p className="mt-5 max-w-2xl text-center text-sm leading-7 text-slate-600 md:text-base">
              进入真实航空公司语境，完成一次从语音问答到能力报告的完整面试训练。
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {INTERVIEW_FACTS.map((fact) => (
                <span
                  key={fact}
                  className="rounded-full border border-white/52 bg-white/30 px-3 py-1.5 text-[11px] font-medium text-slate-600 backdrop-blur-xl"
                >
                  {fact}
                </span>
              ))}
            </div>

            <div className="mt-9 w-full max-w-[590px]">
              <div
                ref={heroPanelRef}
                className="liquid-hero-panel rounded-[28px] p-3 backdrop-blur-[26px] backdrop-saturate-[1.65]"
              >
                <div className="flex flex-col items-center px-6 py-7 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/32 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                    <Mic className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-lg font-medium tracking-[-0.02em] text-slate-900">
                    开始一次真实岗位面试
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    系统会根据你的目标岗位、简历与回答动态追问，并在结束后生成完整报告。
                  </p>

                  <Link
                    href="/interview"
                    aria-label="开始AI面试"
                    className="mt-6 inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-full bg-[#14213d] px-7 text-sm font-medium text-white shadow-[0_14px_34px_rgba(20,33,61,0.20)] transition hover:-translate-y-0.5 hover:bg-[#1d3158] active:scale-[0.97]"
                  >
                    开始 AI 面试
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    首次免费 · 完整生成报告后计费
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex w-full flex-col items-center justify-center gap-5 md:flex-row md:gap-8">
              {HERO_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.label} className="flex min-w-0 items-start gap-3 md:w-56">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/38 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-slate-800">{feature.label}</span>
                      <span className="mt-1 block text-[11px] leading-5 text-slate-500">{feature.text}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </AppFrame>
  );
}
