import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5">
      <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">404</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
        页面不存在
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        你访问的页面可能已被移动或删除
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm text-white transition hover:bg-slate-700"
      >
        返回首页
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
