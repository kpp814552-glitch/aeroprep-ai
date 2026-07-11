"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronDown, ChevronRight, ChevronLeft, Plane, Users, Wrench, GraduationCap, Briefcase } from "lucide-react";
import { learningCategories } from "@/lib/learning-center/data";
import { getFavorites, toggleFavorite, addHistory, getHistory } from "@/lib/learning-center/storage";
import type { LearningItem } from "@/lib/learning-center/types";

const roleLabels: Record<string, { label: string; icon: any; color: string }> = {
  pilot: { label: "飞行员", icon: Plane, color: "text-blue-600 bg-blue-50" },
  cabin: { label: "乘务员", icon: Users, color: "text-rose-600 bg-rose-50" },
  maintenance: { label: "机务维修", icon: Wrench, color: "text-emerald-600 bg-emerald-50" },
};

export default function LearningCenterClient() {
  const [activeCategory, setActiveCategory] = useState("questions");
  const [activeSub, setActiveSub] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | "pilot" | "cabin" | "maintenance">("all");
  const [recruitFilter, setRecruitFilter] = useState<"all" | "campus" | "experienced">("all");

  useEffect(() => {
    setFavorites(getFavorites().map((f) => f.itemId));
    setHistory(getHistory().map((h) => h.itemId));
  }, []);

  useEffect(() => {
    const cat = learningCategories.find((c) => c.id === activeCategory);
    if (cat && cat.subcategories.length > 0 && !activeSub) {
      setActiveSub(cat.subcategories[0].id);
    }
  }, [activeCategory, activeSub]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!prev[id]) {
        const cat = learningCategories.find((c) =>
          c.subcategories.some((s) => s.items.some((i) => i.id === id))
        );
        if (cat) {
          const item = cat.subcategories
            .flatMap((s) => s.items)
            .find((i) => i.id === id);
          if (item) {
            addHistory({
              itemId: id,
              categoryLabel: cat.label,
              title: item.title,
              viewedAt: new Date().toISOString(),
            });
            setHistory(getHistory().map((h) => h.itemId));
          }
        }
      }
      return next;
    });
  };

  const handleToggleFav = (item: LearningItem, catLabel: string, subLabel: string) => {
    const newFavs = toggleFavorite({
      itemId: item.id,
      categoryLabel: catLabel,
      subcategoryLabel: subLabel,
      title: item.title,
      savedAt: new Date().toISOString(),
    });
    setFavorites(newFavs.map((f) => f.itemId));
  };

  const cat = learningCategories.find((c) => c.id === activeCategory);
  const sub = cat?.subcategories.find((s) => s.id === activeSub);

  const favItems = useMemo(() => {
    if (activeCategory !== "records") return null;
    if (activeSub === "rec-fav") {
      const favs = getFavorites();
      const items: Array<{ item: LearningItem; catLabel: string; subLabel: string }> = [];
      for (const fav of favs) {
        for (const c of learningCategories) {
          for (const s of c.subcategories) {
            const found = s.items.find((i) => i.id === fav.itemId);
            if (found) items.push({ item: found, catLabel: c.label, subLabel: s.label });
          }
        }
      }
      return items;
    }
    if (activeSub === "rec-history") {
      const hist = getHistory();
      const items: Array<{ item: LearningItem; catLabel: string; subLabel: string }> = [];
      for (const h of hist) {
        for (const c of learningCategories) {
          for (const s of c.subcategories) {
            const found = s.items.find((i) => i.id === h.itemId);
            if (found) items.push({ item: found, catLabel: c.label, subLabel: s.label });
          }
        }
      }
      return items;
    }
    return null;
  }, [activeCategory, activeSub]);

  const displayItems = favItems || (sub?.items || []);

  const hasRoleItems = useMemo(() => {
    if (!sub) return false;
    return sub.items.some((i) => i.role !== undefined);
  }, [sub]);

  // Combined filter: role + recruitment type
  const filteredItems = useMemo(() => {
    return displayItems.filter((r: any) => {
      const item = r.item || r;
      // Role filter
      if (roleFilter !== "all" && item.role && item.role !== roleFilter) return false;
      // Recruitment type filter (using tags)
      if (recruitFilter !== "all") {
        const tags = item.tags || [];
        const tagMatch = recruitFilter === "campus" ? tags.includes("校招") : tags.includes("社招");
        if (!tagMatch) return false;
      }
      return true;
    });
  }, [displayItems, roleFilter, recruitFilter]);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] gap-0 lg:gap-5">
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/80 shadow-lg backdrop-blur-md lg:hidden"
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <aside className={`${sidebarOpen ? "block" : "hidden"} w-full shrink-0 lg:block lg:w-72`}>
        <div className="sticky top-4 space-y-1 rounded-[24px] border border-white/40 bg-white/70 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <p className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">面试流程导航</p>
          {learningCategories.map((c) => (
            <div key={c.id}>
              <button
                type="button"
                onClick={() => { setActiveCategory(c.id); setActiveSub(""); setRoleFilter("all"); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                  activeCategory === c.id ? "bg-sky-100/70 text-sky-800 font-medium" : "text-slate-600 hover:bg-white/60"
                }`}
              >
                {activeCategory === c.id ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                {c.label}
              </button>
              {activeCategory === c.id && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-sky-200/60 pl-2">
                  {c.subcategories.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setActiveSub(s.id); setRoleFilter("all"); setRecruitFilter("all"); setSidebarOpen(false); }}
                      className={`block w-full rounded-xl px-3 py-1.5 text-left text-xs transition ${
                        activeSub === s.id ? "bg-sky-50/80 text-sky-700 font-medium" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Filter bar: recruitment type + position */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[20px] border border-white/40 bg-white/70 px-4 py-3 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          {/* Recruitment type filter */}
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">招聘</span>
            <button
              type="button"
              onClick={() => setRecruitFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                recruitFilter === "all"
                  ? "bg-sky-100 text-sky-700 shadow-sm"
                  : "bg-white/60 text-slate-500 hover:bg-white/80"
              }`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setRecruitFilter("campus")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                recruitFilter === "campus"
                  ? "bg-violet-100 text-violet-700 shadow-sm"
                  : "bg-white/60 text-slate-500 hover:bg-white/80"
              }`}
            >
              <GraduationCap className="h-3 w-3" />
              校招
            </button>
            <button
              type="button"
              onClick={() => setRecruitFilter("experienced")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                recruitFilter === "experienced"
                  ? "bg-amber-100 text-amber-700 shadow-sm"
                  : "bg-white/60 text-slate-500 hover:bg-white/80"
              }`}
            >
              <Briefcase className="h-3 w-3" />
              社招
            </button>
          </div>

          {/* Divider */}
          <div className="hidden h-5 w-px bg-slate-200/60 sm:block" />

          {/* Position filter */}
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">岗位</span>
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                roleFilter === "all"
                  ? "bg-sky-100 text-sky-700 shadow-sm"
                  : "bg-white/60 text-slate-500 hover:bg-white/80"
              }`}
            >
              全部
            </button>
            {(["pilot", "cabin", "maintenance"] as const).map((key) => {
              const r = roleLabels[key];
              const Icon = r.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleFilter(key)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                    roleFilter === key
                      ? `${r.color} shadow-sm`
                      : "bg-white/60 text-slate-500 hover:bg-white/80"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {cat && (
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
            <span>{cat.label}</span>
            {sub && <><span className="text-slate-300">/</span><span className="text-slate-700 font-medium">{sub.label}</span></>
}
          </div>
        )}

        <div className="space-y-3">
          {filteredItems.map((result: any, idx: number) => {
            const item = result.item || result;
            const catLabel = result.catLabel || cat?.label || "";
            const subLabel = result.subLabel || sub?.label || "";
            const isExpanded = expandedItems[item.id] || false;
            const isFav = favorites.includes(item.id);
            const roleInfo = item.role ? roleLabels[item.role] : null;
            const RoleIcon = roleInfo?.icon;
            const tags = item.tags || [];
            const hasRecruitTag = tags.includes("校招") || tags.includes("社招");

            return (
              <div
                key={item.id}
                className="rounded-[20px] border border-white/40 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {roleInfo && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${roleInfo.color}`}>
                          {RoleIcon && <RoleIcon className="h-2.5 w-2.5" />}
                          {roleInfo.label}
                        </span>
                      )}
                      {hasRecruitTag && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                          tags.includes("校招") ? "bg-violet-50 text-violet-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {tags.includes("校招") ? <GraduationCap className="h-2.5 w-2.5" /> : <Briefcase className="h-2.5 w-2.5" />}
                          {tags.includes("校招") ? "校招" : "社招"}
                        </span>
                      )}
                      {catLabel && (
                        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] text-sky-600">{catLabel}</span>
                      )}
                      {item.frequency && (
                        <span className="text-[10px] text-amber-600">
                          {"★".repeat(item.frequency)}
                          {"☆".repeat(5 - item.frequency)}
                        </span>
                      )}
                      {item.difficulty && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                          item.difficulty === "入门" ? "bg-emerald-50 text-emerald-600" :
                          item.difficulty === "中级" ? "bg-amber-50 text-amber-600" :
                          item.difficulty === "高级" ? "bg-rose-50 text-rose-600" :
                          "bg-slate-50 text-slate-500"
                        }`}>
                          {item.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleToggleFav(item, catLabel, subLabel); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleToggleFav(item, catLabel, subLabel); }}
                      className="inline-flex"
                    >
                      {isFav ? (
                        <BookmarkCheck className="h-4 w-4 text-sky-500" />
                      ) : (
                        <Bookmark className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-300 transition ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/40 px-5 py-4">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-7 text-slate-700 [&_strong]:text-slate-900 [&_strong]:font-semibold">
                      {item.content}
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag: string) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && !favItems && (
          <div className="rounded-[20px] border border-white/40 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
            {recruitFilter !== "all" || roleFilter !== "all"
              ? "当前筛选条件下没有内容，试试调整筛选条件"
              : "该分类暂无内容"}
          </div>
        )}
      </div>
    </div>
  );
}
