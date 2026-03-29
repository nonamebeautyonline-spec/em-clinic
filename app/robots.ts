import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // 管理画面・患者向け非公開パス（クロール禁止）
  const disallowedPaths = [
    "/admin/",
    "/doctor/",
    "/platform/",
    "/api/",
    "/register/",
    "/login/",
    "/intake/",
    "/checkout/",
    "/mypage/",
    "/reserve/",
    "/questionnaire/",
    "/repair/",
    "/_next/",
  ];

  // LP・コラムのみ許可するパス（AIクローラー向け）
  const publicAllowPaths = [
    "/lp",
    "/lp/about",
    "/lp/features",
    "/lp/contact",
    "/lp/column",
    "/lp/terms",
    "/lp/privacy",
    "/lp/cancel",
  ];

  return {
    rules: [
      // デフォルト: LP・コラムは許可、管理画面はブロック
      {
        userAgent: "*",
        allow: publicAllowPaths,
        disallow: disallowedPaths,
      },
      // GPTBot: LP・コラムのみ許可、管理画面ブロック
      {
        userAgent: "GPTBot",
        allow: publicAllowPaths,
        disallow: disallowedPaths,
      },
      // ChatGPT-User: LP・コラムのみ許可、管理画面ブロック
      {
        userAgent: "ChatGPT-User",
        allow: publicAllowPaths,
        disallow: disallowedPaths,
      },
      // Claude-Web: LP・コラムのみ許可、管理画面ブロック
      {
        userAgent: "Claude-Web",
        allow: publicAllowPaths,
        disallow: disallowedPaths,
      },
      // Bytespider（TikTok系）: 完全ブロック — 帯域消費が激しい
      {
        userAgent: "Bytespider",
        disallow: ["/"],
      },
      // CCBot（Common Crawl）: 完全ブロック — 帯域消費が激しい
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: "https://l-ope.jp/sitemap.xml",
  };
}
