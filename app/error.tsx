"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5">
      <div className="w-full max-w-md rounded-[28px] border border-white/48 bg-white/62 px-8 py-10 text-center shadow-[0_18px_52px_rgba(65,48,31,0.08)] backdrop-blur-md">
        <p className="text-sm font-medium text-slate-900">页面出现了一点问题</p>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {error.message || "加载过程中发生错误，请重试。"}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            重新加载
          </button>
          <a
            href="/"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
