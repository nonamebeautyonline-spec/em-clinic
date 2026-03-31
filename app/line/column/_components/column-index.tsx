"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "../articles";
import { categories, getArticlesByCategory } from "../categories";
import ArticleThumbnail from "./article-thumbnail";

/* ─── カテゴリ設定 ─── */
const categoryStyles: Record<string, { pill: string }> = {
  "LINE公式アカウント入門": { pill: "bg-blue-50 text-blue-600 ring-blue-200/50" },
  "ツール比較・選定":       { pill: "bg-violet-50 text-violet-600 ring-violet-200/50" },
  "配信・メッセージング":   { pill: "bg-rose-50 text-rose-600 ring-rose-200/50" },
  "リッチメニュー・UI設計": { pill: "bg-cyan-50 text-cyan-600 ring-cyan-200/50" },
  "自動化・効率化":         { pill: "bg-teal-50 text-teal-600 ring-teal-200/50" },
  "業種別活用事例":         { pill: "bg-orange-50 text-orange-600 ring-orange-200/50" },
  "分析・改善":             { pill: "bg-yellow-50 text-yellow-700 ring-yellow-200/50" },
  "成功事例・ノウハウ":     { pill: "bg-emerald-50 text-emerald-600 ring-emerald-200/50" },
};

const allCategories = ["すべて", ...Array.from(new Set(articles.map((a) => a.category)))];

/* ─── 注目記事（3記事） ─── */
const featuredSlugs = [
  "line-extension-tool-comparison-2026",
  "line-segment-delivery-design-guide",
  "line-sales-3x-5-case-studies",
];

/* ─── 人気記事 ─── */
const popularSlugs = [
  "how-to-create-line-official-account-2026",
  "line-extension-tool-comparison-2026",
  "line-rich-menu-complete-guide",
  "line-block-rate-reduction-7-methods",
  "line-friends-collection-15-strategies",
];

/* ─── 人気タグ ─── */
const popularTags = [
  "LINE公式アカウント", "セグメント配信", "リッチメニュー", "Lステップ",
  "自動応答", "チャットボット", "友だち集め", "ブロック率",
  "シナリオ配信", "開封率",
];

