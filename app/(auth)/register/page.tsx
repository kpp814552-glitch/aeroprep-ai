"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, LogIn, Mail, Lock, User, Sparkles } from "lucide-react";
import UserAgreements from "@/components/auth/UserAgreements";
import AppFrame from "@/components/layout/AppFrame";
import { GlassPanel, GlassButton } from "@/components/ui/glass";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("请输入用户名");
      return;
    }
    if (!email.trim()) {
      setError("请输入邮箱地址");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("邮箱格式不正确");
      return;
    }
    if (password.length < 8) {
      setError("密码长度不能少于8位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次密码输入不一致");
      return;
    }
    if (!agreed) {
      setError("请先阅读并同意《用户协议》《隐私政策》《免责声明》。");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email.trim(), password, username.trim());
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    setSuccess("注册成功！正在跳转...");
    setTimeout(() => router.push("/"), 500);
  }

  return (
    <AppFrame backHref="/login" backLabel="返回登录">
      <main className="relative z-10 px-5 pb-16 pt-8 md:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center pt-8 md:pt-16">
          <GlassPanel className="soft-enter w-full overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-sky-200/55 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/44 px-4 py-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Get Started
              </div>
              <h1 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-slate-950 md:text-3xl">
                注册
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                创建你的 AeroPrep AI 账号
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="username" className="text-sm font-medium text-slate-700">
                    用户名
                  </label>
                  <div className="relative mt-2">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="你的昵称"
                      className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 pl-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"
                    />
                  </div>
                </div>

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
                      placeholder="至少8位"
                      className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 pl-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    确认密码
                  </label>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入密码"
                      className="w-full rounded-2xl border border-white/40 bg-white/60 px-4 py-3 pl-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </div>
                ) : null}

                <div className="pt-2">
                  <UserAgreements checked={agreed} onChange={setAgreed} />
                </div>

                <button
                  type="submit"
                  disabled={loading || !agreed}
                  className="accent-ring flex w-full items-center justify-center gap-2 rounded-full bg-[rgba(37,113,255,0.88)] px-5 py-3.5 text-base font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(37,113,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {loading ? "注册中..." : "注册"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                已有账号？{" "}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  立即登录
                </Link>
              </div>
            </div>
          </GlassPanel>
        </div>
      </main>
    </AppFrame>
  );
}
