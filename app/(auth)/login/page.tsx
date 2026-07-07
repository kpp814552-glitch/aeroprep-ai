"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Loader2, LogIn, Mail, Lock, Sparkles } from "lucide-react";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { useAuth } from "@/hooks/useAuth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("请输入邮箱地址");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    router.push(redirect);
  }

  return (
    <AppFrame backHref="/" backLabel="返回首页">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center pt-8 md:pt-16">
          <GlassPanel className="soft-enter w-full overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-sky-200/55 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/44 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Welcome Back
              </div>
              <h1 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-slate-950 md:text-3xl">
                登录
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                登录你的 AeroPrep AI 账号
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    邮箱
                  </label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 pl-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    密码
                  </label>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 pl-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
                {loading ? (
                  <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 px-4 py-3 text-sm text-blue-700">
                    正在登录...
                  </div>
                ) : null}

                <GlassButton
                  type="submit"
                  disabled={loading}
                  className="w-full justify-center py-3.5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {loading ? "登录中..." : "登录"}
                </GlassButton>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                还没有账号？{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  立即注册
                </Link>
              </div>
            </div>
          </GlassPanel>
        </div>
      </main>
    </AppFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AppFrame backHref="/" backLabel="返回首页">
        <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
          <div className="mx-auto flex max-w-md flex-col items-center justify-center pt-8 md:pt-16">
            <div className="soft-enter w-full animate-pulse rounded-[28px] bg-white/60 p-8">
              <div className="h-6 w-24 rounded-full bg-slate-200/80" />
              <div className="mt-6 h-8 w-32 rounded-2xl bg-slate-200/80" />
              <div className="mt-8 space-y-4">
                <div className="h-12 rounded-2xl bg-slate-200/70" />
                <div className="h-12 rounded-2xl bg-slate-200/70" />
                <div className="h-12 rounded-2xl bg-slate-200/60" />
              </div>
            </div>
          </div>
        </main>
      </AppFrame>
    }>
      <LoginForm />
    </Suspense>
  );
}
