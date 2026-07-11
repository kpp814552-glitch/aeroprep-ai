"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark, BookmarkCheck, ChevronDown,
  Plane, Users, Wrench, GraduationCap, Briefcase,
  ClipboardList, Radar, Cpu, Building2, Shield, Ticket, Plus
} from "lucide-react";
import { learningCategories } from "@/lib/learning-center/data";
import { getFavorites, toggleFavorite, addHistory } from "@/lib/learning-center/storage";
import { getUserMaterials, saveUserMaterial, checkQuality, checkViolation, type UserMaterial } from "@/lib/learning-center/user-storage";
import type { LearningItem } from "@/lib/learning-center/types";

const positionLabels: Record<string, { label: string; icon: any; color: string }> = {
  pilot: { label: "飞行员", icon: Plane, color: "text-blue-600 bg-blue-50" },
  dispatcher: { label: "签派员", icon: ClipboardList, color: "text-indigo-600 bg-indigo-50" },
  atc: { label: "空管员", icon: Radar, color: "text-cyan-600 bg-cyan-50" },
  maintenance: { label: "机务维修", icon: Wrench, color: "text-emerald-600 bg-emerald-50" },
  avionics: { label: "航电工程师", icon: Cpu, color: "text-purple-600 bg-purple-50" },
  cabin: { label: "空乘", icon: Users, color: "text-rose-600 bg-rose-50" },
  "airport-ops": { label: "机场运行", icon: Building2, color: "text-teal-600 bg-teal-50" },
  "cabin-safety": { label: "客舱安全员", icon: Shield, color: "text-orange-600 bg-orange-50" },
  "terminal-service": { label: "航站楼服务", icon: Ticket, color: "text-slate-600 bg-slate-100" },
};

const categoryButtons = learningCategories
  .filter((c) => c.id !== "records")
  .map((c) => ({ id: c.id, label: c.label }));
categoryButtons.push({ id: "records", label: "⭐ 收藏" });
categoryButtons.push({ id: "my-uploads", label: "📤 我的上传" });

