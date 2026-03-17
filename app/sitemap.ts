import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://l-ope.jp";

  return [
    {
      url: `${baseUrl}/lp`,
      lastModified: new Date("2026-03-17"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/lp/terms`,
      lastModified: new Date("2026-03-17"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lp/privacy`,
      lastModified: new Date("2026-03-17"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lp/cancel`,
      lastModified: new Date("2026-03-17"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lp/features`,
      lastModified: new Date("2026-03-17"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
