import type { ReactNode } from "react";
import { articles, getArticleTags } from "../articles";
import { categories } from "../categories";
import ArticleThumbnail from "./article-thumbnail";
import { ReadingProgress, TableOfContents, ShareButtons, InlineCTAButton } from "@/lib/column-shared/article-client";
import { formatDate } from "@/lib/column-shared/article-widgets";
/* 記事内ウィジェットを共有ライブラリからre-export */
export { ResultCard, StatGrid, BarChart, ComparisonTable, Callout, FlowSteps, DonutChart } from "@/lib/column-shared/article-widgets";

/* ═══════════════════════════════════════════════════════════════════════════
   型定義
   ═══════════════════════════════════════════════════════════════════════════ */

interface TocItem {
  id: string;
  label: string;
}

interface ArticleLayoutProps {
  slug: string;
  breadcrumbLabel: string;
  keyPoints: string[];
  toc: TocItem[];
  children: ReactNode;
}

const SITE_URL = "https://l-ope.jp";


/* ═══════════════════════════════════════════════════════════════════════════
   著者カード
   ═══════════════════════════════════════════════════════════════════════════ */

function AuthorCard() {
  const authorJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Lオペ for SALON 編集部",
    "url": "https://l-ope.jp/salon/about",
    "parentOrganization": {
      "@type": "Organization",
      "name": "株式会社ORDIX",
      "url": "https://l-ope.jp",
    },
    "description": "サロン向けLINE公式アカウント運用の専門メディア。予約管理・顧客管理・配信設計・リピート促進など、サロンLINE運用の実践的ノウハウを発信。",
    "knowsAbout": ["サロンLINE運用", "予約管理", "顧客管理", "リピート促進"],
  };

  const expertiseTags = ["サロンLINE運用", "予約管理", "リピート促進", "顧客管理", "スタンプカード"];

  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorJsonLd) }}
      />
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-400 text-[14px] font-bold text-white">
          S
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-gray-900">Lオペ for SALON 編集部</p>
          <p className="mt-0.5 text-[11px] text-gray-400">運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gray-600">株式会社ORDIX</a></p>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
            サロン向けLINE公式アカウント運用に関する実践的なノウハウを発信する専門編集チーム。予約管理・顧客管理・配信設計・リピート促進など、サロンLINE運用の成功を支援しています。
          </p>
          {/* 専門領域タグ */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {expertiseTags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
          {/* Lオペ for SALONとは？リンク */}
          <div className="mt-3">
            <Link
              href="/salon/about"
              className="inline-flex items-center gap-1 rounded-md border border-pink-200 bg-pink-50 px-3 py-1.5 text-[11px] font-semibold text-pink-600 transition hover:bg-pink-100"
            >
              Lオペ for SALONとは？
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   「この記事でわかること」ボックス
   ═══════════════════════════════════════════════════════════════════════════ */

function KeyPoints({ points }: { points: string[] }) {
  return (
    <div className="rounded-lg border border-pink-200 bg-pink-50/50 p-5">
      <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800">
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-pink-500" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        この記事でわかること
      </p>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-600">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pink-400" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   インラインCTA
   ═══════════════════════════════════════════════════════════════════════════ */

export function InlineCTA() {
  return (
    <div className="my-10 overflow-hidden rounded-xl bg-gradient-to-r from-pink-50 via-rose-50 to-violet-50 p-6 text-center ring-1 ring-pink-100">
      <p className="text-[14px] font-bold text-gray-800">サロンのLINE運用を<a href="/salon" className="text-pink-600 underline font-bold">Lオペ for SALON</a>でもっと効率的に</p>
      <p className="mt-1 text-[12px] text-gray-500"><a href="/salon" className="text-gray-600 underline">Lオペ for SALON</a>の機能・料金・導入事例をまとめた資料をお送りします。</p>
      <InlineCTAButton contactPath="/salon/contact" columnPathPrefix="/salon/column/" label="Lオペ for SALONの資料を無料で請求" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   カテゴリラベル
   ═══════════════════════════════════════════════════════════════════════════ */

const categoryColors: Record<string, { bg: string; text: string }> = {
  "サロンLINE活用入門":         { bg: "bg-blue-50", text: "text-blue-700" },
  "予約管理・ホットペッパー連携": { bg: "bg-pink-50", text: "text-pink-700" },
  "配信・リピート促進":         { bg: "bg-rose-50", text: "text-rose-700" },
  "リッチメニュー・UI設計":     { bg: "bg-cyan-50", text: "text-cyan-700" },
  "顧客管理・CRM":              { bg: "bg-violet-50", text: "text-violet-700" },
  "業態別活用事例":             { bg: "bg-orange-50", text: "text-orange-700" },
  "分析・改善":                 { bg: "bg-yellow-50", text: "text-yellow-700" },
  "成功事例・売上UP":           { bg: "bg-emerald-50", text: "text-emerald-700" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   メインレイアウト
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ArticleLayout({ slug, breadcrumbLabel, keyPoints, toc, children }: ArticleLayoutProps) {
  const self = articles.find((a) => a.slug === slug)!;
  /* カテゴリ情報（パンくず用） */
  const catDef = categories.find((c) => c.matchValues.includes(self.category));
  const catSlug = catDef?.slug ?? "getting-started";
  const catLabel = catDef?.label ?? self.category;
  /* 関連記事: 同カテゴリ優先 → 残りから補完して4件 */
  const others = articles.filter((a) => a.slug !== slug);
  const sameCategory = others.filter((a) => a.category === self.category);
  const diffCategory = others.filter((a) => a.category !== self.category);
  const related = [...sameCategory, ...diffCategory].slice(0, 4);
  const cc = categoryColors[self.category] || { bg: "bg-gray-50", text: "text-gray-600" };

  /* Article JSON-LD（全記事共通で自動生成） */
  const readMinutes = parseInt(self.readTime) || 5;
  const estimatedWordCount = readMinutes * 400;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: self.title,
    description: self.description,
    datePublished: `${self.date}T00:00:00+09:00`,
    dateModified: `${(self.updatedDate || self.date)}T00:00:00+09:00`,
    image: `${SITE_URL}/salon/column/${slug}/opengraph-image`,
    author: { "@type": "Organization", name: "Lオペ for SALON", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Lオペ for SALON", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
    mainEntityOfPage: `${SITE_URL}/salon/column/${slug}`,
    wordCount: estimatedWordCount,
    timeRequired: `PT${readMinutes}M`,
    inLanguage: "ja",
    isPartOf: { "@type": "WebSite", name: "Lオペ for SALON", url: SITE_URL },
  };

  return (
    <div className="min-h-screen bg-pink-50/30 text-gray-800">
      <ReadingProgress />
      {/* Article JSON-LD（集約） */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      {/* ヘッダー */}
      <header className="border-b border-gray-200/60 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/salon" className="flex items-center gap-1 text-[14px] font-bold tracking-tight text-gray-900 hover:opacity-70 transition">
            Lオペ <span className="text-pink-500">for SALON</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/salon/column" className="text-[12px] text-gray-400 hover:text-gray-700 transition">
              コラム一覧
            </a>
            <a
              href={`/salon/contact?ref=${slug}`}
              className="rounded-lg bg-pink-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-pink-700"
            >
              お問い合わせ
            </a>
          </div>
        </div>
      </header>

      {/* パンくず（4階層: トップ > コラム > カテゴリ > 記事タイトル） */}
      <div className="border-b border-gray-200/60 bg-white">
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-6 py-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-gray-400 list-none m-0 p-0">
            <li><a href="/salon" className="hover:text-pink-600 transition">トップ</a></li>
            <li aria-hidden="true" className="text-gray-300">/</li>
            <li><a href="/salon/column" className="hover:text-pink-600 transition">コラム</a></li>
            <li aria-hidden="true" className="text-gray-300">/</li>
            <li><a href={`/salon/column/category/${catSlug}`} className="hover:text-pink-600 transition">{catLabel}</a></li>
            <li aria-hidden="true" className="text-gray-300">/</li>
            <li className="text-gray-700 font-medium truncate max-w-[300px]">{self.title}</li>
          </ol>
        </nav>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "トップ", item: "https://l-ope.jp/salon" },
            { "@type": "ListItem", position: 2, name: "コラム", item: "https://l-ope.jp/salon/column" },
            { "@type": "ListItem", position: 3, name: catLabel, item: `https://l-ope.jp/salon/column/category/${catSlug}` },
            { "@type": "ListItem", position: 4, name: self.title, item: `https://l-ope.jp/salon/column/${slug}` },
          ],
        }) }} />
      </div>

      {/* 記事ヒーロー */}
      <div className="bg-gradient-to-b from-white to-gray-50 pb-8">
        <div className="mx-auto max-w-4xl px-6 pt-6">
          <div className="overflow-hidden rounded-xl shadow-sm">
            <ArticleThumbnail slug={slug} title={self.title} category={self.category} size="hero" />
          </div>
          <h1 className="mt-5 text-[22px] md:text-[26px] font-bold leading-tight text-gray-900">
            {self.title}
          </h1>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-[11px] font-bold text-pink-600">S</div>
                <span className="text-[12px] text-gray-500">Lオペ for SALON 編集部</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                <span>公開: <time dateTime={self.date}>{formatDate(self.date)}</time></span>
                {self.updatedDate && self.updatedDate !== self.date && (
                  <span>更新: <time dateTime={self.updatedDate}>{formatDate(self.updatedDate)}</time></span>
                )}
              </div>
              <span className="text-[12px] text-gray-300">{self.readTime}</span>
            </div>
            <ShareButtons title={self.title} slug={slug} columnPath="/salon/column" />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex gap-12">
          <main className="min-w-0 max-w-3xl flex-1 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 md:p-10">
            {keyPoints.length > 0 && (
              <div className="mb-10">
                <KeyPoints points={keyPoints} />
              </div>
            )}

            <details className="mb-10 rounded-lg border border-gray-200 p-4 lg:hidden">
              <summary className="cursor-pointer text-[13px] font-bold text-gray-700">目次</summary>
              <div className="mt-3">
                <TableOfContents items={toc} />
              </div>
            </details>

            <div className="prose-article space-y-8 text-[15px] leading-[1.9] text-gray-600">
              {children}
            </div>

            <div className="mt-16 space-y-6">
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-wrap gap-2">
                  {getArticleTags(self).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-md bg-gray-100 px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-pink-50 hover:text-pink-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-gray-400">この記事をシェア</p>
                <ShareButtons title={self.title} slug={slug} columnPath="/salon/column" />
              </div>
              <AuthorCard />
            </div>

            {/* CTA */}
            <div className="mt-10 overflow-hidden rounded-xl bg-gradient-to-br from-pink-100 via-rose-50 to-violet-100 p-8 text-center ring-1 ring-pink-200/80">
              <p className="text-[11px] font-bold tracking-widest text-pink-400 uppercase">Lオペ for SALON</p>
              <h2 className="mt-2 text-[18px] font-bold text-gray-800">サロンのLINE運用を始めませんか？</h2>
              <p className="mt-1 text-[13px] text-gray-500">予約管理・顧客管理・配信・スタンプカード・物販をオールインワンで。</p>
              <a
                href={`/salon/contact?ref=${slug}`}
                className="mt-4 inline-block rounded-lg bg-pink-600 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-pink-700 hover:shadow-lg"
              >
                お問い合わせ
              </a>
            </div>

            {/* 関連記事 */}
            <div className="mt-12">
              <h2 className="text-[16px] font-bold text-gray-900">関連記事</h2>
              <div className="mt-4 divide-y divide-gray-200">
                {related.map((a) => {
                  const rc = categoryColors[a.category] || { bg: "bg-gray-50", text: "text-gray-600" };
                  return (
                    <Link
                      key={a.slug}
                      href={`/salon/column/${a.slug}`}
                      className="group flex items-start gap-4 py-4 transition"
                    >
                      <div className="shrink-0 w-44 overflow-hidden rounded-md">
                        <ArticleThumbnail slug={a.slug} title={a.title} category={a.category} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${rc.bg} ${rc.text}`}>
                          {a.category}
                        </span>
                        <p className="mt-1 text-[13px] font-semibold text-gray-700 group-hover:text-pink-600 transition leading-relaxed line-clamp-2">
                          {a.title}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </main>

          {/* サイドバー */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60">
                <TableOfContents items={toc} />
              </div>
              <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-200/60">
                <p className="text-[12px] font-bold text-gray-700">お問い合わせ</p>
                <p className="mt-1 text-[11px] text-gray-400">まずはお気軽にご相談ください</p>
                <a
                  href={`/salon/contact?ref=${slug}`}
                  className="mt-3 inline-block w-full rounded-lg bg-gradient-to-r from-pink-600 to-rose-500 py-2.5 text-[11px] font-bold text-white transition hover:shadow-md hover:shadow-pink-500/20"
                >
                  お問い合わせ
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* フッター */}
      <footer className="bg-slate-50 py-10 text-center">
        <div className="mx-auto max-w-6xl px-6">
          <a href="/salon" className="text-[14px] font-bold tracking-tight text-slate-900 hover:opacity-80 transition">
            Lオペ <span className="text-pink-500">for SALON</span>
          </a>
          <div className="mt-4 flex items-center justify-center gap-6">
            <a href="/salon/column" className="text-[12px] text-slate-500 hover:text-pink-500 transition">
              コラム一覧
            </a>
            <a href="/salon" className="text-[12px] text-slate-500 hover:text-pink-500 transition">
              トップ
            </a>
            <a href="/salon/features" className="text-[12px] text-slate-500 hover:text-pink-500 transition">
              機能一覧
            </a>
            <a href="/salon/about" className="text-[12px] text-slate-500 hover:text-pink-500 transition">
              Lオペ for SALONとは
            </a>
            <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="text-[12px] text-slate-500 hover:text-pink-500 transition">
              運営会社
            </a>
          </div>
          <p className="mt-6 text-[11px] text-slate-400">&copy; {new Date().getFullYear()} 株式会社ORDIX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ウィジェットは冒頭でlib/column-sharedからre-export済み */
