"use client";

import { useState, useEffect } from "react";
import { GlassPanel } from "@/components/ui/glass";
import { getPayments } from "@/lib/payment/payment-storage";
import {
  getMemberRecords, addMemberDays, removeMemberRecord,
} from "@/lib/admin/admin-storage";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Search, Trash2, Plus, Clock } from "lucide-react";

type TabType = "orders" | "members";

export default function AdminOrders() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState(getPayments());
  const [members, setMembers] = useState(getMemberRecords());
  const [addEmail, setAddEmail] = useState("");
  const [addDays, setAddDays] = useState("");
  const [days, setDays] = useState(30);
  const [msg, setMsg] = useState("");

  const refresh = () => { setOrders(getPayments()); setMembers(getMemberRecords()); };
  useEffect(() => { refresh(); }, []);

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
    </div>
  );
}
