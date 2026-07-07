"use client";

import { useEffect, useState } from "react";
import { Info, AlertTriangle, AlertCircle, Megaphone, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = { title: string; content: string; type: string; created_at: string };

const typeStyles: Record<string, string> = {
  info: "border-blue-200 bg-blue-50/70 text-blue-800",
  warning: "border-amber-200 bg-amber-50/70 text-amber-800",
  important: "border-rose-200 bg-rose-50/70 text-rose-800",
  update: "border-violet-200 bg-violet-50/70 text-violet-800",
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info, warning: AlertTriangle, important: AlertCircle, update: Megaphone,
};

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements || []))
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.title + a.created_at));
  if (visible.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-2 px-5 pt-6 md:px-8">
      {visible.slice(0, 2).map((a) => {
        const Icon = typeIcons[a.type] || Info;
        return (
          <div key={a.title + a.created_at} className={cn("relative rounded-2xl border px-4 py-3 pr-10 text-sm", typeStyles[a.type] || typeStyles.info)}>
            <div className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="mt-0.5 opacity-80 whitespace-pre-wrap line-clamp-2">{a.content}</p>
              </div>
            </div>
            <button type="button" onClick={() => setDismissed((s) => new Set(s).add(a.title + a.created_at))}
              className="absolute right-3 top-3 rounded-full p-0.5 opacity-60 hover:opacity-100 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
