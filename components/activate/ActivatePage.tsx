"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
  const planParam = searchParams.get("plan");
  const plan = PLANS.some((item) => item.id === planParam) ? (planParam as PlanId) : null;
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [verification, setVerification] = useState<{
    status: "success" | "error";
    msg: string;
  } | null>(null);

  const invalidMessage = !planParam || !token || !email
    ? "无效的激活链接，缺少必要参数"
    : !plan
      ? "无效的套餐"
      : null;

  useEffect(() => {
    if (!plan || !token || !email) return;
    const planInfo = PLANS.find((item) => item.id === plan);
    if (!planInfo) return;

    let cancelled = false;
    fetch("/api/activate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email, token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          activateMember(plan);
          setVerification({
            status: "success",
            msg: `会员已激活，有效期 ${planInfo.days} 天`,
          });
        } else {
          setVerification({
            status: "error",
            msg: data.error || "激活失败，链接可能已过期",
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVerification({ status: "error", msg: "网络错误，请稍后重试" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email, plan, token]);

  const status = invalidMessage ? "error" : verification?.status ?? "verifying";
  const msg = invalidMessage || verification?.msg || "正在验证激活链接...";

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
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 text-sm font-medium text-white shadow-lg hover:brightness-110 transition-all">
          返回首页
        </Link>
      )}
    </div>
  );
}
