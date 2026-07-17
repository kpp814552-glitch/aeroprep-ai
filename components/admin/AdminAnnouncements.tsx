"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Globe, EyeOff, Info, AlertTriangle, AlertCircle, Megaphone } from "lucide-react";
import { GlassPanel, GlassCard, GlassButton } from "@/components/ui/glass";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  title: string;
  content: string;
  type: string;
  is_published: boolean;
};

const emptyForm: FormState = { title: "", content: "", type: "info", is_published: true };

const typeMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  info: { label: "通知", icon: Info, color: "text-blue-600 bg-blue-50 border-blue-200" },
  warning: { label: "警告", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200" },
  important: { label: "重要", icon: AlertCircle, color: "text-rose-600 bg-rose-50 border-rose-200" },
  update: { label: "更新", icon: Megaphone, color: "text-violet-600 bg-violet-50 border-violet-200" },
};

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取公告失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchAnnouncements(), 0); return () => clearTimeout(t); }, [fetchAnnouncements]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(a: Announcement) {
    setForm({ title: a.title, content: a.content, type: a.type, is_published: a.is_published });
    setEditingId(a.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/announcements/${editingId}` : "/api/admin/announcements";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("保存失败");
      setShowForm(false);
      setEditingId(null);
      await fetchAnnouncements();
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这条公告？")) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      await fetchAnnouncements();
    } catch {
      setError("删除失败");
    }
  }

  async function togglePublish(a: Announcement) {
    try {
      await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !a.is_published }),
      });
      await fetchAnnouncements();
    } catch {
      setError("更新失败");
    }
  }

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/40 bg-white/60 px-5 py-4 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-14 rounded-full bg-slate-200" />
                <div className="h-5 w-12 rounded-full bg-slate-200" />
              </div>
              <div className="h-4 w-3/5 rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-4/5 rounded bg-slate-100" />
            </div>
            <div className="flex gap-1">
              <div className="h-7 w-7 rounded-full bg-slate-200" />
              <div className="h-7 w-7 rounded-full bg-slate-200" />
              <div className="h-7 w-7 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">共 {announcements.length} 条公告</p>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" /> 发布公告
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <GlassCard className="px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{editingId ? "编辑公告" : "发布公告"}</p>
            <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
          </div>
          <input
            value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="公告标题" className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm outline-none focus:border-blue-300"
          />
          <textarea
            value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="公告内容" rows={4}
            className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm outline-none focus:border-blue-300 resize-none"
          />
          <div className="flex gap-3">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="rounded-2xl border border-white/40 bg-white/60 px-4 py-2.5 text-sm outline-none">
              <option value="info">通知</option>
              <option value="warning">警告</option>
              <option value="important">重要</option>
              <option value="update">更新</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} />
              立即发布
            </label>
          </div>
          <div className="flex gap-3">
            <GlassButton onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()} className="px-6 py-2.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "保存修改" : "发布"}
            </GlassButton>
            <GlassButton variant="ghost" onClick={() => setShowForm(false)}>取消</GlassButton>
          </div>
        </GlassCard>
      )}

      {/* List */}
      {announcements.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Megaphone className="h-10 w-10 mb-3" />
          <p className="text-sm">暂无公告</p>
          <p className="text-xs mt-1">点击“发布公告”添加第一条</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const meta = typeMeta[a.type] || typeMeta.info;
            const Icon = meta.icon;
            return (
              <GlassCard key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", meta.color)}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                      {!a.is_published && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">
                          <EyeOff className="h-3 w-3" /> 未发布
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{a.content}</p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {new Date(a.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => togglePublish(a)} title={a.is_published ? "下架" : "发布"} className="rounded-full p-1.5 text-slate-400 hover:bg-white/40 hover:text-slate-600 transition">
                      {a.is_published ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => openEdit(a)} className="rounded-full p-1.5 text-slate-400 hover:bg-white/40 hover:text-blue-600 transition">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(a.id)} className="rounded-full p-1.5 text-slate-400 hover:bg-white/40 hover:text-rose-600 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
