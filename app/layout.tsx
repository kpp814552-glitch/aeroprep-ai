import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";

const BASE_URL = "https://www.aeroprep.top";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AeroPrep AI — 民航 AI 面试与学习平台",
    template: "%s · AeroPrep AI",
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
  authors: [{ name: "AeroPrep AI" }],
  applicationName: "AeroPrep AI",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: BASE_URL,
    siteName: "AeroPrep AI",
    title: "AeroPrep AI — 民航 AI 面试与学习平台",
    description:
      "15 个民航岗位的 AI 模拟面试：岗位化提问、实时语音反馈、专业成长报告，帮助你在民航招聘中脱颖而出。",
  },
  twitter: {
    card: "summary_large_image",
    title: "AeroPrep AI — 民航 AI 面试与学习平台",
    description:
      "15 个民航岗位的 AI 模拟面试：岗位化提问、实时语音反馈、专业成长报告。",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f140f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <AuthProvider>
          <div className="app-shell flex min-h-full flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
