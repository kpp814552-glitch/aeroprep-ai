"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  ChevronRight,
  Mic,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import AnnouncementsBanner from "@/components/home/AnnouncementsBanner";
import WaterLightBackground from "@/components/home/WaterLightBackground";
import {
  interviewModes,
  prepRoleOptions,
  type InterviewMode,
} from "@/lib/site";
import type { InterviewRole } from "@/lib/interview/types";
import { cn } from "@/lib/utils";

const HERO_FEATURES = [
  { icon: Target, label: "岗位化出题", text: "围绕岗位能力模型，而不是通用聊天" },
  { icon: Mic, label: "实时语音面试", text: "面试官语音提问，回答实时记录" },
  { icon: ShieldCheck, label: "完整能力报告", text: "评分、逐题分析和提升建议" },
];

export default function HomePage() {
  const [selectedRole, setSelectedRole] = useState<InterviewRole>("pilot");
  const [selectedMode, setSelectedMode] = useState<InterviewMode>("校招");
  const pageRef = useRef<HTMLElement | null>(null);
  const heroPanelRef = useRef<HTMLDivElement | null>(null);

  const currentRole =
    prepRoleOptions.find((item) => item.value === selectedRole) || prepRoleOptions[0];

  const saveInterviewIntent = () => {
    try {
      sessionStorage.setItem(
        "aeroprep_interview_intent",
        JSON.stringify({ role: selectedRole, mode: selectedMode }),
      );
    } catch {
      // Storage may be unavailable in private browsing; navigation still works.
    }
  };

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
              href="/interview"
              className="group inline-flex max-w-[620px] items-center gap-2 text-center text-xs leading-6 text-slate-600 transition hover:text-slate-900"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              <span className="line-clamp-1">
                岗位模型与语音面试持续升级，让训练更接近真实招聘
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5" />
            </Link>

            <div className="relative mt-6 flex w-full justify-center">
              <div className="pointer-events-none absolute top-1/2 h-16 w-[72%] max-w-[620px] -translate-y-1/2 rounded-full bg-white/42 blur-3xl" />
              <h1 className="relative text-center text-4xl font-normal tracking-[0.055em] text-[#14213d] sm:text-5xl md:text-[58px] md:leading-[1.12]">
                探索民航求职新可能
              </h1>
            </div>
            <p className="mt-5 max-w-2xl text-center text-sm leading-7 text-slate-600 md:text-base">
              不是刷题，而是进入真实航空公司语境，完成一次完整的岗位面试训练。
            </p>

            <div className="mt-10 w-full max-w-[880px]">
              <div
                ref={heroPanelRef}
                className="liquid-hero-panel rounded-[24px] p-3 backdrop-blur-[26px] backdrop-saturate-[1.65]"
              >
                <div className="px-3 pb-2 pt-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    我想面试的岗位
                  </p>
                  <label className="mt-2 block">
                    <span className="sr-only">选择目标岗位</span>
                    <select
                      value={selectedRole}
                      onChange={(event) => setSelectedRole(event.target.value as InterviewRole)}
                      className="w-full cursor-pointer appearance-none bg-transparent text-xl font-medium tracking-[-0.02em] text-slate-900 outline-none md:text-[22px]"
                    >
                      {prepRoleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{currentRole.summary}</p>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/38 px-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {interviewModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSelectedMode(mode)}
                        className={cn(
                          "rounded-full px-3 py-2 text-xs font-medium transition active:scale-[0.95]",
                          selectedMode === mode
                            ? "bg-slate-950 text-white shadow-sm"
                            : "bg-white/42 text-slate-600 hover:bg-white/68",
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <Link
                    href="/interview"
                    onClick={saveInterviewIntent}
                    aria-label="开始AI面试"
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#152443] px-5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(21,36,67,0.20)] transition hover:-translate-y-0.5 hover:bg-[#1c3158] active:scale-[0.97]"
                  >
                    开始面试
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/14">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 flex w-full flex-col items-stretch justify-center gap-3 min-[520px]:w-auto min-[520px]:flex-row">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/54 bg-white/42 px-5 py-3 text-sm font-medium text-slate-700 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/68 active:scale-[0.97]"
              >
                <WandSparkles className="h-4 w-4 text-violet-500" />
                AI 优化回答
              </Link>
              <Link
                href="/learning"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/54 bg-white/42 px-5 py-3 text-sm font-medium text-slate-700 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/68 active:scale-[0.97]"
              >
                <BookOpen className="h-4 w-4 text-sky-500" />
                浏览资料中心
              </Link>
            </div>

            <div className="mt-12 flex w-full flex-col items-center justify-center gap-5 md:flex-row md:gap-8">
              {HERO_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.label}
                    className="flex min-w-0 items-start gap-3 md:w-56"
                  >
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
