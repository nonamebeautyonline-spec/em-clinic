"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "../articles";
import ArticleThumbnail from "./article-thumbnail";

/* ─── カテゴリカラー ─── */
const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  活用事例: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ツール比較: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  ガイド: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  業務改善: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  マーケティング: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  比較: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
};

const allCategories = ["すべて", ...Array.from(new Set(articles.map((a) => a.category)))];

export default function ColumnIndex() {
  const [active, setActive] = useState("すべて");
  const filtered = active === "すべて" ? articles : articles.filter((a) => a.category === active);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/lp" className="flex items-center gap-2 text-[14px] font-bold tracking-tight text-gray-900 hover:opacity-70 transition">
            Lオペ <span className="text-blue-600">for CLINIC</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/lp/about" className="hidden text-[13px] text-gray-400 hover:text-gray-700 transition sm:block">Lオペとは</Link>
            <a
              href="/lp#contact"
              className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
            >
              資料請求
            </a>
          </div>
        </div>
      </header>

      {/* パンくず */}
      <div className="border-b border-gray-100 bg-gray-50/50">
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-6 py-3">
          <ol className="flex items-center gap-2 text-[12px] text-gray-400 list-none m-0 p-0">
            <li><Link href="/lp" className="hover:text-blue-600 transition">トップ</Link></li>
            <li aria-hidden="true" className="text-gray-300">/</li>
            <li className="text-gray-700 font-medium">コラム</li>
          </ol>
        </nav>
      </div>

      {/* ページヒーロー（明るいブルー系） */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 md:text-[32px]">コラム</h1>
          <p className="mt-2 text-[14px] text-gray-500">
            クリニックのLINE公式アカウント活用・DX推進に役立つ情報を発信しています
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6">
        {/* カテゴリフィルター */}
        <div className="flex items-center gap-6 overflow-x-auto border-b border-gray-200 pb-0 pt-6">
          {allCategories.map((cat) => {
            const isActive = active === cat;
            const count = cat === "すべて" ? articles.length : articles.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`relative shrink-0 whitespace-nowrap pb-3 text-[13px] font-medium transition ${
                  isActive
                    ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-blue-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {cat}
                <span className={`ml-1 text-[11px] ${isActive ? "text-blue-400" : "text-gray-300"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 記事グリッド — marchスタイルサムネイルカード */}
        <div className="grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/lp/column/${a.slug}`}
              className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200/60 transition hover:shadow-lg hover:ring-blue-200"
            >
              {/* サムネイル */}
              <ArticleThumbnail slug={a.slug} title={a.title} category={a.category} size="card" />

              {/* メタ情報 */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <CategoryLabel category={a.category} />
                  <time className="text-[11px] text-gray-400">{formatDate(a.date)}</time>
                  <span className="text-[11px] text-gray-300">{a.readTime}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-gray-400 line-clamp-2">{a.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA（明るいトーン） */}
        <div className="mb-16 overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-8 text-center ring-1 ring-blue-100 md:p-12">
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Lオペ for CLINIC</p>
          <h2 className="mt-3 text-[20px] font-bold text-gray-800 md:text-[24px]">LINE公式アカウントでクリニック業務をDX化</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-gray-500">
            予約・問診・配信・決済・配送管理をオールインワンで。まずは無料で資料をご覧ください。
          </p>
          <a
            href="/lp#contact"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg"
          >
            無料で資料請求
          </a>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 text-center">
        <div className="flex items-center justify-center gap-6">
          <Link href="/lp" className="text-[12px] text-gray-400 hover:text-blue-600 transition">
            ← Lオペ for CLINIC トップ
          </Link>
          <Link href="/lp/about" className="text-[12px] text-gray-400 hover:text-blue-600 transition">
            Lオペとは
          </Link>
          <Link href="/lp/features" className="text-[12px] text-gray-400 hover:text-blue-600 transition">
            機能一覧
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── カテゴリラベル ─── */
function CategoryLabel({ category }: { category: string }) {
  const c = categoryColors[category] || { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {category}
    </span>
  );
}

/* ─── 日付フォーマット ─── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