export default function LearningCenterClient() {
  const [contentFilter, setContentFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [recruitFilter, setRecruitFilter] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", content: "", recruitType: "" as const, role: "" as const, category: "" as const });
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
  const [userMaterials, setUserMaterials] = useState<UserMaterial[]>([]);
  const [umKey, setUmKey] = useState(0);

  useEffect(() => {
    setFavorites(getFavorites().map((f) => f.itemId));
    setUserMaterials(getUserMaterials());
  }, []);

  const allItems = useMemo(() => {
    const items: Array<{ item: LearningItem; catLabel: string; subLabel: string }> = [];
    for (const c of learningCategories) {
      for (const s of c.subcategories) {
        for (const item of s.items) {
          items.push({ item, catLabel: c.label, subLabel: s.label });
        }
      }
    }
    return items;
  }, []);

  // Merge user materials into display
  const allItemsWithUploads = useMemo(() => {
    const items = [...allItems];
    const uMaterials = getUserMaterials();
    for (const m of uMaterials) {
      // Map recruitType to tags for filtering
      const tags: string[] = [];
      if (m.recruitType) tags.push(m.recruitType);
      tags.push("用户上传");
      if (m.isHighQuality) tags.push("优质投稿");

      items.push({
        item: {
          id: m.id,
          title: m.title,
          content: m.content,
          role: m.role || undefined,
          tags,
        } as LearningItem,
        catLabel: learningCategories.find((c) => c.id === m.category)?.label || "用户上传",
        subLabel: m.isHighQuality ? "优质经验" : "用户分享",
      });
    }
    return items;
  }, [allItems, umKey]);

  // Handle upload submission
  const handleUpload = () => {
    const result = saveUserMaterial({
      title: uploadForm.title.trim(),
      content: uploadForm.content.trim(),
      recruitType: uploadForm.recruitType,
      role: uploadForm.role,
      category: uploadForm.category,
    });
    if (!result.success) {
      setUploadErrors(result.errors.map((e) => e.message));
      return;
    }
    // Quality check
    const quality = checkQuality(uploadForm.content);
    if (!quality.isGood) {
      setQualityWarnings(quality.suggestions);
    } else {
      setQualityWarnings([]);
    }
    setUploadForm({ title: "", content: "", recruitType: "" as const, role: "" as const, category: "" as const });
    setUploadErrors([]);
    setShowUpload(false);
    setUserMaterials(getUserMaterials());
    setUmKey((k) => k + 1);
  };

  const filteredItems = useMemo(() => {
    // Content filter: flatten from category
    let source = allItemsWithUploads;
    if (contentFilter === "my-uploads") {
      // Only show user materials
      source = allItemsWithUploads.filter(({ item }) => item.tags?.includes("用户上传"));
    } else
    if (contentFilter !== "all" && contentFilter !== "records") {
      const cat = learningCategories.find((c) => c.id === contentFilter);
      source = cat
        ? cat.subcategories.flatMap((s) =>
            s.items.map((item) => ({ item, catLabel: cat.label, subLabel: s.label }))
          )
        : [];
    }

    // Position filter
    if (positionFilter !== "all") {
      source = source.filter(({ item }) => item.role === positionFilter);
    }

    // Recruit type filter
    if (recruitFilter !== "all") {
      source = source.filter(({ item }) => {
        const tags = item.tags || [];
        return recruitFilter === "campus" ? tags.includes("校招") : tags.includes("社招");
      });
    }

    return source;
  }, [allItemsWithUploads, contentFilter, positionFilter, recruitFilter]);

  const favoriteItems = useMemo(() => {
    if (contentFilter !== "records") return null;
    const favs = getFavorites();
    const items: Array<{ item: LearningItem; catLabel: string; subLabel: string }> = [];
    for (const fav of favs) {
      for (const c of learningCategories) {
        for (const s of c.subcategories) {
          const found = s.items.find((i) => i.id === fav.itemId);
          if (found) {
            // Apply filters on favorites too
            let skip = false;
            if (positionFilter !== "all" && found.role !== positionFilter) skip = true;
            if (recruitFilter !== "all") {
              const tags = found.tags || [];
              if (!tags.includes(recruitFilter === "campus" ? "校招" : "社招")) skip = true;
            }
            if (!skip) items.push({ item: found, catLabel: c.label, subLabel: s.label });
          }
        }
      }
    }
    return items;
  }, [contentFilter, positionFilter, recruitFilter]);

  const toggleExpand = (item: LearningItem, catLabel: string) => {
    setExpandedItems((prev) => {
      const next = { ...prev, [item.id]: !prev[item.id] };
      if (!prev[item.id]) {
        addHistory({
          itemId: item.id,
          categoryLabel: catLabel,
          title: item.title,
          viewedAt: new Date().toISOString(),
        });
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

  const displayItems = contentFilter === "records" ? (favoriteItems || []) : filteredItems;

  const isFilterActive = contentFilter !== "all" || positionFilter !== "all" || recruitFilter !== "all";
  
  // Active filter labels for display
  const filterLabels: string[] = [];
  if (recruitFilter !== "all") filterLabels.push(recruitFilter === "campus" ? "校招" : "社招");
  if (positionFilter !== "all") filterLabels.push(positionLabels[positionFilter]?.label || positionFilter);
  if (contentFilter !== "all" && contentFilter !== "records") {
    const f = learningCategories.find((c) => c.id === contentFilter);
    if (f) filterLabels.push(f.label);
  }
  if (contentFilter === "records") filterLabels.push("⭐ 收藏");

  const FilterBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition ${
        active ? "bg-sky-100 text-sky-700 shadow-sm" : "bg-white/60 text-slate-500 hover:bg-white/80"
      }`}
    >
      {children}
    </button>
  );

  // Upload Modal
  const UploadModal = showUpload ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm" onClick={() => { setShowUpload(false); setUploadErrors([]); setQualityWarnings([]); }}>
      <div className="w-full max-w-lg rounded-[24px] border border-white/40 bg-white p-6 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">上传面试经验</h2>
        <p className="mb-4 text-xs text-slate-400">分享你的面试经验或学习笔记，帮助其他考生</p>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">标题 *</label>
            <input type="text" value={uploadForm.title} onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="给你的经验起个标题" className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">内容 *</label>
            <textarea value={uploadForm.content} onChange={(e) => setUploadForm((p) => ({ ...p, content: e.target.value }))}
              rows={6} placeholder="写下你的面试经验、答题思路或学习笔记……

建议加入真实经历和行业细节，内容越具体对他人帮助越大"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 resize-y" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">招聘方式 *</label>
              <select value={uploadForm.recruitType} onChange={(e) => setUploadForm((p) => ({ ...p, recruitType: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                <option value="校招">校招</option>
                <option value="社招">社招</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">岗位 *</label>
              <select value={uploadForm.role} onChange={(e) => setUploadForm((p) => ({ ...p, role: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                {Object.entries(positionLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">分类 *</label>
              <select value={uploadForm.category} onChange={(e) => setUploadForm((p) => ({ ...p, category: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                {categoryButtons.filter((c) => c.id !== "records" && c.id !== "my-uploads").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {uploadErrors.length > 0 && (
            <div className="rounded-xl bg-rose-50 px-3 py-2">
              {uploadErrors.map((e, i) => <p key={i} className="text-xs text-rose-600">⚠ {e}</p>)}
            </div>
          )}

          {qualityWarnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-700 mb-1">内容优化建议：</p>
              {qualityWarnings.map((w, i) => <p key={i} className="text-xs text-amber-600">• {w}</p>)}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowUpload(false); setUploadErrors([]); setQualityWarnings([]); }}
              className="rounded-full bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white/80">取消</button>
            <button type="button" onClick={handleUpload}
              className="rounded-full bg-sky-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-600">提交素材</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ====== Row 1: 招聘方式 ====== */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-[20px] border border-white/40 bg-white/70 px-4 py-2.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">招聘方式</span>
        <FilterBtn active={recruitFilter === "all"} onClick={() => setRecruitFilter("all")}>全部</FilterBtn>
        <FilterBtn active={recruitFilter === "campus"} onClick={() => setRecruitFilter("campus")}>
          <GraduationCap className="-ml-0.5 mr-0.5 inline h-3 w-3" />校招
        </FilterBtn>
        <FilterBtn active={recruitFilter === "experienced"} onClick={() => setRecruitFilter("experienced")}>
          <Briefcase className="-ml-0.5 mr-0.5 inline h-3 w-3" />社招
        </FilterBtn>
      </div>

      {/* ====== Row 2: 岗位 ====== */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-[20px] border border-white/40 bg-white/70 px-4 py-2.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">岗位</span>
        <FilterBtn active={positionFilter === "all"} onClick={() => setPositionFilter("all")}>全部</FilterBtn>
        {Object.entries(positionLabels).map(([key, p]) => {
          const Icon = p.icon;
          // Upload Modal
  const UploadModal = showUpload ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm" onClick={() => { setShowUpload(false); setUploadErrors([]); setQualityWarnings([]); }}>
      <div className="w-full max-w-lg rounded-[24px] border border-white/40 bg-white p-6 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">上传面试经验</h2>
        <p className="mb-4 text-xs text-slate-400">分享你的面试经验或学习笔记，帮助其他考生</p>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">标题 *</label>
            <input type="text" value={uploadForm.title} onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="给你的经验起个标题" className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">内容 *</label>
            <textarea value={uploadForm.content} onChange={(e) => setUploadForm((p) => ({ ...p, content: e.target.value }))}
              rows={6} placeholder="写下你的面试经验、答题思路或学习笔记……

建议加入真实经历和行业细节，内容越具体对他人帮助越大"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 resize-y" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">招聘方式 *</label>
              <select value={uploadForm.recruitType} onChange={(e) => setUploadForm((p) => ({ ...p, recruitType: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                <option value="校招">校招</option>
                <option value="社招">社招</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">岗位 *</label>
              <select value={uploadForm.role} onChange={(e) => setUploadForm((p) => ({ ...p, role: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                {Object.entries(positionLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">分类 *</label>
              <select value={uploadForm.category} onChange={(e) => setUploadForm((p) => ({ ...p, category: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                {categoryButtons.filter((c) => c.id !== "records" && c.id !== "my-uploads").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {uploadErrors.length > 0 && (
            <div className="rounded-xl bg-rose-50 px-3 py-2">
              {uploadErrors.map((e, i) => <p key={i} className="text-xs text-rose-600">⚠ {e}</p>)}
            </div>
          )}

          {qualityWarnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-700 mb-1">内容优化建议：</p>
              {qualityWarnings.map((w, i) => <p key={i} className="text-xs text-amber-600">• {w}</p>)}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowUpload(false); setUploadErrors([]); setQualityWarnings([]); }}
              className="rounded-full bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white/80">取消</button>
            <button type="button" onClick={handleUpload}
              className="rounded-full bg-sky-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-600">提交素材</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
            <FilterBtn key={key} active={positionFilter === key} onClick={() => setPositionFilter(key)}>
              <Icon className="-ml-0.5 mr-0.5 inline h-3 w-3" />{p.label}
            </FilterBtn>
          );
        })}
      </div>

      {/* ====== Row 3: 内容分类 ====== */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[20px] border border-white/40 bg-white/70 px-4 py-2.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">内容分类</span>
        <FilterBtn active={contentFilter === "all"} onClick={() => setContentFilter("all")}>全部</FilterBtn>
        {categoryButtons.map((c) => (
          <FilterBtn key={c.id} active={contentFilter === c.id} onClick={() => setContentFilter(c.id)}>
            {c.label}
          </FilterBtn>
        ))}
      </div>

      {/* ====== Content ====== */}
      {displayItems.length === 0 ? (
        <div className="rounded-[20px] border border-white/40 bg-white/60 px-6 py-10 text-center">
          <p className="text-sm text-slate-500">
            当前筛选条件下没有内容
            {filterLabels.length > 0 && <span>（{filterLabels.join(" · ")})</span>}
          </p>
          <button
            type="button"
            onClick={() => { setContentFilter("all"); setPositionFilter("all"); setRecruitFilter("all"); }}
            className="mt-3 rounded-full bg-sky-100 px-4 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200 transition"
          >
            清除筛选
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            共 {displayItems.length} 项
            {filterLabels.length > 0 && <span>（{filterLabels.join(" · ")})</span>}
          </p>

          {displayItems.map(({ item, catLabel, subLabel }) => {
            const isExpanded = expandedItems[item.id] || false;
            const isFav = favorites.includes(item.id);
            const roleInfo = item.role ? positionLabels[item.role] : null;
            const RoleIcon = roleInfo?.icon;
            const tags = item.tags || [];
            const hasRecruitTag = tags.includes("校招") || tags.includes("社招");

            // Upload Modal
  const UploadModal = showUpload ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm" onClick={() => { setShowUpload(false); setUploadErrors([]); setQualityWarnings([]); }}>
      <div className="w-full max-w-lg rounded-[24px] border border-white/40 bg-white p-6 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">上传面试经验</h2>
        <p className="mb-4 text-xs text-slate-400">分享你的面试经验或学习笔记，帮助其他考生</p>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">标题 *</label>
            <input type="text" value={uploadForm.title} onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="给你的经验起个标题" className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">内容 *</label>
            <textarea value={uploadForm.content} onChange={(e) => setUploadForm((p) => ({ ...p, content: e.target.value }))}
              rows={6} placeholder="写下你的面试经验、答题思路或学习笔记……

建议加入真实经历和行业细节，内容越具体对他人帮助越大"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 resize-y" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">招聘方式 *</label>
              <select value={uploadForm.recruitType} onChange={(e) => setUploadForm((p) => ({ ...p, recruitType: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                <option value="校招">校招</option>
                <option value="社招">社招</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">岗位 *</label>
              <select value={uploadForm.role} onChange={(e) => setUploadForm((p) => ({ ...p, role: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                {Object.entries(positionLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">分类 *</label>
              <select value={uploadForm.category} onChange={(e) => setUploadForm((p) => ({ ...p, category: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300">
                <option value="">请选择</option>
                {categoryButtons.filter((c) => c.id !== "records" && c.id !== "my-uploads").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {uploadErrors.length > 0 && (
            <div className="rounded-xl bg-rose-50 px-3 py-2">
              {uploadErrors.map((e, i) => <p key={i} className="text-xs text-rose-600">⚠ {e}</p>)}
            </div>
          )}

          {qualityWarnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-700 mb-1">内容优化建议：</p>
              {qualityWarnings.map((w, i) => <p key={i} className="text-xs text-amber-600">• {w}</p>)}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowUpload(false); setUploadErrors([]); setQualityWarnings([]); }}
              className="rounded-full bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-white/80">取消</button>
            <button type="button" onClick={handleUpload}
              className="rounded-full bg-sky-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-600">提交素材</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
              <div
                key={item.id}
                className="rounded-[20px] border border-white/40 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(item, catLabel)}
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
                      {catLabel && <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] text-sky-600">{catLabel}</span>}
                      {item.frequency && (
                        <span className="text-[10px] text-amber-600">
                          {"★".repeat(item.frequency)}{"☆".repeat(5 - item.frequency)}
                        </span>
                      )}
                      {item.difficulty && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                          item.difficulty === "入门" ? "bg-emerald-50 text-emerald-600" :
                          item.difficulty === "中级" ? "bg-amber-50 text-amber-600" :
                          item.difficulty === "高级" ? "bg-rose-50 text-rose-600" :
                          "bg-slate-50 text-slate-500"
                        }`}>{item.difficulty}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      role="button" tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleToggleFav(item, catLabel, subLabel); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleToggleFav(item, catLabel, subLabel); }}
                      className="inline-flex"
                    >
                      {isFav ? <BookmarkCheck className="h-4 w-4 text-sky-500" /> : <Bookmark className="h-4 w-4 text-slate-300 hover:text-slate-400" />}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-300 transition ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-white/40 px-5 py-4">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-7 text-slate-700 [&_strong]:text-slate-900 [&_strong]:font-semibold">
                      {item.content}
                    </div>
                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.map((tag: string) => (
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
      )}
          {UploadModal}

      {/* 上传浮动按钮 */}
      <button type="button" onClick={() => setShowUpload(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg transition hover:bg-sky-600 active:scale-95"
        title="上传面试经验">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
