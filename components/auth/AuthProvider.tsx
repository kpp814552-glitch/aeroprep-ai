'use client';

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { AuthContext } from "@/hooks/useAuth";
import type { UserProfile } from "@/lib/supabase/types";
import { translateAuthError } from "@/lib/supabase/auth-errors";
import { syncServerMember } from "@/lib/member/member-storage";

const LOGIN_TOUCH_PREFIX = "aeroprep_login_touch:";

function touchLastLogin(userId: string) {
  if (typeof window === "undefined") return;
  const key = `${LOGIN_TOUCH_PREFIX}${userId}`;
  const now = Date.now();
  try {
    const previous = Number(window.sessionStorage.getItem(key) || 0);
    if (previous && now - previous < 6 * 60 * 60 * 1000) return;
    window.sessionStorage.setItem(key, String(now));
  } catch {
    // 隐私模式下 sessionStorage 不可用时仍继续打点，不影响登录。
  }
  void fetch("/api/auth/touch", { method: "POST", cache: "no-store" }).catch(() => {});
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
 const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
 const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

   if (data) {
     setProfile(data as UserProfile);
      // 本地标记仅作兜底展示
      setIsAdmin((data as UserProfile).is_admin === true);
   }

    // 真正的管理员判定以服务端白名单为准（users.is_admin 用户自己也能改）
    try {
      const res = await fetch("/api/member/status", { cache: "no-store" });
      if (res.ok) {
        const status = await res.json();
        if (typeof status?.isAdmin === "boolean") setIsAdmin(status.isAdmin);
      }
    } catch { /* 忽略：保留兜底值 */ }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // 登录状态下定时同步服务端状态：管理员核发的面试次数会自动入账。
  // 每 20 秒轮询一次，并在切回页面/窗口获得焦点时立即同步，做到"实时到账"。
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let lastRun = 0;
    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      lastRun = Date.now();
      await syncServerMember().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // 回到页面时如果距离上次同步超过 5 秒，立即补一次
      if (Date.now() - lastRun > 5000) tick();
    };
    const interval = window.setInterval(tick, 20000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    // Set up auth state change listener FIRST (was broken — never reached due to early return)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            touchLastLogin(session.user.id);
            await fetchProfile(session.user.id);
            // Check if server-side membership was approved
            syncServerMember().catch(() => {});
          } catch (e) { console.error('[Auth] onAuthStateChange fetchProfile error:', e); }
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    const init = async () => {
      // Safety timeout: force loading false after 8 seconds
      const safetyTimeout = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
      try {
      const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !cancelled) {
          setUser(session.user);
          touchLastLogin(session.user.id);
          // 先结束 loading 再补资料：fetchProfile 要跑一次数据库查询 +
          // 一次 /api/member/status，如果等它完成，整站首屏会白屏好几秒。
          setLoading(false);
          void fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('[Auth] init error:', err);
      } finally {
        clearTimeout(safetyTimeout);
        if (!cancelled) setLoading(false);
      }
    };

    init();

    // Periodic sync: check membership status every 30 seconds
    const memberInterval = setInterval(() => {
      syncServerMember().catch(() => {});
    }, 30000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearInterval(memberInterval);
    };
  }, [supabase, fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) touchLastLogin(data.user.id);
      return { error: error?.message ? translateAuthError(error.message) : null };
    } catch (err) {
      console.error('[Auth] signIn error:', err);
      return { error: '网络连接异常，请检查网络后重试。' };
    }
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      if (!error) {
        // After signup, the trigger creates the profile.
        // Give it a moment, then fetch it.
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await fetchProfile(newUser.id);
        }
      }
      return { error: error?.message ? translateAuthError(error.message) : null };
    } catch (err) {
      console.error('[Auth] signUp error:', err);
      return { error: '注册服务暂时不可用，请稍后重试。' };
    }
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