export default function ColumnIndex() {
  const [active, setActive] = useState("すべて");
  const filtered = active === "すべて" ? articles : articles.filter((a) => a.category === active);
  const popular = popularSlugs.map((s) => articles.find((a) => a.slug === s)!).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-gray-200/60 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link href="/line" className="flex items-center gap-1.5 text-[16px] font-bold tracking-tight text-gray-900 hover:opacity-70 transition">
            Lオペ
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/line/about" className="hidden text-[14px] text-gray-500 hover:text-blue-600 transition md:block">Lオペとは</Link>
            <Link href="/line/features" className="hidden text-[14px] text-gray-500 hover:text-blue-600 transition md:block">機能一覧</Link>
            <Link href="/line/column" className="hidden text-[14px] font-medium text-blue-600 md:block">コラム</Link>
            <Link
              href="/line/contact"
              className="rounded-full bg-blue-600 px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-700 hover:shadow-md"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </header>

      {/* パンくず */}
      <div className="border-b border-gray-200 bg-white">
        <nav aria-label="パンくずリスト" className="mx-auto max-w-7xl px-6 py-3">
          <ol className="flex items-center gap-2 text-[13px] text-gray-400 list-none m-0 p-0">
            <li><Link href="/line" className="hover:text-blue-600 transition">トップ</Link></li>
            <li aria-hidden="true" className="text-gray-300">/</li>
            <li className="text-gray-700 font-medium">コラム</li>
          </ol>
        </nav>
      </div>

      {/* ページヒーロー */}
      <div className="bg-white px-6 pb-6 pt-10 md:pb-8 md:pt-14">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 md:text-[36px]">コラム</h1>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-gray-500">
            LINE公式アカウントの運用・活用に役立つ情報を発信しています
          </p>
        </div>
      </div>

      {/* カテゴリ別ピラー導線 */}
      <div className="border-b border-gray-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => {
              const count = getArticlesByCategory(cat).length;
              return (
                <Link
                  key={cat.slug}
                  href={`/line/column/category/${cat.slug}`}
                  className="group rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <p className="text-[14px] font-bold text-gray-800 group-hover:text-blue-700 transition">{cat.label}</p>
                  <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">{cat.description.slice(0, 40)}...</p>
                  <p className="mt-1.5 text-[11px] font-semibold text-blue-500">{count}件の記事</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 注目記事 */}
      <div className="border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 px-6 pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-[12px] font-bold text-white shadow-sm">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              注目記事
            </span>
            <span className="text-[13px] text-gray-400">まずはこちらをチェック</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {featuredSlugs.map((slug) => {
              const a = articles.find((x) => x.slug === slug);
              if (!a) return null;
              return (
                <Link
                  key={a.slug}
                  href={`/line/column/${a.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/50 hover:ring-blue-300/80"
                >
                  <div className="overflow-hidden">
                    <div className="transition-transform duration-300 group-hover:scale-[1.03]">
                      <ArticleThumbnail slug={a.slug} title={a.title} category={a.category} size="card" />
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[13px] leading-relaxed text-gray-500 line-clamp-3">{a.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2.5 pb-5 pt-5">
          {allCategories.map((cat) => {
            const isActive = active === cat;
            const count = cat === "すべて" ? articles.length : articles.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`shrink-0 rounded-full px-5 py-2 text-[14px] font-medium ring-1 transition ${
                  isActive
                    ? "bg-blue-600 text-white ring-blue-600 shadow-sm"
                    : "bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {cat}
                <span className={`ml-1.5 text-[12px] ${isActive ? "text-blue-200" : "text-gray-300"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* メインコンテンツ — 2カラム */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex gap-10">
          {/* ─── メインカラム ─── */}
          <main className="min-w-0 flex-1">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <Link
                  key={a.slug}
                  href={`/line/column/${a.slug}`}
                  className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-blue-200/80"
                >
                  {/* サムネイル */}
                  <div className="overflow-hidden">
                    <div className="transition-transform duration-300 group-hover:scale-[1.03]">
                      <ArticleThumbnail slug={a.slug} title={a.title} category={a.category} size="card" hideTitle />
                    </div>
                  </div>

                  {/* テキスト */}
                  <div className="px-5 py-4">
                    {/* カテゴリ */}
                    <CategoryPill category={a.category} />

                    {/* タイトル */}
                    <h3 className="mt-2.5 text-[15px] font-bold leading-snug text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
                      {a.title}
                    </h3>

                    {/* 説明文（3行まで） */}
                    <p className="mt-2 text-[13px] leading-relaxed text-gray-500 line-clamp-3">{a.description}</p>

                    {/* メタ情報 */}
                    <div className="mt-3 flex items-center gap-3 text-[12px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {formatDate(a.date)}
                      </span>
                      <span className="flex items-center gap-1 text-gray-300">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        {a.readTime}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-14 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-10 text-center ring-1 ring-blue-100 md:p-14">
              <p className="text-[12px] font-bold tracking-widest text-blue-400 uppercase">Lオペ</p>
              <h2 className="mt-3 text-[22px] font-bold text-gray-800 md:text-[26px]">LINE公式アカウント運用をもっと効率的に</h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-gray-500">
                配信・自動応答・顧客管理・分析をオールインワンで。<br className="hidden sm:block" />まずはお気軽にお問い合わせください。
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/line/contact"
                  className="rounded-full bg-blue-600 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg"
                >
                  お問い合わせ
                </Link>
                <Link
                  href="/line/features"
                  className="rounded-full bg-white px-8 py-3.5 text-[14px] font-bold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-blue-600"
                >
                  機能一覧を見る
                </Link>
              </div>
            </div>
          </main>

          {/* ─── サイドバー ─── */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-20 space-y-8">
              {/* 人気記事 */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-900">
                  <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
                  </svg>
                  人気記事
                </h3>
                <div className="mt-4 space-y-0 divide-y divide-gray-100">
                  {popular.map((a, i) => (
                    <Link
                      key={a.slug}
                      href={`/line/column/${a.slug}`}
                      className="group flex items-start gap-3 py-3.5 transition"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <p className="text-[13px] font-medium leading-snug text-gray-700 group-hover:text-blue-600 transition line-clamp-2">
                        {a.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* カテゴリ */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
                <h3 className="text-[15px] font-bold text-gray-900">カテゴリ</h3>
                <div className="mt-4 space-y-1">
                  {categories.map((cat) => {
                    const count = articles.filter((a) => cat.matchValues.includes(a.category)).length;
                    return (
                      <Link
                        key={cat.slug}
                        href={`/line/column/category/${cat.slug}`}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[14px] text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        {cat.label}
                        <span className="text-[12px] text-gray-300">{count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 人気タグ */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
                <h3 className="text-[15px] font-bold text-gray-900">人気タグ</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full bg-gray-50 px-3 py-1.5 text-[12px] text-gray-600 ring-1 ring-gray-200/60 transition hover:bg-blue-50 hover:text-blue-600 hover:ring-blue-200/50 cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* サイドバーCTA */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center ring-1 ring-blue-100">
                <p className="text-[14px] font-bold text-gray-800">LINE運用のご相談はこちら</p>
                <p className="mt-1.5 text-[12px] text-gray-500">機能・料金・事例をまとめた資料を<br />無料でお送りします</p>
                <Link
                  href="/line/contact"
                  className="mt-4 inline-block w-full rounded-full bg-blue-600 py-3 text-[13px] font-bold text-white transition hover:bg-blue-700 hover:shadow-md"
                >
                  お問い合わせ
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-[14px] font-bold text-gray-900">
              Lオペ
            </p>
            <div className="flex items-center gap-6">
              <Link href="/line" className="text-[13px] text-gray-400 hover:text-blue-600 transition">トップ</Link>
              <Link href="/line/about" className="text-[13px] text-gray-400 hover:text-blue-600 transition">Lオペとは</Link>
              <Link href="/line/features" className="text-[13px] text-gray-400 hover:text-blue-600 transition">機能一覧</Link>
              <Link href="/line/column" className="text-[13px] text-blue-600 font-medium">コラム</Link>
              <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="text-[13px] text-gray-400 hover:text-blue-600 transition">運営会社</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── カテゴリピルバッジ ─── */
function CategoryPill({ category }: { category: string }) {
  const s = categoryStyles[category] || { pill: "bg-gray-50 text-gray-600 ring-gray-200/50" };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${s.pill}`}>
      {category}
    </span>
  );
}

/* ─── 日付フォーマット ─── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
