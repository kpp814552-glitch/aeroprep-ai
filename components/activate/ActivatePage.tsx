"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Suspense } from "react";
import AppFrame from "@/components/layout/AppFrame";
import { activateMember, PLANS, type PlanId } from "@/lib/member/member-storage";

export default function ActivatePage() {
  return (
    <AppFrame>
      <main className="relative z-10 flex min-h-[80vh] items-center justify-center px-5">
        <Suspense fallback={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        }>
          <ActivateInner />
        </Suspense>
      </main>
    </AppFrame>
  );
}

function ActivateInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [msg, setMsg] = useState("正在验证激活链接...");

  useEffect(() => {
    const plan = searchParams.get("plan") as PlanId | null;
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!plan || !token || !email) {
      setMsg("无效的激活链接，缺少必要参数");
      setStatus("error");
      return;
    }

    const planInfo = PLANS.find(p => p.id === plan);
    if (!planInfo) {
      setMsg("无效的套餐");
      setStatus("error");
      return;
    }

    // Verify with server
    fetch("/api/activate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email, token }),
    }).then(res => res.json()).then(data => {
      if (data.success) {
        // Activate locally
        activateMember(plan);
        setMsg(`✅ 会员已激活！有效期 ${planInfo.days} 天`);
        setStatus("success");
      } else {
        setMsg(data.error || "激活失败，链接可能已过期");
        setStatus("error");
      }
    }).catch(() => {
      setMsg("网络错误，请稍后重试");
      setStatus("error");
    });
  }, [searchParams]);

  return (
    <div className="w-full max-w-sm text-center">
      <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
        status === "success" ? "bg-emerald-50" : status === "error" ? "bg-rose-50" : "bg-sky-50"
      }`}>
        {status === "verifying" && <Loader2 className="h-8 w-8 animate-spin text-sky-500" />}
        {status === "success" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
        {status === "error" && <XCircle className="h-8 w-8 text-rose-500" />}
      </div>
      <h2 className="text-xl font-semibold text-slate-900">
        {status === "verifying" ? "验证中" : status === "success" ? "激活成功" : "激活失败"}
      </h2>
      <p className="mt-2 text-sm text-slate-500">{msg}</p>
      {status !== "verifying" && (
        <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 text-sm font-medium text-white shadow-lg hover:brightness-110 transition-all">
          返回首页
        </a>
      )}
    </div>
  );
}
