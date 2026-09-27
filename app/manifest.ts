import type { MetadataRoute } from "next";

/**
 * PWA manifest（Next.js App Router 约定文件，自动注入 <link rel="manifest">）
 * 手机"添加到主屏幕"时用这里的名称、图标与配色。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AeroprepAI · 民航AI面试",
    short_name: "AeroprepAI",
    description: "面向民航学生的 AI 面试训练助手",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f140f",
    lang: "zh-CN",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
