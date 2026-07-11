"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Bookmark, BookmarkCheck, Clock, ChevronDown, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { learningCategories } from "@/lib/learning-center/data";
import { getFavorites, toggleFavorite, addHistory, getHistory } from "@/lib/learning-center/storage";
import type { LearningItem, LearningCategory } from "@/lib/learning-center/types";

export default function LearningCenterClient() {
  const [activeCategory, setActiveCategory] = useState("questions");
  const [activeSub, setActiveSub] = useState("");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load saved data
  useEffect(() => {
    setFavorites(getFavorites().map((f) => f.itemId));
    setHistory(getHistory().map((h) => h.itemId));
  }, []);

  // Set first subcategory as default
  useEffect(() => {
    const cat = learningCategories.find((c) => c.id === activeCategory);
    if (cat && cat.subcategories.length > 0 && !activeSub) {
      setActiveSub(cat.subcategories[0].id);
    }
  }, [activeCategory, activeSub]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // Track history when expanding
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

  // Search logic
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: Array<{ item: LearningItem; catLabel: string; subLabel: string }> = [];
    for (const c of learningCategories) {
      for (const s of c.subcategories) {
        for (const item of s.items) {
          if (
            item.title.toLowerCase().includes(q) ||
            item.content.toLowerCase().includes(q) ||
            (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
          ) {
            results.push({ item, catLabel: c.label, subLabel: s.label });
          }
        }
      }
    }
    return results.slice(0, 50);
  }, [search]);

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

  return (
    <div className="flex min-h-[calc(100vh-10rem)] gap-0 lg:gap-5">
      {/* Sidebar Toggle (mobile) */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/80 shadow-lg backdrop-blur-md lg:hidden"
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Left Sidebar */}
      <aside className={`${sidebarOpen ? 'block' : 'hidden'} w-full shrink-0 lg:block lg:w-72`}>
        <div className="sticky top-4 space-y-1 rounded-[24px] border border-white/40 bg-white/70 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <p className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">分类导航</p>
          {learningCategories.map((c) => (
            <div key={c.id}>
              <button
                type="button"
                onClick={() => { setActiveCategory(c.id); setActiveSub(""); setSidebarOpen(false); }}
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
                      onClick={() => { setActiveSub(s.id); setSidebarOpen(false); }}
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

      {/* Right Content */}
      <div className="min-w-0 flex-1">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索面试题目、技巧、知识点..."
            className="w-full rounded-[20px] border border-white/40 bg-white/70 px-4 py-3.5 pl-11 text-sm text-slate-800 outline-none backdrop-blur-md placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200/50"
          />
        </div>

        {/* Breadcrumb */}
        {!search && cat && (
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
            <span>{cat.label}</span>
            {sub && <><span className="text-slate-300">/</span><span className="text-slate-700 font-medium">{sub.label}</span></>
}
          </div>
        )}

        {/* Results info */}
        {search && searchResults && (
          <p className="mb-4 text-xs text-slate-500">找到 {searchResults.length} 个结果</p>
        )}
        {search && searchResults?.length === 0 && (
          <div className="rounded-[20px] border border-white/40 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
            未找到相关内容，请尝试其他关键词
          </div>
        )}

        {/* Items */}
        <div className="space-y-3">
          {(search ? (searchResults ?? []) : displayItems).map((result: any, idx: number) => {
            const item = result.item || result;
            const catLabel = result.catLabel || cat?.label || "";
            const subLabel = result.subLabel || sub?.label || "";
            const isExpanded = expandedItems[item.id] || false;
            const isFav = favorites.includes(item.id);

            return (
              <div
                key={item.id}
                className="rounded-[20px] border border-white/40 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              >
                {/* Header - clickable to expand */}
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {result.catLabel && (
                        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] text-sky-600">{result.catLabel}</span>
                      )}
                      {item.frequency && (
                        <span className="text-[10px] text-amber-600">
                          {'★'.repeat(item.frequency)}{'☆'.repeat(5 - item.frequency)}
                        </span>
                      )}
                      {item.difficulty && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                          item?.difficulty === '入门' ? 'bg-emerald-50 text-emerald-600' :
                          item.difficulty === '中级' ? 'bg-amber-50 text-amber-600' :
                          item.difficulty === '高级' ? 'bg-rose-50 text-rose-600' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {item.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Favorite */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleToggleFav(item, catLabel, subLabel); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleToggleFav(item, catLabel, subLabel); }}
                      className="inline-flex"
                    >
                      {isFav ? (
                        <BookmarkCheck className="h-4 w-4 text-sky-500" />
                      ) : (
                        <Bookmark className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                      )}
                    </span>
                    {/* Expand indicator */}
                    <ChevronDown className={`h-4 w-4 text-slate-300 transition ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-white/40 px-5 py-4">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-7 text-slate-700 [&_strong]:text-slate-900 [&_strong]:font-semibold">
                      {item.content}
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags?.map((tag: string) => (
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
      </div>
    </div>
  );
}
