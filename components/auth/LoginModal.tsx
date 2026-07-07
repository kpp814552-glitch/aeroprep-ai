'use client';

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Mail, Lock, X } from "lucide-react";
import { GlassCard, GlassButton } from "@/components/ui/glass";
import { useAuth } from "@/hooks/useAuth";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  message?: string;
  redirectAfterLogin?: string;
};

export default function LoginModal({
  open,
  onClose,
  message = "请先登录后继续操作",
  redirectAfterLogin = "/login",
}: LoginModalProps) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    onClose();
    router.push(redirectAfterLogin);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <GlassCard className="relative mx-4 w-full max-w-sm p-6 shadow-[0_24px_64px_rgba(0,0,0,0.2)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-white/30 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mt-2">
          <h2 className="text-lg font-semibold text-slate-950">登录</h2>
          <p className="mt-1 text-sm text-slate-500">{message}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-2.5 pl-10 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-2.5 pl-10 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-3 py-2.5 text-xs text-rose-700">
                {error}
              </div>
            ) : null}

            <GlassButton
              type="submit"
              disabled={loading}
              className="w-full justify-center py-2.5 text-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "登录中..." : "登录"}
            </GlassButton>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            还没有账号？{" "}
            <Link
              href="/register"
              onClick={onClose}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              立即注册
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
