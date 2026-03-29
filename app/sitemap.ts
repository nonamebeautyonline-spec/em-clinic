import type { MetadataRoute } from "next";
import { articles } from "./lp/column/articles";
import { categories } from "./lp/column/categories";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://l-ope.jp";
  const pageLastModified = {
    home: new Date("2026-03-30"),
    about: new Date("2026-03-30"),
    features: new Date("2026-03-30"),
    contact: new Date("2026-03-30"),
    column: new Date("2026-03-30"),
    legal: new Date("2026-03-30"),
  };

  const categoryLastModified = (categorySlug: string) => {
    const latest = articles
      .filter((article) => categories.find((category) => category.slug === categorySlug)?.matchValues.includes(article.category))
      .map((article) => new Date(article.updatedDate || article.date).getTime())
      .sort((a, b) => b - a)[0];

    return latest ? new Date(latest) : pageLastModified.column;
  };

  return [
    {
      url: baseUrl,
      lastModified: pageLastModified.home,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/lp/about`,
      lastModified: pageLastModified.about,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lp/features`,
      lastModified: pageLastModified.features,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lp/contact`,
      lastModified: pageLastModified.contact,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lp/column`,
      lastModified: pageLastModified.column,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...categories.map((c) => ({
      url: `${baseUrl}/lp/column/category/${c.slug}`,
      lastModified: categoryLastModified(c.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${baseUrl}/lp/column/${a.slug}`,
      lastModified: new Date(a.updatedDate || a.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/lp/terms`,
      lastModified: pageLastModified.legal,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lp/privacy`,
      lastModified: pageLastModified.legal,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lp/cancel`,
      lastModified: pageLastModified.legal,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
