import type { MetadataRoute } from "next";
import { articles } from "./clinic/column/articles";
import { categories } from "./clinic/column/categories";
import { articles as lineArticles } from "./line/column/articles";
import { categories as lineCategories } from "./line/column/categories";
import { articles as salonArticles } from "./salon/column/articles";
import { categories as salonCategories } from "./salon/column/categories";
import { articles as ecArticles } from "./ec/column/articles";
import { categories as ecCategories } from "./ec/column/categories";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://l-ope.jp";
  const pageLastModified = {
    home: new Date("2026-03-31"),
    about: new Date("2026-03-30"),
    features: new Date("2026-03-30"),
    contact: new Date("2026-03-30"),
    column: new Date("2026-03-30"),
    legal: new Date("2026-03-30"),
    line: new Date("2026-03-31"),
  };

  const categoryLastModified = (cats: typeof categories, arts: typeof articles, categorySlug: string) => {
    const latest = arts
      .filter((article) => cats.find((category) => category.slug === categorySlug)?.matchValues.includes(article.category))
      .map((article) => new Date(article.updatedDate || article.date).getTime())
      .sort((a, b) => b - a)[0];

    return latest ? new Date(latest) : pageLastModified.column;
  };

  return [
    /* ─── トップ ─── */
    {
      url: baseUrl,
      lastModified: pageLastModified.home,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    /* ─── クリニック向け（/lp） ─── */
    {
      url: `${baseUrl}/clinic/about`,
      lastModified: pageLastModified.about,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/clinic/features`,
      lastModified: pageLastModified.features,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/clinic/contact`,
      lastModified: pageLastModified.contact,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/clinic/column`,
      lastModified: pageLastModified.column,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...categories.map((c) => ({
      url: `${baseUrl}/clinic/column/category/${c.slug}`,
      lastModified: categoryLastModified(categories, articles, c.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${baseUrl}/clinic/column/${a.slug}`,
      lastModified: new Date(a.updatedDate || a.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/clinic/terms`,
      lastModified: pageLastModified.legal,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/clinic/privacy`,
      lastModified: pageLastModified.legal,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/clinic/cancel`,
      lastModified: pageLastModified.legal,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    /* ─── 汎用LINE運用（/line） ─── */
    {
      url: `${baseUrl}/line`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/line/about`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/line/features`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/line/contact`,
      lastModified: pageLastModified.line,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/line/column`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...lineCategories.map((c) => ({
      url: `${baseUrl}/line/column/category/${c.slug}`,
      lastModified: categoryLastModified(lineCategories, lineArticles, c.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...lineArticles.map((a) => ({
      url: `${baseUrl}/line/column/${a.slug}`,
      lastModified: new Date(a.updatedDate || a.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    /* ─── サロン向け（/salon） ─── */
    {
      url: `${baseUrl}/salon`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/salon/about`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/salon/features`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/salon/contact`,
      lastModified: pageLastModified.line,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/salon/column`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...salonCategories.map((c) => ({
      url: `${baseUrl}/salon/column/category/${c.slug}`,
      lastModified: categoryLastModified(salonCategories, salonArticles, c.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...salonArticles.map((a) => ({
      url: `${baseUrl}/salon/column/${a.slug}`,
      lastModified: new Date(a.updatedDate || a.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    /* ─── EC・小売向け（/ec） ─── */
    {
      url: `${baseUrl}/ec`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ec/about`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ec/features`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ec/contact`,
      lastModified: pageLastModified.line,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ec/column`,
      lastModified: pageLastModified.line,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...ecCategories.map((c) => ({
      url: `${baseUrl}/ec/column/category/${c.slug}`,
      lastModified: categoryLastModified(ecCategories, ecArticles, c.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...ecArticles.map((a) => ({
      url: `${baseUrl}/ec/column/${a.slug}`,
      lastModified: new Date(a.updatedDate || a.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
