import type { MetadataRoute } from "next";

const BASE_URL = "https://www.aeroprep.top";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/faq"],
        disallow: [
          "/api/",
          "/admin",
          "/profile",
          "/member",
          "/activate",
          "/interview",
          "/chat",
          "/learning",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
