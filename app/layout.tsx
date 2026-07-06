import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "AeroPrep AI",
  description: "民航 AI 面试与学习平台",
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
