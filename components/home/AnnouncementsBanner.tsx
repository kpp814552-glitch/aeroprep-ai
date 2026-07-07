"use client";

import { useEffect, useState } from "react";
import { Info, AlertTriangle, AlertCircle, Megaphone, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = { title: string; content: string; type: string; created_at: string };

const typeMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  info: { label: "通知", icon: Info, color: "text-blue-600 bg-blue-100/60" },
  warning: { label: "警告", icon: AlertTriangle, color: "text-amber-600 bg-amber-100/60" },
  important: { label: "重要", icon: AlertCircle, color: "text-rose-600 bg-rose-100/60" },
  update: { label: "更新", icon: Megaphone, color: "text-violet-600 bg-violet-100/60" },
};

function shouldSuppress(id: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem("aeroprep_dismissed_announcements");
    if (!raw) return false;
    const map: Record<string, string> = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return map[id] === today;
  } catch { return false; }
}

function markDismissed(id: string, untilTomorrow: boolean) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("aeroprep_dismissed_announcements");
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[id] = untilTomorrow ? new Date().toISOString().slice(0, 10) : "forever";
    localStorage.setItem("aeroprep_dismissed_announcements", JSON.stringify(map));
  } catch { /* ignore */ }
}

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => {
        const list: Announcement[] = d.announcements || [];
        setAnnouncements(list);
        const first = list.find((a) => !shouldSuppress(a.title + a.created_at));
        if (first) setVisibleId(first.title + first.created_at);
      })
      .catch(() => {});
  }, []);

  const visible = announcements.find((a) => a.title + a.created_at === visibleId);
  if (!visible) return null;

  const meta = typeMeta[visible.type] || typeMeta.info;
  const Icon = meta.icon;

  function handleClose() {
    markDismissed(visibleId!, dontShowToday);
    setVisibleId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/40 bg-white/70 shadow-[0_24px_64px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        {/* 顶部装饰光晕 */}
        <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative px-6 py-7 md:px-8 md:py-8">
          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition hover:bg-white/50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 头部标识 */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
            <Sparkles className="h-4 w-4 text-blue-500" />
            {visible.type === "update" ? "最新更新" : "平台公告"}
          </div>

          {/* 标题 */}
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
            {visible.title}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {new Date(visible.created_at).toLocaleDateString("zh-CN")}
          </p>

          {/* 类型标签 */}
          <span className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            meta.color
          )}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>

          {/* 内容 */}
          <div className="mt-4 max-h-[35vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/40 bg-white/40 px-4 py-4 text-sm leading-7 text-slate-700">
            {visible.content}
          </div>

          {/* 底部操作 */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500 select-none hover:text-slate-700 transition">
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
              />
              今天不再显示
            </label>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-[rgba(37,113,255,0.88)] px-6 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,113,255,0.2)]"
            >
              知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
