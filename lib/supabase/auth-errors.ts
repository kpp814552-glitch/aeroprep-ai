/**
 * Maps Supabase Auth English error messages to Chinese.
 */
const errorMap: Record<string, string> = {
  "Invalid login credentials": "邮箱或密码错误",
  "Email not confirmed": "邮箱尚未验证，请检查收件箱",
  "User already registered": "该邮箱已被注册",
  "A user with this email already registered": "该邮箱已被注册",
  "Password should be at least 8 characters": "密码长度不能少于8位",
  "Unable to validate email or password": "邮箱或密码格式不正确",
  "Too many requests": "请求过于频繁，请稍后再试",
  "For security purposes, you can only request this after 60 seconds.": "安全限制，请60秒后再试",
  "Email signups are disabled": "邮箱注册暂未开放",
  "Signup requires a valid password": "密码不符合要求",
  "new row violates row-level security policy": "注册失败，请稍后重试",
 "Request rate limit reached": "操作过于频繁，请稍后再试",
  "email rate limit exceeded": "该邮箱操作过于频繁，请稍后再试",
  "sms rate limit exceeded": "短信验证过于频繁，请稍后再试",
  "signup disabled": "注册功能暂未开放",
};

export function translateAuthError(error: string | null): string | null {
  if (!error) return null;
  return errorMap[error] || error;
}
