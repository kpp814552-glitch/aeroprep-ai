'use client';

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { AuthContext } from "@/hooks/useAuth";
import type { UserProfile } from "@/lib/supabase/types";
import { translateAuthError } from "@/lib/supabase/auth-errors";
import { syncServerMember } from "@/lib/member/member-storage";

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
      setIsAdmin((data as UserProfile).is_admin === true);
   }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let cancelled = false;

    // Set up auth state change listener FIRST (was broken — never reached due to early return)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
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
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('[Auth] init error:', err);
      } finally {
        clearTimeout(safetyTimeout);
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
