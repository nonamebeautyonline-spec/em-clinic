"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "../articles";

/* ─── カテゴリカラー（ブランドカラーベース） ─── */
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
  const featured = articles.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800">
      {/* ヘッダー */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/lp" className="flex items-center gap-2 text-[14px] font-bold tracking-tight text-slate-900 hover:opacity-70 transition">
            Lオペ <span className="text-blue-600">for CLINIC</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/lp/about" className="hidden text-[12px] text-slate-400 hover:text-slate-700 transition sm:block">Lオペとは</Link>
            <a
              href="/lp#contact"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/20"
            >
              資料請求
            </a>
          </div>
        </div>
      </header>

      {/* パンくず */}
      <div className="border-b border-slate-100 bg-slate-50/50">
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-6 py-3">
          <ol className="flex items-center gap-2 text-[12px] text-slate-400 list-none m-0 p-0">
            <li><Link href="/lp" className="hover:text-blue-600 transition">トップ</Link></li>
            <li aria-hidden="true" className="text-slate-300">&gt;</li>
            <li className="text-slate-700 font-medium">コラム</li>
          </ol>
        </nav>
      </div>

      {/* ページタイトル（グラデーション背景） */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-[28px] font-bold tracking-tight text-white md:text-[32px]">コラム</h1>
          <p className="mt-2 text-[14px] text-blue-200/70">
            クリニックのLINE公式アカウント活用・DX推進に役立つ情報を発信しています
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6">
        {/* ピックアップ（3カード・グラデーション背景付き） */}
        <div className="-mt-8 mb-10 grid gap-4 md:grid-cols-3">
          {featured.map((a, i) => (
            <Link
              key={a.slug}
              href={`/lp/column/${a.slug}`}
              className="group overflow-hidden rounded-xl bg-white shadow-lg shadow-slate-200/50 ring-1 ring-slate-200/60 transition hover:shadow-xl hover:ring-blue-300/50"
            >
              {/* 上部アクセントバー */}
              <div className={`h-1.5 ${i === 0 ? "bg-gradient-to-r from-blue-500 to-violet-500" : i === 1 ? "bg-gradient-to-r from-violet-500 to-purple-500" : "bg-gradient-to-r from-indigo-500 to-blue-500"}`} />
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <CategoryLabel category={a.category} />
                  <time className="text-[11px] text-slate-400">{formatDate(a.date)}</time>
                </div>
                <h2 className="mt-2.5 text-[15px] font-bold leading-relaxed text-slate-800 group-hover:text-blue-600 transition line-clamp-2">
                  {a.title}
                </h2>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-400 line-clamp-2">{a.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
                  続きを読む
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* カテゴリフィルター */}
        <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 pb-0">
          {allCategories.map((cat) => {
            const isActive = active === cat;
            const count = cat === "すべて" ? articles.length : articles.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`relative shrink-0 whitespace-nowrap pb-3 text-[13px] font-medium transition ${
                  isActive
                    ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gradient-to-r after:from-blue-600 after:to-violet-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {cat}
                <span className={`ml-1 text-[11px] ${isActive ? "text-blue-400" : "text-slate-300"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 記事一覧 */}
        <div className="divide-y divide-slate-100 pb-16">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/lp/column/${a.slug}`}
              className="group flex gap-5 py-6 transition md:gap-8"
            >
              {/* サムネイル */}
              <div className="hidden shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 ring-1 ring-slate-200/60 sm:flex sm:h-[100px] sm:w-[160px]">
                <ArticleIcon category={a.category} />
              </div>
              {/* テキスト */}
              <div className="flex flex-1 flex-col justify-center">
                <div className="flex items-center gap-3">
                  <CategoryLabel category={a.category} />
                  <time className="text-[11px] text-slate-400">{formatDate(a.date)}</time>
                  <span className="text-[11px] text-slate-300">{a.readTime}</span>
                </div>
                <h2 className="mt-2 text-[15px] font-bold leading-relaxed text-slate-800 group-hover:text-blue-600 transition line-clamp-2 md:text-[16px]">
                  {a.title}
                </h2>
                <p className="mt-1 hidden text-[13px] leading-relaxed text-slate-400 line-clamp-1 md:block">{a.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mb-16 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-8 text-center md:p-12">
          <p className="text-[11px] font-bold tracking-widest text-blue-300/60 uppercase">Lオペ for CLINIC</p>
          <h2 className="mt-3 text-[20px] font-bold text-white md:text-[24px]">LINE公式アカウントでクリニック業務をDX化</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-blue-200/60">
            予約・問診・配信・決済・配送管理をオールインワンで。まずは無料で資料をご覧ください。
          </p>
          <a
            href="/lp#contact"
            className="mt-6 inline-block rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-8 py-3 text-[13px] font-bold text-white transition hover:shadow-lg hover:shadow-blue-500/30"
          >
            無料で資料請求
          </a>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center">
        <div className="flex items-center justify-center gap-6">
          <Link href="/lp" className="text-[12px] text-slate-400 hover:text-blue-600 transition">
            ← Lオペ for CLINIC トップ
          </Link>
          <Link href="/lp/about" className="text-[12px] text-slate-400 hover:text-blue-600 transition">
            Lオペとは
          </Link>
          <Link href="/lp/features" className="text-[12px] text-slate-400 hover:text-blue-600 transition">
            機能一覧
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── カテゴリラベル ─── */
function CategoryLabel({ category }: { category: string }) {
  const c = categoryColors[category] || { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {category}
    </span>
  );
}

/* ─── 記事アイコン（カテゴリ別SVG） ─── */
function ArticleIcon({ category }: { category: string }) {
  const color = "text-blue-300/60";
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
