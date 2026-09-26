"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  GraduationCap,
  Lightbulb,
  Plane,
  Radar,
  Search,
  Shield,
  Sparkles,
  Target,
  Ticket,
  Users,
  Wrench,
} from "lucide-react";
import LoginModal from "@/components/auth/LoginModal";
import { allLearningItems, learningTracks } from "@/lib/learning-center/data";
import {
  addHistory,
  getFavorites,
  getHistory,
  getProgress,
  setProgress,
  subscribeLearningState,
  toggleFavorite,
} from "@/lib/learning-center/storage";
import type {
  FavoriteRecord,
  LearningItem,
  LearningRole,
  LearningTrackId,
  ProgressStatus,
} from "@/lib/learning-center/types";
import { useLoginPrompt } from "@/hooks/useLoginPrompt";

type ViewKey = LearningTrackId | "favorites" | "progress";

const roleMeta: Record<
  LearningRole,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  pilot: { label: "飞行员", icon: Plane, className: "bg-blue-50 text-blue-700" },
  cabin: { label: "空中乘务员", icon: Users, className: "bg-rose-50 text-rose-700" },
  "cabin-safety": { label: "客舱安全员", icon: Shield, className: "bg-orange-50 text-orange-700" },
  maintenance: { label: "机务维修", icon: Wrench, className: "bg-emerald-50 text-emerald-700" },
  dispatcher: { label: "签派员", icon: ClipboardList, className: "bg-indigo-50 text-indigo-700" },
  atc: { label: "空中交通管制", icon: Radar, className: "bg-cyan-50 text-cyan-700" },
  avionics: { label: "航电与通信导航", icon: Cpu, className: "bg-violet-50 text-violet-700" },
  "airport-ops": { label: "机场运行", icon: Building2, className: "bg-teal-50 text-teal-700" },
  "terminal-service": { label: "地服与航站楼", icon: Ticket, className: "bg-slate-100 text-slate-700" },
};

const navMeta: Record<
  LearningTrackId,
  { icon: ComponentType<{ className?: string }>; accent: string }
> = {
  essentials: { icon: GraduationCap, accent: "from-sky-500 to-blue-500" },
  expression: { icon: ClipboardList, accent: "from-violet-500 to-fuchsia-500" },
  roles: { icon: Briefcase, accent: "from-emerald-500 to-teal-500" },
  aviation: { icon: Radar, accent: "from-amber-500 to-orange-500" },
  practice: { icon: Target, accent: "from-rose-500 to-pink-500" },
};

function levelStyle(level: LearningItem["level"]) {
  if (level === "入门") return "bg-emerald-50 text-emerald-700";
  if (level === "进阶") return "bg-sky-50 text-sky-700";
  return "bg-rose-50 text-rose-700";
}

function ProgressMark({ status }: { status: ProgressStatus | null }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> 已完成
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
        <Clock className="h-3.5 w-3.5" /> 学习中
      </span>
    );
  }
  return null;
}

