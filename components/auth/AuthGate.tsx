"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "@/components/auth/LoginModal";

type Props = {
  children: ReactNode;
  /** 内容区域模糊（资料中心） */
  blurContent?: boolean;
  /** 内容区域禁用交互（AI优化等） */
  blockInteraction?: boolean;
};

export default function AuthGate({ children, blurContent = true, blockInteraction = true }: Props) {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative">
        {/* Content layer — blurred and/or disabled */}
        <div
          className={`transition-all duration-300 ${
            blurContent ? "blur-[5px]" : ""
          } ${
            blockInteraction ? "pointer-events-none select-none" : ""
          }`}
        >
          {children}
        </div>

        {/* Overlay with login prompt */}
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="pointer-events-auto mx-4 w-full max-w-xs rounded-2xl border border-white/40 bg-white/80 px-6 py-8 text-center shadow-xl backdrop-blur-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
              <Lock className="h-6 w-6 text-sky-400" />
            </div>
            <p className="text-sm font-medium text-slate-800">需要登录</p>
            <p className="mt-1 text-xs text-slate-500">请登录后查看完整内容</p>
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:from-sky-600 hover:to-violet-600"
            >
              登录
            </button>
          </div>
        </div>

        <LoginModal
          open={showLogin}
          onClose={() => setShowLogin(false)}
          redirectAfterLogin={
            typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
