"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "../articles";
import ArticleThumbnail from "./article-thumbnail";

/* ─── カテゴリ設定（ピル型バッジ用） ─── */
const categoryStyles: Record<string, { pill: string }> = {
  活用事例:       { pill: "bg-blue-50 text-blue-600 ring-blue-200/50" },
  ツール比較:     { pill: "bg-violet-50 text-violet-600 ring-violet-200/50" },
  ガイド:         { pill: "bg-indigo-50 text-indigo-600 ring-indigo-200/50" },
  業務改善:       { pill: "bg-sky-50 text-sky-600 ring-sky-200/50" },
  マーケティング: { pill: "bg-purple-50 text-purple-600 ring-purple-200/50" },
  比較:           { pill: "bg-violet-50 text-violet-600 ring-violet-200/50" },
};

const allCategories = ["すべて", ...Array.from(new Set(articles.map((a) => a.category)))];

/* ─── 人気記事（上位5件ハードコード — 実際はPV順にしたい） ─── */
const popularSlugs = [
  "clinic-line-case-studies",
  "lstep-vs-clinic-tool",
  "clinic-dx-guide",
  "ai-auto-reply-guide",
  "reservation-system-comparison",
];

export default function ColumnIndex() {
  const [active, setActive] = useState("すべて");
  const filtered = active === "すべて" ? articles : articles.filter((a) => a.category === active);
  const popular = popularSlugs.map((s) => articles.find((a) => a.slug === s)!).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50/40 text-gray-800">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-gray-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/lp" className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-gray-900 hover:opacity-70 transition">
            Lオペ <span className="text-blue-600">for CLINIC</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/lp/about" className="hidden text-[13px] text-gray-500 hover:text-blue-600 transition sm:block">Lオペとは</Link>
            <Link href="/lp/features" className="hidden text-[13px] text-gray-500 hover:text-blue-600 transition sm:block">機能一覧</Link>
            <a
              href="/lp#contact"
              className="rounded-full bg-blue-600 px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 hover:shadow-md"
            >
              無料で資料請求
            </a>
          </div>
        </div>
      </header>

      {/* パンくず */}
      <div className="border-b border-gray-100 bg-white">
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-6 py-2.5">
          <ol className="flex items-center gap-1.5 text-[12px] text-gray-400 list-none m-0 p-0">
            <li><Link href="/lp" className="hover:text-blue-600 transition">トップ</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-600 font-medium">コラム</li>
          </ol>
        </nav>
      </div>

      {/* ページヒーロー */}
      <div className="bg-white px-6 pb-8 pt-10 md:pb-10 md:pt-14">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 md:text-[32px]">コラム</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-gray-500">
            クリニックのLINE公式アカウント活用・DX推進に役立つ情報を発信しています
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6">
        {/* カテゴリフィルター（ピル型タブ） */}
        <div className="flex flex-wrap items-center gap-2 pb-8">
          {allCategories.map((cat) => {
            const isActive = active === cat;
            const count = cat === "すべて" ? articles.length : articles.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium ring-1 transition ${
                  isActive
                    ? "bg-blue-600 text-white ring-blue-600 shadow-sm"
                    : "bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {cat}
                <span className={`ml-1.5 text-[11px] ${isActive ? "text-blue-200" : "text-gray-300"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 記事グリッド — Medibot風カード */}
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/lp/column/${a.slug}`}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/50 hover:ring-blue-200/80"
            >
              {/* サムネイル（全幅） */}
              <div className="overflow-hidden">
                <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                  <ArticleThumbnail slug={a.slug} title={a.title} category={a.category} size="card" />
                </div>
              </div>

              {/* テキスト部分 */}
              <div className="px-5 py-4">
                {/* カテゴリ + 日付 */}
                <div className="flex items-center gap-2.5">
                  <CategoryPill category={a.category} />
                  <time className="text-[11px] text-gray-400">{formatDate(a.date)}</time>
                  <span className="flex items-center gap-1 text-[11px] text-gray-300">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {a.readTime}
                  </span>
                </div>

                {/* 説明文 */}
                <p className="mt-2.5 text-[13px] leading-relaxed text-gray-500 line-clamp-2">{a.description}</p>

                {/* 続きを読む */}
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  続きを読む
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* 人気記事セクション */}
        <section className="mt-16 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
              </svg>
            </div>
            <h2 className="text-[18px] font-bold text-gray-900">人気記事</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {popular.map((a, i) => (
              <Link
                key={a.slug}
                href={`/lp/column/${a.slug}`}
                className="group flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-200/60"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[12px] font-bold text-blue-600">
                  {i + 1}
                </span>
                <p className="text-[13px] font-medium leading-snug text-gray-700 group-hover:text-blue-600 transition line-clamp-3">
                  {a.title}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="my-12 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-10 text-center ring-1 ring-blue-100 md:p-14">
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Lオペ for CLINIC</p>
          <h2 className="mt-3 text-[20px] font-bold text-gray-800 md:text-[24px]">LINE公式アカウントでクリニック業務をDX化</h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-gray-500">
            予約・問診・配信・決済・配送管理をオールインワンで。<br className="hidden sm:block" />まずは無料で資料をご覧ください。
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/lp#contact"
              className="rounded-full bg-blue-600 px-8 py-3.5 text-[13px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg"
            >
              無料で資料請求
            </a>
            <Link
              href="/lp/features"
              className="rounded-full bg-white px-8 py-3.5 text-[13px] font-bold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-blue-600"
            >
              機能一覧を見る
            </Link>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-[13px] font-bold text-gray-900">
              Lオペ <span className="text-blue-600">for CLINIC</span>
            </p>
            <div className="flex items-center gap-6">
              <Link href="/lp" className="text-[12px] text-gray-400 hover:text-blue-600 transition">トップ</Link>
              <Link href="/lp/about" className="text-[12px] text-gray-400 hover:text-blue-600 transition">Lオペとは</Link>
              <Link href="/lp/features" className="text-[12px] text-gray-400 hover:text-blue-600 transition">機能一覧</Link>
              <Link href="/lp/column" className="text-[12px] text-blue-600 font-medium">コラム</Link>
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${s.pill}`}>
      {category}
    </span>
  );
}

/* ─── 日付フォーマット ─── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