export default function LearningCenterClient() {
  const { requireLogin, loginModalProps } = useLoginPrompt();
  const [view, setView] = useState<ViewKey>("essentials");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [, setStateTick] = useState(0);

  useEffect(() => subscribeLearningState(() => setStateTick((value) => value + 1)), []);

  const favorites = getFavorites();
  const progress = getProgress();
  const history = getHistory();
  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.itemId)), [favorites]);
  const progressMap = useMemo(
    () => new Map(progress.map((item) => [item.itemId, item.status])),
    [progress],
  );
  const selectedItem = allLearningItems.find((item) => item.id === selectedItemId) || null;
  const completedCount = progress.filter((item) => item.status === "completed").length;
  const inProgressCount = progress.filter((item) => item.status === "in-progress").length;
  const completionRate = Math.round((completedCount / allLearningItems.length) * 100);

  const currentTrack =
    view !== "favorites" && view !== "progress"
      ? learningTracks.find((track) => track.id === view) || learningTracks[0]
      : null;

  const searchedItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return [];
    return allLearningItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword) ||
        item.subtitle.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    });
  }, [search]);

  const favoriteItems = allLearningItems.filter((item) => favoriteIds.has(item.id));
  const progressItems = allLearningItems.filter((item) => progressMap.has(item.id));

  function openItem(item: LearningItem) {
    setSelectedItemId(item.id);
    setView(item.trackId);
    addHistory({
      itemId: item.id,
      title: item.title,
      trackLabel:
        learningTracks.find((track) => track.id === item.trackId)?.label || "资料中心",
      viewedAt: new Date().toISOString(),
    });
    setStateTick((value) => value + 1);
  }

  function selectView(nextView: ViewKey) {
    setView(nextView);
    setSelectedItemId(null);
    setSearch("");
  }

  function handleFavorite(item: LearningItem) {
    if (!requireLogin("登录后即可收藏学习内容")) return;
    const record: FavoriteRecord = {
      itemId: item.id,
      title: item.title,
      trackLabel:
        learningTracks.find((track) => track.id === item.trackId)?.label || "资料中心",
      savedAt: new Date().toISOString(),
    };
    toggleFavorite(record);
    setStateTick((value) => value + 1);
  }

  function handleProgress(item: LearningItem) {
    if (!requireLogin("登录后即可记录学习进度")) return;
    const current = progressMap.get(item.id);
    setProgress(item.id, current === "completed" ? "in-progress" : "completed");
    setStateTick((value) => value + 1);
  }

  function renderItemCard(item: LearningItem) {
    const role = item.role ? roleMeta[item.role] : null;
    const RoleIcon = role?.icon;
    const status = progressMap.get(item.id) || null;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => openItem(item)}
        className="group w-full rounded-[22px] border border-white/55 bg-white/65 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${levelStyle(item.level)}`}>
                {item.level}
              </span>
              {role ? (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${role.className}`}>
                  {RoleIcon ? <RoleIcon className="h-3 w-3" /> : null}
                  {role.label}
                </span>
              ) : null}
              <span className="text-[10px] text-amber-500">{"★".repeat(item.frequency)}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{item.subtitle}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.summary}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/55 pt-3">
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="h-3 w-3" /> {item.durationMinutes} 分钟
          </span>
          <ProgressMark status={status} />
        </div>
      </button>
    );
  }

  function renderItemDetail(item: LearningItem) {
    const track = learningTracks.find((entry) => entry.id === item.trackId)!;
    const learningModule = track.modules.find((entry) => entry.id === item.moduleId)!;
    const role = item.role ? roleMeta[item.role] : null;
    const RoleIcon = role?.icon;
    const status = progressMap.get(item.id) || null;
    const isFavorite = favoriteIds.has(item.id);

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedItemId(null)}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-sky-600"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          返回{track.label}
        </button>

        <section className="rounded-[26px] border border-white/60 bg-white/70 px-6 py-6 shadow-sm md:px-8 md:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                {track.label} · {learningModule.title}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                {item.title}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">{item.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFavorite(item)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
                  isFavorite
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-white/70 bg-white/70 text-slate-500 hover:bg-white"
                }`}
              >
                {isFavorite ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                {isFavorite ? "已收藏" : "收藏"}
              </button>
              <button
                type="button"
                onClick={() => handleProgress(item)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
                  status === "completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {status === "completed" ? "标记为学习中" : "标记完成"}
              </button>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">{item.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${levelStyle(item.level)}`}>
              {item.level}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/75 px-3 py-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3" /> {item.durationMinutes} 分钟
            </span>
            {role ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${role.className}`}>
                {RoleIcon ? <RoleIcon className="h-3 w-3" /> : null}
                {role.label}
              </span>
            ) : null}
            {item.tags.filter((tag) => tag !== role?.label).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-sky-100 bg-sky-50/60 px-6 py-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-900">
            <Target className="h-4 w-4" /> 学完你要做到
          </h3>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {item.objectives.map((objective) => (
              <div key={objective} className="flex items-start gap-2 rounded-2xl bg-white/70 px-4 py-3 text-xs leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                {objective}
              </div>
            ))}
          </div>
        </section>

        {item.blocks.map((block) => (
          <section key={block.heading} className="rounded-[24px] border border-white/60 bg-white/65 px-6 py-6">
            <h3 className="text-base font-semibold text-slate-900">{block.heading}</h3>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {block.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {block.bullets?.length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {block.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-2 rounded-2xl bg-slate-50/80 px-4 py-3 text-xs leading-6 text-slate-600">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    {bullet}
                  </div>
                ))}
              </div>
            ) : null}
            {block.example ? (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-600">
                  {block.example.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-emerald-900">{block.example.text}</p>
              </div>
            ) : null}
          </section>
        ))}

        {item.practice ? (
          <section className="rounded-[24px] border border-violet-100 bg-violet-50/55 px-6 py-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-violet-900">
              <Lightbulb className="h-4 w-4" /> 练习：先想，再看示范
            </h3>
            <p className="mt-4 text-sm font-medium leading-7 text-slate-800">{item.practice.question}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white/75 px-5 py-4">
                <p className="text-xs font-semibold text-slate-700">思考顺序</p>
                <ol className="mt-3 space-y-2">
                  {item.practice.thinking.map((step, index) => (
                    <li key={step} className="flex gap-2 text-xs leading-5 text-slate-600">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-white px-5 py-4">
                <p className="text-xs font-semibold text-violet-700">参考示范</p>
                <p className="mt-3 text-xs leading-6 text-slate-600">{item.practice.sample}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[24px] border border-amber-100 bg-amber-50/60 px-6 py-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> 常见扣分点
          </h3>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {item.pitfalls.map((pitfall) => (
              <div key={pitfall} className="flex items-start gap-2 rounded-2xl bg-white/75 px-4 py-3 text-xs leading-5 text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                {pitfall}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/60 bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-sm font-semibold">把知识转成真实回答</p>
            <p className="mt-1 text-xs text-white/55">用 AI 面试或回答优化验证你是否真的会用。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/interview"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-slate-900 transition hover:bg-slate-100"
            >
              去 AI 面试 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-white/16"
            >
              AI 优化回答
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const trackProgress = (trackId: LearningTrackId) => {
    const items = allLearningItems.filter((item) => item.trackId === trackId);
    const completed = items.filter((item) => progressMap.get(item.id) === "completed").length;
    return { completed, total: items.length, percent: Math.round((completed / items.length) * 100) };
  };

  return (
    <>
      <div className="mx-auto max-w-[1480px]">
        <header className="rise-in overflow-hidden rounded-[30px] border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(236,245,255,0.66))] px-6 py-7 shadow-[0_20px_60px_rgba(40,74,120,0.10)] md:px-9 md:py-9">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/60 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
                <Sparkles className="h-3 w-3 text-sky-500" /> Interview Learning Center
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                民航面试能力训练库
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                不是背答案，而是按“岗位逻辑、表达结构、行业知识、实战训练”建立稳定的面试能力。
              </p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
              {[
                ["内容", allLearningItems.length],
                ["完成", completedCount],
                ["进度", `${completionRate}%`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-20 rounded-2xl bg-white/70 px-4 py-3 text-center">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-6">
            <div className="glass-panel p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedItemId(null);
                  }}
                  placeholder="搜索知识与训练"
                  className="w-full rounded-2xl border border-white/65 bg-white/70 py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300"
                />
              </div>

              <nav className="mt-3 space-y-1.5">
                {learningTracks.map((track) => {
                  const meta = navMeta[track.id];
                  const Icon = meta.icon;
                  const itemCount = track.modules.reduce((sum, module) => sum + module.items.length, 0);
                  const active = view === track.id && !selectedItemId;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => selectView(track.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition ${
                        active
                          ? "bg-slate-950 text-white shadow-lg"
                          : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-white`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{track.label}</span>
                        <span className={`mt-0.5 block text-[10px] ${active ? "text-white/55" : "text-slate-400"}`}>
                          {itemCount} 个训练主题
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="my-3 h-px bg-white/55" />
              <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                我的学习
              </p>
              <nav className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => selectView("favorites")}
                  className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-xs font-medium transition ${
                    view === "favorites" ? "bg-amber-50 text-amber-800" : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" /> 我的收藏
                  </span>
                  <span>{favorites.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectView("progress")}
                  className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-xs font-medium transition ${
                    view === "progress" ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> 学习进度
                  </span>
                  <span>{completedCount}</span>
                </button>
              </nav>
            </div>
          </aside>

          <main className="min-w-0">
            {selectedItem ? (
              renderItemDetail(selectedItem)
            ) : search.trim() ? (
              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Search Results</p>
                    <h2 className="mt-1.5 text-xl font-semibold text-slate-950">搜索“{search}”</h2>
                  </div>
                  <span className="text-xs text-slate-400">{searchedItems.length} 个结果</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {searchedItems.map(renderItemCard)}
                </div>
                {searchedItems.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-white/70 bg-white/50 px-6 py-14 text-center text-sm text-slate-400">
                    没有找到相关内容
                  </div>
                ) : null}
              </section>
            ) : view === "favorites" ? (
              <section>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Saved</p>
                  <h2 className="mt-1.5 text-xl font-semibold text-slate-950">我的收藏</h2>
                  <p className="mt-1 text-xs text-slate-500">集中复习你标记过的高频内容和训练主题。</p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {favoriteItems.map(renderItemCard)}
                </div>
                {favoriteItems.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-white/70 bg-white/50 px-6 py-14 text-center">
                    <Bookmark className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">还没有收藏内容</p>
                  </div>
                ) : null}
              </section>
            ) : view === "progress" ? (
              <section>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Progress</p>
                  <h2 className="mt-1.5 text-xl font-semibold text-slate-950">学习进度</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    已完成 {completedCount} 项，学习中 {inProgressCount} 项。
                  </p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {progressItems.map(renderItemCard)}
                </div>
                {progressItems.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-white/70 bg-white/50 px-6 py-14 text-center">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">打开内容并标记完成，进度会显示在这里</p>
                  </div>
                ) : null}
                {history.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-slate-800">最近学习</h3>
                    <div className="mt-3 space-y-2">
                      {history.slice(0, 5).map((record) => (
                        <button
                          key={`${record.itemId}-${record.viewedAt}`}
                          type="button"
                          onClick={() => {
                            const item = allLearningItems.find((entry) => entry.id === record.itemId);
                            if (item) openItem(item);
                          }}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/55 px-4 py-3 text-left text-xs text-slate-600 transition hover:bg-white"
                        >
                          <span className="truncate">{record.title}</span>
                          <span className="ml-4 shrink-0 text-[10px] text-slate-400">
                            {new Date(record.viewedAt).toLocaleDateString("zh-CN")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : currentTrack ? (
              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      Learning Track
                    </p>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
                      {currentTrack.label}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{currentTrack.description}</p>
                  </div>
                  <div className="min-w-40 rounded-2xl bg-white/60 px-4 py-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>本模块进度</span>
                      <span>{trackProgress(currentTrack.id).percent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                        style={{ width: `${trackProgress(currentTrack.id).percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-7">
                  {currentTrack.modules.map((learningModule) => (
                    <div key={learningModule.id}>
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-slate-900">{learningModule.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{learningModule.description}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {learningModule.items.map(renderItemCard)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>

      <LoginModal {...loginModalProps} />
    </>
  );
}
