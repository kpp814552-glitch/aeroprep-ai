"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageSquareText, Mic, Sparkles, Waves, Bot, Clock, BarChart3, Shield } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { GlassLinkButton } from "@/components/ui/glass-link";
import AnnouncementsBanner from "@/components/home/AnnouncementsBanner";
import { interviewHighlights } from "@/lib/site";
import { PREP_COUNTDOWN_SECONDS } from "@/lib/interview/config";

// ---- Count-Up Hook ----
function useCountUp(target: number, duration = 2000): [number, React.RefObject<HTMLSpanElement | null>] {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}

// ---- Stat Card ----
function StatCard({ label, value, suffix, icon: Icon }: { label: string; value: number; suffix: string; icon: any }) {
  const [count, ref] = useCountUp(value);
  return (
    <div className="glass-card rounded-[24px] border border-white/36 bg-white/34 px-5 py-5 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/50">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        <span ref={ref}>{count}</span>
        <span className="ml-0.5 text-lg font-normal text-slate-400">{suffix}</span>
      </p>
    </div>
  );
}

// ---- AI Interview Demo Card ----
function AIDemoCard() {
  const [phase, setPhase] = useState(0);
  const [timer, setTimer] = useState(0);

  const phases = [
    { label: "正在准备面试内容...", duration: 3 },
    { label: "AI 面试官正在分析你的回答...", duration: 4 },
    { label: "综合评估中...", duration: 3 },
  ];

  const tags = [
    { label: "安全意识", active: phase >= 1, delay: 0 },
    { label: "专业深度", active: phase >= 1, delay: 0.3 },
    { label: "表达逻辑", active: phase >= 2, delay: 0 },
    { label: "岗位匹配", active: phase >= 2, delay: 0.3 },
  ];

  useEffect(() => {
    if (phase >= phases.length) return;
    const t = setTimeout(() => setPhase((p) => p + 1), phases[phase].duration * 1000);
    return () => clearTimeout(t);
  }, [phase, phases]);

  useEffect(() => {
    const iv = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="glass-card relative overflow-hidden rounded-[28px] border border-white/40 bg-white/60 p-5 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_16px_48px_rgba(37,113,255,0.1)]">
      {/* Shimmer */}
      <div className="glass-shimmer" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 border-b border-white/30 pb-4">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">AI 面试官</p>
          <p className="text-xs text-slate-400">
            {phase < phases.length ? phases[phase].label : "面试完成 ✓"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5">
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="text-xs font-mono text-slate-600">{fmt(timer)}</span>
        </div>
      </div>

      {/* Waveform */}
      <div className="relative z-10 mt-5 flex items-end justify-center gap-[3px] h-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="wave-bar w-[3px] min-h-[6px] rounded-full bg-gradient-to-t from-sky-400 to-violet-400" style={{ transformOrigin: "bottom" }} />
        ))}
      </div>

      {/* Analysis Tags */}
      <div className="relative z-10 mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className={`rounded-full px-3 py-1 text-[10px] font-medium tracking-wide uppercase transition-all duration-700 ${
              tag.active
                ? "bg-sky-100 text-sky-700 shadow-sm"
                : "bg-white/40 text-slate-300"
            }`}
            style={{ transitionDelay: `${tag.delay}s` }}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Bottom meta */}
      <div className="relative z-10 mt-4 flex items-center gap-4 border-t border-white/20 pt-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />实时分析中</span>
        <span className="flex items-center gap-1"><Shield className="h-3 w-3" />模拟面试</span>
      </div>
    </div>
  );
}

// ---- Modules ----
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
    description: "优化简历、自我介绍和面试回答，AI帮你提升民航岗位匹配度。",
    icon: MessageSquareText,
    tone: "from-cyan-200/80 to-white/10",
  },
];

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heroParallax = Math.min(scrollY * 0.15, 40);

  return (
    <AppFrame>
      <AnnouncementsBanner />

      {/* ====== Floating Background Blobs ====== */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {[
          { size: 400, top: "-10%", left: "-5%", color: "rgba(148, 197, 255, 0.15)", dur: "18s", anim: "blob1" },
          { size: 350, top: "30%", right: "-8%", color: "rgba(196, 181, 253, 0.12)", dur: "22s", anim: "blob2" },
          { size: 300, bottom: "10%", left: "20%", color: "rgba(167, 243, 208, 0.1)", dur: "20s", anim: "blob3" },
          { size: 250, top: "50%", left: "50%", color: "rgba(253, 186, 116, 0.08)", dur: "25s", anim: "blob1" },
          { size: 200, bottom: "20%", right: "15%", color: "rgba(147, 197, 253, 0.1)", dur: "19s", anim: "blob2" },
          { size: 500, top: "-20%", right: "-10%", color: "rgba(219, 234, 254, 0.08)", dur: "23s", anim: "blob3" },
        ].map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl"
            style={{
              width: b.size, height: b.size,
              top: b.top, left: b.left, right: b.right, bottom: b.bottom,
              background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
              animation: `${b.anim} ${b.dur} ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <main className="relative z-10 px-5 pb-14 pt-8 md:px-8 md:pb-20 md:pt-10">
        {/* ====== Hero Section ====== */}
        <section
          className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.18fr_0.82fr]"
          style={{ transform: `translateY(${heroParallax}px)`, transition: "transform 0.1s ease-out" }}
        >
          {/* Left Hero */}
          <GlassPanel className="stagger-section soft-enter overflow-hidden px-6 py-8 md:px-10 md:py-12">
            <div className="hero-grid absolute inset-0 opacity-80" />
            <div className="orbital-float absolute right-10 top-10 hidden h-20 w-20 rounded-full bg-white/30 blur-xl md:block" />

            {/* Hero content with stagger */}
            <div className="relative stagger-section">
              {/* Badge */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/48 px-4 py-2 text-xs font-medium tracking-[0.24em] text-slate-600 uppercase">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  AeroPrep AI
                </span>
              </div>

              {/* Title */}
              <div className="mt-12 max-w-3xl">
                <h1 className="text-balance text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl md:leading-[1.02]">
                  重新定义民航求职训练
                </h1>
                <p className="text-balance mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-xl">
                  与AI面试官进行真实航空公司模拟面试
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="soft-enter-delay mt-10 flex flex-col gap-3 sm:flex-row">
                <GlassLinkButton href="/interview" className="group px-6 py-3.5 text-base active:scale-[0.98] transition-transform">
                  开始AI面试
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </GlassLinkButton>
                <GlassLinkButton href="/chat" variant="secondary" className="group px-6 py-3.5 text-base active:scale-[0.98] transition-transform">
                  进入AI优化
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </GlassLinkButton>
              </div>

              {/* Stats */}
              <div className="soft-enter-delay-2 mt-14 grid gap-3 sm:grid-cols-3">
                {interviewHighlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/36 bg-white/34 px-4 py-4 text-sm text-slate-700 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          {/* Right: AI Demo Card */}
          <GlassPanel className="soft-enter-delay flex flex-col overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-x-12 top-8 h-24 rounded-full bg-sky-200/24 blur-2xl" />
            <div className="relative flex flex-col gap-4" style={{ animation: "fadeUp 0.8s ease 0.4s both" }}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Dynamic Glass
              </p>

              {/* AI Demo Card */}
              <AIDemoCard />

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="思考倒计时" value={PREP_COUNTDOWN_SECONDS} suffix="s" icon={Clock} />
                <StatCard label="训练模块" value={2} suffix="个" icon={BarChart3} />
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* ====== Feature Modules ====== */}
        <section className="stagger-section mx-auto mt-6 grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr]">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href} className="group block">
                <GlassCard
                  className="soft-enter relative overflow-hidden px-6 py-7 transition-all duration-500 hover:!scale-[1.02] hover:shadow-[0_22px_60px_rgba(29,72,136,0.16)] active:!scale-[0.98] md:px-7 md:py-8"
                >
                  <div className="glass-shimmer" />
                  <div className={`absolute inset-x-8 top-0 h-18 rounded-full bg-gradient-to-r ${module.tone} blur-2xl`} />
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
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{module.title}</h2>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">{module.description}</p>
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
