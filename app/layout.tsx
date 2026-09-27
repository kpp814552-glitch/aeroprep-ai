import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";

const BASE_URL = "https://www.aeroprep.top";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AeroprepAI · 民航AI面试",
    template: "%s · AeroprepAI",
  },
  description:
    "面向民航求职者的 AI 模拟面试平台：覆盖飞行员、乘务员、机务、签派、空管等 15 个岗位，提供岗位化 AI 面试、实时语音反馈、成长报告与民航学习资料中心。",
  keywords: [
    "民航面试",
    "航空面试",
    "AI模拟面试",
    "飞行员面试",
    "乘务员面试",
    "空乘面试",
    "机务面试",
    "空管面试",
    "民航求职",
    "航空公司招聘",
    "面试练习",
    "AeroPrep",
  ],
  authors: [{ name: "AeroprepAI" }],
  applicationName: "AeroprepAI",
  // 手机添加到主屏幕后的名称与状态栏表现
  appleWebApp: {
    capable: true,
    title: "AeroprepAI",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: BASE_URL,
    siteName: "AeroprepAI",
    title: "AeroprepAI · 民航AI面试",
    description:
      "15 个民航岗位的 AI 模拟面试：岗位化提问、实时语音反馈、专业成长报告，帮助你在民航招聘中脱颖而出。",
  },
  twitter: {
    card: "summary_large_image",
    title: "AeroprepAI · 民航AI面试",
    description:
      "15 个民航岗位的 AI 模拟面试：岗位化提问、实时语音反馈、专业成长报告。",
  },
  icons: {
    // 浏览器标签页优先用这几档 PNG（16/32/48），自适应深浅色主题；
    // favicon.ico 与 apple-touch-icon 由 app/favicon.ico、app/apple-icon.png 约定自动注入
    icon: [
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
    ],
    // iOS「添加到主屏幕」用这张 180×180
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f140f",
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseOrigin: string | null = null;
try {
  supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null;
} catch {
  supabaseOrigin = null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        <AuthProvider>
          <div className="app-shell flex min-h-full flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
