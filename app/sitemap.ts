import type { MetadataRoute } from "next";
import { articles } from "./lp/column/articles";
import { categories } from "./lp/column/categories";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://l-ope.jp";

  const today = new Date("2026-03-18");

  return [
    {
      url: `${baseUrl}/lp`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/lp/about`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lp/features`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lp/contact`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lp/column`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...categories.map((c) => ({
      url: `${baseUrl}/lp/column/category/${c.slug}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: `${baseUrl}/lp/column/${a.slug}`,
      lastModified: new Date(a.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${baseUrl}/lp/terms`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lp/privacy`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lp/cancel`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
