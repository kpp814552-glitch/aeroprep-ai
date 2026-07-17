"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronLeft, LogOut, UserCircle } from "lucide-react";
import { appName } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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
  const pathname = usePathname();
 const { user, profile, loading, signOut, isAdmin } = useAuth();
 const isLoggedIn = !!user;

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

          <nav className="flex items-center gap-1 sm:gap-2 rounded-full bg-white/28 p-1 overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-none md:overflow-visible">
            {[
              { href: "/", label: "首页" },
              { href: "/interview", label: "AI面试" },
              { href: "/chat", label: "AI优化" },
           { href: "/member", label: "会员" },
             { href: "/learning", label: "资料中心" },
              { href: "/faq", label: "常见问题" },
             { href: "/profile", label: "成长中心" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-2 sm:px-3 py-2 text-xs transition md:px-4 md:text-sm",
                  pathname === item.href
                    ? "bg-white/60 text-slate-900"
                    : "text-slate-600 hover:bg-white/52 hover:text-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}

      <div className="ml-1 h-5 w-px bg-white/20" />

    {loading || !isLoggedIn ? (
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href="/login"
          className="rounded-full px-3 py-1.5 text-xs text-slate-600 transition hover:bg-white/50 hover:text-slate-900"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-full px-3 py-1.5 text-xs text-slate-600 transition hover:bg-white/50 hover:text-slate-900"
        >
          注册
        </Link>
      </div>
    ) : isLoggedIn ? (
      <div className="flex items-center gap-2 shrink-0">
        {isAdmin ? (
          <Link
                    href="/admin"
                    className="rounded-full bg-white/30 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-white/50"
                  >
                    管理后台
                  </Link>
                ) : null}
               <Link
                  href="/profile"
                  className="flex items-center gap-1.5 rounded-full bg-white/30 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-white/50"
                >
                  <UserCircle className="h-4 w-4" />
                  <span className="max-w-[80px] truncate">{profile?.username || user.email?.split("@")[0]}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  aria-label="退出登录"
                  title="退出登录"
                  className="rounded-full p-1.5 text-slate-500 transition hover:bg-white/40 hover:text-slate-700"
                >
                  <LogOut className="h-4 w-4" />
        </button>
      </div>
    ) : null}
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
