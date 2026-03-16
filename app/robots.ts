import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/lp", "/lp/terms", "/lp/privacy", "/lp/cancel"],
        disallow: [
          "/admin",
          "/doctor",
          "/mypage",
          "/api",
          "/register",
          "/login",
          "/intake",
          "/checkout",
        ],
      },
    ],
    sitemap: "https://l-ope.jp/sitemap.xml",
  };
}
