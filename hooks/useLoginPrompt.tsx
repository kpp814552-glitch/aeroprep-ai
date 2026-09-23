"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * 游客预览 + 操作拦截：
 *   const { requireLogin, loginModalProps } = useLoginPrompt();
 *   onClick={() => { if (!requireLogin("登录后即可开始面试")) return; doAction(); }}
 *   <LoginModal {...loginModalProps} />
 *
 * 未登录时返回 false（并弹出登录/注册弹窗），已登录时返回 true。
 */
export function useLoginPrompt(defaultMessage = "请先登录后继续操作") {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);

  const requireLogin = useCallback(
    (customMessage?: string) => {
      if (user) return true;
      if (customMessage) setMessage(customMessage);
      setOpen(true);
      return false;
    },
    [user],
  );

  return {
    isLoggedIn: !!user,
    authLoading: loading,
    requireLogin,
    loginModalProps: {
      open,
      message,
      onClose: () => setOpen(false),
    },
  };
}
