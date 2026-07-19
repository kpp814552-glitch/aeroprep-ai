"use client";

import { useState, useEffect } from "react";
import { GlassPanel } from "@/components/ui/glass";
import { getPayments } from "@/lib/payment/payment-storage";
import {
  getMemberRecords, addMemberDays, removeMemberRecord,
} from "@/lib/admin/admin-storage";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Search, Trash2, Plus, Clock, Loader2, CreditCard, Upload } from "lucide-react";

type TabType = "orders" | "members" | "applications";

export default function AdminOrders() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState(getPayments());
  const [members, setMembers] = useState(getMemberRecords());
  const [applications, setApplications] = useState<any[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addDays, setAddDays] = useState("");
  const [days, setDays] = useState(30);
  const [msg, setMsg] = useState("");


  const refresh = () => { setOrders(getPayments()); setMembers(getMemberRecords()); };
  useEffect(() => { refresh(); }, []);
  
  // Fetch pending applications
  useEffect(() => {
    const load = async () => {
      setAppLoading(true);
      try {
        const res = await fetch("/api/member/pending");
        if (res.ok) { const data = await res.json(); setApplications(data.applicants || []); }
      } catch {} finally { setAppLoading(false); }
    };
    load();
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem("aeroprep_qr_code");
    if (saved) setQrCodeData(saved);
  }, []);

  const handleAddDays = () => {
    if (!addEmail || !days) return;
    const result = addMemberDays(addEmail, days, user?.email || "admin");
    if (typeof result === "string") { setMsg(result); return; }
    setMsg(`✅ 已为 ${addEmail} 添加 ${days} 天会员`);
    refresh();
  };

  const handleRemoveMember = (email: string) => {
    removeMemberRecord(email);
    setMsg(`已移除 ${email} 的会员记录`);
    refresh();
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "orders", label: "订单记录" },
    { key: "members", label: "会员管理" },
    { key: "applications", label: "待审核申请" },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl border border-white/40 bg-white/60 p-1.5">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl px-4 py-2 text-xs font-medium transition ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>{t.label}</button>
        ))}
      </div>

      {msg && <div className="rounded-xl bg-sky-50 px-4 py-2.5 text-xs text-sky-700">{msg}<button onClick={() => setMsg("")} className="ml-3 text-sky-400 hover:text-sky-600">×</button></div>}

      {/* Orders Tab */}
      {tab === "orders" && (
        <GlassPanel className="px-5 py-4">
          <p className="mb-4 text-sm font-semibold text-slate-800">全部订单</p>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">暂无订单记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-400 border-b border-white/30">
                  <th className="pb-2 pr-4 font-medium">订单号</th>
                  <th className="pb-2 pr-4 font-medium">金额</th>
                  <th className="pb-2 pr-4 font-medium">状态</th>
                  <th className="pb-2 pr-4 font-medium">时间</th>
                </tr></thead>
                <tbody>{orders.slice(0, 50).map((o) => (
                  <tr key={o.orderId} className="border-b border-white/20 text-slate-700">
                    <td className="py-2.5 pr-4 font-mono text-[10px]">{o.orderId}</td>
                    <td className="py-2.5 pr-4">¥{o.amount}</td>
                    <td className="py-2.5 pr-4"><span className={`rounded-full px-2 py-0.5 ${o.status === "confirmed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{o.status === "confirmed" ? "已付款" : "待支付"}</span></td>
                    <td className="py-2.5 pr-4 text-slate-400">{new Date(o.createdAt).toLocaleString("zh-CN")}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      )}

      {/* Members Tab */}
      {tab === "members" && (
        <div className="space-y-4">
          <GlassPanel className="px-5 py-4">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><Crown className="h-4 w-4 text-amber-500" />手动添加会员天数</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="mb-1 text-[10px] text-slate-400">用户邮箱</p>
                <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="user@example.com"
                  className="w-56 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-300" />
              </div>
              <div>
                <p className="mb-1 text-[10px] text-slate-400">添加天数</p>
                <input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 30)} min={1} max={3650}
                  className="w-20 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-300" />
              </div>
              <button type="button" onClick={handleAddDays}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:brightness-110">
                <Plus className="h-3.5 w-3.5" />添加会员天数
              </button>
            </div>
          </GlassPanel>

          <GlassPanel className="px-5 py-4">
            {/* QR Code Setting */}
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><CreditCard className="h-4 w-4 text-sky-500" />上传支付宝收款码</p>
            <p className="mb-3 text-[10px] text-slate-400">上传你的支付宝收款码图片，用户支付时将显示此图片</p>
            <div className="flex items-start gap-4">
              <div className="w-40 shrink-0">
                {qrCodeData ? (
                  <img src={qrCodeData} alt="收款码" className="w-full rounded-xl border border-slate-200" />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white">
                    <CreditCard className="h-8 w-8 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 pt-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-5 py-2 text-xs font-medium text-white shadow-sm transition hover:brightness-110">
                  <Upload className="h-3.5 w-3.5" />
                  选择图片
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { setMsg("图片不能超过2MB"); return; }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const data = reader.result as string;
                      localStorage.setItem("aeroprep_qr_code", data);
                      setQrCodeData(data);
                      setMsg("✅ 收款码已更新");
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {qrCodeData && (
                  <button type="button" onClick={() => {
                    localStorage.removeItem("aeroprep_qr_code");
                    setQrCodeData(null);
                    setMsg("已清除收款码");
                  }}
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-4 py-1.5 text-[10px] text-rose-500 transition hover:bg-rose-100">
                    <Trash2 className="h-3 w-3" />清除图片
                  </button>
                )}
                <p className="mt-2 text-[10px] text-slate-400">建议尺寸：300x300px · 不超过2MB</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="px-5 py-4">
            <p className="mb-4 text-sm font-semibold text-slate-800">会员记录</p>
            {members.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">暂无会员记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-slate-400 border-b border-white/30">
                    <th className="pb-2 pr-4 font-medium">邮箱</th>
                    <th className="pb-2 pr-4 font-medium">方案</th>
                    <th className="pb-2 pr-4 font-medium">到期时间</th>
                    <th className="pb-2 pr-4 font-medium">操作人</th>
                    <th className="pb-2 font-medium">操作</th>
                  </tr></thead>
                  <tbody>{members.map((m) => (
                    <tr key={m.email} className="border-b border-white/20 text-slate-700">
                      <td className="py-2.5 pr-4 text-sky-700">{m.email}</td>
                      <td className="py-2.5 pr-4">{m.plan}</td>
                      <td className="py-2.5 pr-4">{new Date(m.expiresAt).toLocaleString("zh-CN")}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{m.addedBy}</td>
                      <td className="py-2.5"><button onClick={() => handleRemoveMember(m.email)} className="rounded-full bg-rose-50 px-3 py-1 text-[10px] text-rose-500 hover:bg-rose-100"><Trash2 className="mr-0.5 inline h-3 w-3" />移除</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* Applications Tab */}
      {tab === "applications" && (
        <div className="space-y-4">
          <GlassPanel className="px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Crown className="h-4 w-4 text-amber-500" />待审核的会员申请</p>
              <button type="button" onClick={async () => {
                setAppLoading(true);
                try { const res = await fetch("/api/member/pending"); if (res.ok) { const d = await res.json(); setApplications(d.applicants || []); } }
                catch {} finally { setAppLoading(false); }
              }} disabled={appLoading}
                className="rounded-full bg-white/60 px-3 py-1.5 text-[10px] text-slate-500 transition hover:bg-white">
                {appLoading ? "加载中..." : "刷新"}
              </button>
            </div>
            {applications.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">暂无待审核的申请</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between rounded-xl border border-white/40 bg-white/60 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{app.email || app.username || app.id}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        申请套餐：{app.pending_plan === "1day" ? "1天" : app.pending_plan === "3day" ? "3天" : "30天"}会员
                        {app.created_at ? ` · ${new Date(app.created_at).toLocaleDateString("zh-CN")}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={async () => {
                      if (!confirm("确认通过此申请？会员将从此刻开始生效。")) return;
                      try {
                        const res = await fetch("/api/member/approve", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: app.id }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setMsg("✅ 已通过 " + (data.email || app.email || "") + " 的会员申请");
                          setAppLoading(true); try { const r = await fetch("/api/member/pending"); if (r.ok) { const d = await r.json(); setApplications(d.applicants || []); } } catch {} finally { setAppLoading(false); }
                        } else {
                          setMsg("❌ " + (data.error || "操作失败"));
                        }
                      } catch { setMsg("❌ 网络错误"); }
                    }}
                      className="shrink-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-[10px] font-medium text-white shadow-sm transition hover:brightness-110">
                      通过
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      )}

    </div>
  );
}
