"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "../articles";

/* ─── カテゴリカラー（アクセントのみ・控えめ） ─── */
const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  活用事例: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  ツール比較: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  ガイド: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  業務改善: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  マーケティング: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  比較: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
};

const allCategories = ["すべて", ...Array.from(new Set(articles.map((a) => a.category)))];

export default function ColumnIndex() {
  const [active, setActive] = useState("すべて");
  const filtered = active === "すべて" ? articles : articles.filter((a) => a.category === active);
  const featured = articles[0];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/lp" className="text-[13px] font-bold text-gray-900 hover:opacity-70 transition">
            Lオペ for CLINIC
          </Link>
          <a
            href="/lp#contact"
            className="rounded-lg bg-gray-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-gray-700"
          >
            資料請求
          </a>
        </div>
      </header>

      {/* パンくず */}
      <div className="border-b border-gray-50 bg-gray-50/50">
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-6 py-3">
          <ol className="flex items-center gap-2 text-[12px] text-gray-400 list-none m-0 p-0">
            <li><Link href="/lp" className="hover:text-gray-700 transition">トップ</Link></li>
            <li aria-hidden="true" className="text-gray-300">&gt;</li>
            <li className="text-gray-700 font-medium">コラム</li>
          </ol>
        </nav>
      </div>

      <main className="mx-auto max-w-6xl px-6">
        {/* ページタイトル */}
        <div className="pb-8 pt-10">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">コラム</h1>
          <p className="mt-2 text-[14px] text-gray-500">
            クリニックのLINE公式アカウント活用・DX推進に役立つ情報を発信しています
          </p>
        </div>

        {/* ピックアップ（横長カード） */}
        <div className="mb-10 overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-md">
          <Link href={`/lp/column/${featured.slug}`} className="flex flex-col md:flex-row">
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-gray-50 md:aspect-auto md:w-[400px]">
              <div className="flex flex-col items-center gap-3 px-8 py-10">
                <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Featured</span>
                <svg viewBox="0 0 80 80" className="h-16 w-16 text-gray-300">
                  <rect x="8" y="16" width="64" height="48" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="28" cy="36" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 52l16-12 12 8 16-16 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
              <div className="flex items-center gap-3">
                <CategoryLabel category={featured.category} />
                <time className="text-[12px] text-gray-400">{formatDate(featured.date)}</time>
              </div>
              <h2 className="mt-3 text-[18px] font-bold leading-relaxed text-gray-900 md:text-[20px]">{featured.title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-500 line-clamp-2">{featured.description}</p>
              <span className="mt-4 text-[13px] font-semibold text-sky-600">
                続きを読む →
              </span>
            </div>
          </Link>
        </div>

        {/* カテゴリフィルター */}
        <div className="flex items-center gap-6 border-b border-gray-200 pb-0">
          {allCategories.map((cat) => {
            const isActive = active === cat;
            const count = cat === "すべて" ? articles.length : articles.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`relative whitespace-nowrap pb-3 text-[13px] font-medium transition ${
                  isActive
                    ? "text-gray-900 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {cat}
                <span className="ml-1 text-[11px] text-gray-300">{count}</span>
              </button>
            );
          })}
        </div>

        {/* 記事一覧 */}
        <div className="divide-y divide-gray-100 pb-16">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/lp/column/${a.slug}`}
              className="group flex gap-5 py-6 transition md:gap-8"
            >
              {/* サムネイル（シンプルなアイコンプレースホルダー） */}
              <div className="hidden shrink-0 items-center justify-center rounded-md bg-gray-50 sm:flex sm:h-[100px] sm:w-[160px]">
                <ArticleIcon category={a.category} />
              </div>
              {/* テキスト */}
              <div className="flex flex-1 flex-col justify-center">
                <div className="flex items-center gap-3">
                  <CategoryLabel category={a.category} />
                  <time className="text-[11px] text-gray-400">{formatDate(a.date)}</time>
                  <span className="text-[11px] text-gray-300">{a.readTime}</span>
                </div>
                <h2 className="mt-2 text-[15px] font-bold leading-relaxed text-gray-900 group-hover:text-sky-600 transition line-clamp-2 md:text-[16px]">
                  {a.title}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-400 line-clamp-1 hidden md:block">{a.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mb-16 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center md:p-12">
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Lオペ for CLINIC</p>
          <h2 className="mt-3 text-[20px] font-bold text-gray-900">LINE公式アカウントでクリニック業務をDX化</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-gray-500">
            予約・問診・配信・決済・配送管理をオールインワンで。まずは無料で資料をご覧ください。
          </p>
          <a
            href="/lp#contact"
            className="mt-6 inline-block rounded-lg bg-gray-900 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-gray-700"
          >
            無料で資料請求
          </a>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8 text-center">
        <Link href="/lp" className="text-[12px] text-gray-400 hover:text-gray-600 transition">
          ← Lオペ for CLINIC トップに戻る
        </Link>
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

/* ─── 記事アイコン（カテゴリ別SVG） ─── */
function ArticleIcon({ category }: { category: string }) {
  const color = "text-gray-300";
  const icons: Record<string, React.ReactNode> = {
    活用事例: (
      <svg viewBox="0 0 48 48" className={`h-10 w-10 ${color}`}>
        <rect x="6" y="10" width="36" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 18h36M16 10v8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="24" cy="32" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    ツール比較: (
      <svg viewBox="0 0 48 48" className={`h-10 w-10 ${color}`}>
        <rect x="4" y="14" width="16" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="28" y="14" width="16" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 26h8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 23l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    ガイド: (
      <svg viewBox="0 0 48 48" className={`h-10 w-10 ${color}`}>
        <path d="M12 8v32l12-8 12 8V8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M18 18h12M18 24h8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    業務改善: (
      <svg viewBox="0 0 48 48" className={`h-10 w-10 ${color}`}>
        <path d="M8 36l8-10 8 6 8-12 8-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    マーケティング: (
      <svg viewBox="0 0 48 48" className={`h-10 w-10 ${color}`}>
        <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M24 8v16l11 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    比較: (
      <svg viewBox="0 0 48 48" className={`h-10 w-10 ${color}`}>
        <rect x="4" y="14" width="16" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="28" y="14" width="16" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 26h8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 23l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };
  return icons[category] || icons["ガイド"];
}

/* ─── 日付フォーマット ─── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
