import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { appName } from "@/lib/site";
import { cn } from "@/lib/utils";

type AppFrameProps = {
  children: ReactNode;
  className?: string;
  backHref?: string;
  backLabel?: string;
};

export default function AppFrame({
  children,
  className,
  backHref,
  backLabel = "返回",
}: AppFrameProps) {
  return (
    <div className={cn("relative z-10", className)}>
      <header className="px-5 pt-5 md:px-8 md:pt-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/35 bg-white/55 px-4 py-3 shadow-[0_10px_28px_rgba(21,43,74,0.08)] md:px-6">
          <div className="flex items-center gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 rounded-full bg-white/38 px-3 py-2 text-sm text-slate-700 transition hover:bg-white/56"
              >
                <ChevronLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            ) : null}

            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(102,185,255,0.65),rgba(26,102,255,0.9))] shadow-[inset_0_1px_6px_rgba(255,255,255,0.7),0_8px_24px_rgba(37,113,255,0.2)]" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                  Civil Aviation AI
                </p>
                <p className="text-sm font-semibold text-slate-900">{appName}</p>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-2 rounded-full bg-white/28 p-1 md:flex">
            {[
              { href: "/", label: "首页" },
              { href: "/interview", label: "AI面试" },
              { href: "/chat", label: "AI问答" },
              { href: "/profile", label: "成长中心" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-slate-600 transition hover:bg-white/52 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
