"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlassPanel } from "@/components/ui/glass";
import { ORDER_STATUS_LABEL, type CreditOrder, type OrderStatus } from "@/lib/member/wallet";
import {
  Check,
  Coins,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Undo2,
  Upload,
  Wallet,
  X,
} from "lucide-react";

type TabKey = "orders" | "wallets" | "payment";

type AdminOrderRow = CreditOrder & { userId: string; email: string; username: string };

type WalletSummary = {
  userId: string;
  email: string;
  username: string;
  granted: number;
  used: number;
  left: number;
  pendingCount: number;
  isAdmin: boolean;
  createdAt: string;
  lastActivityAt: string | null;
};

type Msg = { type: "ok" | "err" | "info"; text: string } | null;

const TABS: { key: TabKey; label: string; icon: typeof Coins }[] = [
  { key: "orders", label: "订单管理", icon: CreditCard },
  { key: "wallets", label: "次数管理", icon: Wallet },
  { key: "payment", label: "收款设置", icon: Coins },
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-slate-200 bg-slate-100 text-slate-500",
  revoked: "border-rose-200 bg-rose-50 text-rose-600",
};

const FILTERS: { key: "all" | OrderStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
  { key: "revoked", label: "已撤销" },
];

function formatTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrders() {
  const [tab, setTab] = useState<TabKey>("orders");
  const [msg, setMsg] = useState<Msg>(null);

  // 订单
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, revoked: 0 });
  const [summary, setSummary] = useState({ approvedAmount: 0, approvedCredits: 0 });
  const [allowlistEnforced, setAllowlistEnforced] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  // 钱包
  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [walletKeyword, setWalletKeyword] = useState("");
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("1");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // 收款设置
  const [qr, setQr] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const flash = useCallback((type: "ok" | "err" | "info", text: string) => {
    setMsg({ type, text });
    if (type !== "err") {
      window.setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), 4000);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (keyword.trim()) qs.set("q", keyword.trim());
      const res = await fetch(`/api/admin/orders?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash("err", data?.error || "订单加载失败");
        return;
      }
      setOrders(data.orders || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, revoked: 0 });
      setSummary(data.summary || { approvedAmount: 0, approvedCredits: 0 });
      if (data.meta && typeof data.meta.allowlistEnforced === "boolean") setAllowlistEnforced(data.meta.allowlistEnforced);
    } catch {
      flash("err", "网络异常，订单列表加载失败");
    } finally {
      setLoadingOrders(false);
    }
  }, [statusFilter, keyword, flash]);

  const loadWallets = useCallback(async () => {
    setLoadingWallets(true);
    try {
      const qs = new URLSearchParams();
      if (walletKeyword.trim()) qs.set("q", walletKeyword.trim());
      qs.set("limit", "200");
      const res = await fetch(`/api/admin/wallets?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash("err", data?.error || "用户数据加载失败");
        return;
      }
      setWallets(data.wallets || []);
      if (data.meta && typeof data.meta.allowlistEnforced === "boolean") setAllowlistEnforced(data.meta.allowlistEnforced);
    } catch {
      flash("err", "网络异常，用户数据加载失败");
    } finally {
      setLoadingWallets(false);
    }
  }, [walletKeyword, flash]);

  const loadQr = useCallback(async () => {
    try {
      const res = await fetch("/api/site-config?key=payment_qr", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setQr(typeof data?.value === "string" && data.value ? data.value : null);
    } catch {
      setQr(null);
    } finally {
      setQrLoaded(true);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadWallets(); }, [loadWallets]);
  useEffect(() => { loadQr(); }, [loadQr]);

  // 轮询：待审核订单自动刷新
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      loadOrders();
      if (tab === "wallets") loadWallets();
    };
    const interval = window.setInterval(tick, 15000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadOrders, loadWallets, tab]);

  const review = async (order: AdminOrderRow, action: "approve" | "reject" | "revoke") => {
    const label = action === "approve" ? "通过" : action === "reject" ? "拒绝" : "撤销";
    const confirmText =
      action === "approve"
        ? `确认通过 ${order.email} 的订单 ${order.id}？\n将立即核发 ${order.credits} 次面试次数。`
        : action === "reject"
          ? `确认拒绝 ${order.email} 的订单 ${order.id}？`
          : `确认撤销 ${order.email} 的订单 ${order.id}？\n将扣回已核发的 ${order.credits} 次。`;
    if (!window.confirm(confirmText)) return;

    setBusy(order.id);
    try {
      const res = await fetch("/api/admin/orders/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: order.userId,
          orderId: order.id,
          action,
          note: noteDraft[order.id] || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        flash("ok", `已${label} ${order.email} 的订单${action === "approve" ? `，核发 ${order.credits} 次` : ""}`);
        setNoteDraft((d) => {
          const next = { ...d };
          delete next[order.id];
          return next;
        });
        await Promise.all([loadOrders(), loadWallets()]);
      } else {
        flash("err", data?.error || `${label}失败`);
      }
    } catch {
      flash("err", "网络异常，操作未完成");
    } finally {
      setBusy(null);
    }
  };

  const adjust = async (mode: "grant" | "deduct") => {
    if (!selectedWallet) return;
    const amount = Math.abs(Math.trunc(Number(adjustAmount) || 0));
    if (!amount) {
      flash("err", "请填写调整次数");
      return;
    }
    const delta = mode === "grant" ? amount : -amount;
    if (!window.confirm(`确认${mode === "grant" ? "发放" : "扣回"} ${amount} 次给 ${selectedWallet.email}？`)) return;

    setAdjusting(true);
    try {
      const res = await fetch("/api/admin/wallets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedWallet.userId, delta, note: adjustNote || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        flash("ok", `${selectedWallet.email} 已${mode === "grant" ? "发放" : "扣回"} ${amount} 次，当前剩余 ${data.wallet.left} 次`);
        setAdjustNote("");
        setSelectedWallet(null);
        await Promise.all([loadWallets(), loadOrders()]);
      } else {
        flash("err", data?.error || "调整失败");
      }
    } catch {
      flash("err", "网络异常，调整未完成");
    } finally {
      setAdjusting(false);
    }
  };

  const pickQr = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      flash("err", "请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flash("err", "图片不要超过 5MB");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setSavingQr(true);
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "payment_qr", value: compressed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setQr(compressed);
        flash("ok", "收款码已保存，用户端立即生效");
      } else {
        flash("err", data?.error || "保存失败");
      }
    } catch {
      flash("err", "图片处理失败，请换一张试试");
    } finally {
      setSavingQr(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const resetQr = async () => {
    if (!window.confirm("恢复为默认收款码？")) return;
    setSavingQr(true);
    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "payment_qr", value: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setQr(null);
        flash("ok", "已恢复默认收款码");
      } else {
        flash("err", data?.error || "操作失败");
      }
    } catch {
      flash("err", "网络异常，操作未完成");
    } finally {
      setSavingQr(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const totalOrders = counts.pending + counts.approved + counts.rejected + counts.revoked;

  return (
    <div className="stagger-section space-y-5">
      <div className="flex gap-1.5 rounded-2xl border border-white/40 bg-white/60 p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition ${
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.key === "orders" && counts.pending > 0 ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{counts.pending}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {msg && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl px-4 py-2.5 text-xs ${
            msg.type === "err"
              ? "bg-rose-50 text-rose-700"
              : msg.type === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-sky-50 text-sky-700"
          }`}
        >
          <span className="leading-5">{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 text-[11px] leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span>
          管理后台已开启服务端鉴权：仅白名单管理员可访问，非管理员访问 /admin 与全部管理接口都会被拒绝。
          建议在 Supabase 再执行一次 <span className="font-mono">lib/supabase/security-hardening.sql</span>，锁死权限字段。
          {allowlistEnforced === false ? "如需新增管理员，在 Vercel 配置 ADMIN_EMAILS。" : ""}
        </span>
      </div>

      {/* ================= 订单管理 ================= */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="待审核" value={String(counts.pending)} accent="text-amber-600" />
            <StatCard label="已通过订单" value={String(counts.approved)} accent="text-emerald-600" />
            <StatCard label="累计核发次数" value={String(summary.approvedCredits)} accent="text-sky-600" />
            <StatCard label="累计成交金额" value={`¥${summary.approvedAmount}`} accent="text-violet-600" />
          </div>

          <GlassPanel className="px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CreditCard className="h-4 w-4 text-sky-500" />
                购买申请与订单流水
              </p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="邮箱 / 订单号"
                    className="w-44 rounded-full border border-slate-200/70 bg-white/80 py-1.5 pl-8 pr-3 text-[11px] text-slate-700 outline-none focus:border-sky-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadOrders()}
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-[11px] text-slate-500 transition hover:bg-white"
                >
                  {loadingOrders ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  刷新
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-full border px-3 py-1 text-[11px] transition ${
                    statusFilter === f.key
                      ? "border-slate-900/10 bg-slate-900 text-white"
                      : "border-slate-200/70 bg-white/70 text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {f.label}
                  {f.key === "all" ? ` ${totalOrders}` : ` ${counts[f.key as OrderStatus]}`}
                </button>
              ))}
            </div>

            {(statusFilter === "all" || statusFilter === "pending") && (
              pendingOrders.length > 0 ? (
                <div className="mb-5 space-y-2.5">
                  {pendingOrders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-white px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">{o.email || o.username || o.userId}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {o.credits} 次面试 · ¥{o.amount} · 订单号 <span className="font-mono">{o.id}</span>
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">申请时间 {formatTime(o.appliedAt)}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <input
                            value={noteDraft[o.id] || ""}
                            onChange={(e) => setNoteDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                            placeholder="备注（可选）"
                            className="w-32 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1.5 text-[11px] text-slate-700 outline-none focus:border-sky-300"
                          />
                          <button
                            type="button"
                            disabled={busy === o.id}
                            onClick={() => review(o, "approve")}
                            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                          >
                            {busy === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            通过
                          </button>
                          <button
                            type="button"
                            disabled={busy === o.id}
                            onClick={() => review(o, "reject")}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-5 rounded-xl border border-dashed border-slate-200 py-5 text-center text-[11px] text-slate-400">
                  暂无待审核申请
                </p>
              )
            )}

            {orders.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">当前筛选条件下没有订单</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                  <thead>
                    <tr className="border-b border-white/40 text-left text-slate-400">
                      <th className="pb-2 pr-4 font-medium">订单号</th>
                      <th className="pb-2 pr-4 font-medium">用户</th>
                      <th className="pb-2 pr-4 font-medium">套餐</th>
                      <th className="pb-2 pr-4 font-medium">状态</th>
                      <th className="pb-2 pr-4 font-medium">申请时间</th>
                      <th className="pb-2 pr-4 font-medium">处理记录</th>
                      <th className="pb-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={`${o.userId}-${o.id}`} className="border-b border-white/20 text-slate-700">
                        <td className="py-2.5 pr-4 font-mono text-[10px] text-slate-500">{o.id}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-sky-700">{o.email || o.userId}</span>
                          {o.username ? <span className="ml-1.5 text-[10px] text-slate-400">{o.username}</span> : null}
                        </td>
                        <td className="py-2.5 pr-4">
                          {o.channel === "manual" ? "手动调整" : `${o.credits} 次`}
                          {o.amount ? <span className="ml-1 text-[10px] text-slate-400">¥{o.amount}</span> : null}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLE[o.status]}`}>
                            {ORDER_STATUS_LABEL[o.status]}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-[10px] text-slate-400">{formatTime(o.appliedAt)}</td>
                        <td className="py-2.5 pr-4 text-[10px] text-slate-400">
                          {o.reviewedAt ? (
                            <>
                              {formatTime(o.reviewedAt)}
                              {o.reviewedBy ? <div className="text-slate-300">{o.reviewedBy}</div> : null}
                            </>
                          ) : (
                            "—"
                          )}
                          {o.note ? <div className="text-slate-300">{o.note}</div> : null}
                        </td>
                        <td className="py-2.5">
                          {o.status === "pending" ? (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={busy === o.id}
                                onClick={() => review(o, "approve")}
                                className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                              >
                                通过
                              </button>
                              <button
                                type="button"
                                disabled={busy === o.id}
                                onClick={() => review(o, "reject")}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
                              >
                                拒绝
                              </button>
                            </div>
                          ) : o.status === "approved" ? (
                            <button
                              type="button"
                              disabled={busy === o.id}
                              onClick={() => review(o, "revoke")}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                            >
                              <Undo2 className="h-3 w-3" />
                              撤销
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* ================= 次数管理 ================= */}
      {tab === "wallets" && (
        <div className="space-y-4">
          <GlassPanel className="px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Wallet className="h-4 w-4 text-sky-500" />
                用户次数钱包
              </p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={walletKeyword}
                    onChange={(e) => setWalletKeyword(e.target.value)}
                    placeholder="搜索邮箱 / 用户名"
                    className="w-52 rounded-full border border-slate-200/70 bg-white/80 py-1.5 pl-8 pr-3 text-[11px] text-slate-700 outline-none focus:border-sky-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadWallets()}
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-[11px] text-slate-500 transition hover:bg-white"
                >
                  {loadingWallets ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  刷新
                </button>
              </div>
            </div>

            {wallets.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">没有匹配的用户</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs">
                  <thead>
                    <tr className="border-b border-white/40 text-left text-slate-400">
                      <th className="pb-2 pr-4 font-medium">用户</th>
                      <th className="pb-2 pr-4 font-medium">剩余次数</th>
                      <th className="pb-2 pr-4 font-medium">累计核发</th>
                      <th className="pb-2 pr-4 font-medium">已使用</th>
                      <th className="pb-2 pr-4 font-medium">待审核</th>
                      <th className="pb-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((w) => (
                      <tr key={w.userId} className="border-b border-white/20 text-slate-700">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sky-700">{w.email || w.userId}</span>
                            {w.isAdmin ? (
                              <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] text-white">管理员</span>
                            ) : null}
                          </div>
                          <div className="text-[10px] text-slate-400">{w.username || "—"}</div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={w.left > 0 ? "font-semibold text-emerald-600" : "text-slate-400"}>{w.left}</span>
                        </td>
                        <td className="py-2.5 pr-4">{w.granted}</td>
                        <td className="py-2.5 pr-4">{w.used}</td>
                        <td className="py-2.5 pr-4">
                          {w.pendingCount > 0 ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{w.pendingCount}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWallet(selectedWallet?.userId === w.userId ? null : w);
                              setAdjustAmount("1");
                              setAdjustNote("");
                            }}
                            className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-600 transition hover:bg-slate-200"
                          >
                            {selectedWallet?.userId === w.userId ? "收起" : "调整次数"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>

          {selectedWallet && (
            <GlassPanel className="px-5 py-4">
              <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                <Coins className="h-4 w-4 text-amber-500" />
                调整 {selectedWallet.email} 的次数
                <span className="text-[11px] font-normal text-slate-400">当前剩余 {selectedWallet.left} 次</span>
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className="mb-1 text-[10px] text-slate-400">次数</p>
                  <input
                    type="number"
                    min={1}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-300"
                  />
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="mb-1 text-[10px] text-slate-400">备注（会写进订单流水）</p>
                  <input
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="如：微信转账补发 / 重复购买退款"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-300"
                  />
                </div>
                <button
                  type="button"
                  disabled={adjusting}
                  onClick={() => adjust("grant")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                >
                  {adjusting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  发放
                </button>
                <button
                  type="button"
                  disabled={adjusting}
                  onClick={() => adjust("deduct")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-5 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  扣回
                </button>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-400">
                发放用于线下转账人工入账、活动赠送；扣回用于误核发或退款。每次调整都会生成一条流水，可在「订单管理」中查到。
              </p>
            </GlassPanel>
          )}
        </div>
      )}

      {/* ================= 收款设置 ================= */}
      {tab === "payment" && (
        <GlassPanel className="px-5 py-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CreditCard className="h-4 w-4 text-sky-500" />
            收款码
          </p>
          <p className="mb-4 text-[10px] text-slate-400">
            上传后立即对所有用户生效（保存在数据库，换设备也一致）。建议使用支付宝/微信个人收款码，图片会自动压缩。
          </p>

          <div className="flex flex-wrap items-start gap-5">
            <div className="w-40 shrink-0">
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {!qrLoaded ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr || "/qr-payment.jpg"}
                    alt="收款码"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">{qr ? "当前：自定义收款码" : "当前：默认收款码"}</p>
            </div>

            <div className="flex-1 space-y-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingQr}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                >
                  {savingQr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  上传新收款码
                </button>
                {qr ? (
                  <button
                    type="button"
                    disabled={savingQr}
                    onClick={resetQr}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    恢复默认
                  </button>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) pickQr(file);
                  }}
                />
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-[11px] leading-5 text-slate-500">
                <p className="mb-1 font-medium text-slate-700">当前售卖方式</p>
                <p>
                  按次收费：1 次 ¥2 · 5 次 ¥10 · 10 次 ¥20。用户扫码支付时需备注订单号，你在「订单管理」核对到账后点「通过」，
                  次数会立即写入该用户的服务端钱包，用户端无需刷新即可看到。
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/60 px-4 py-3">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

/** 压缩图片为 JPEG，避免把几 MB 的原图塞进数据库 */
async function compressImage(file: File, maxEdge = 720, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
