"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "../articles";

/* カテゴリごとのグラデーション */
const categoryGradients: Record<string, string> = {
  "活用事例": "from-emerald-500 to-teal-400",
  "ツール比較": "from-violet-500 to-purple-400",
  "ガイド": "from-blue-500 to-cyan-400",
  "業務改善": "from-orange-500 to-amber-400",
  "マーケティング": "from-pink-500 to-rose-400",
  "比較": "from-violet-500 to-purple-400",
};

/* カテゴリアイコン */
const categoryIcons: Record<string, string> = {
  "活用事例": "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  "ツール比較": "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  "ガイド": "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  "業務改善": "M13 10V3L4 14h7v7l9-11h-7z",
  "マーケティング": "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z",
  "比較": "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
};

const allCategories = ["すべて", ...Array.from(new Set(articles.map((a) => a.category)))];

export default function ColumnIndex() {
  const [active, setActive] = useState("すべて");
  const filtered = active === "すべて" ? articles : articles.filter((a) => a.category === active);
  const featured = articles.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ヒーロー */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pb-16 pt-20">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="パンくずリスト">
            <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
              <li><a href="https://l-ope.jp" className="hover:text-white transition">ホーム</a></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/lp" className="hover:text-white transition">Lオペ for CLINIC</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white font-medium">コラム</li>
            </ol>
          </nav>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white md:text-4xl">コラム</h1>
          <p className="mt-3 text-[15px] text-slate-400">クリニックのLINE公式アカウント活用・DX推進に役立つ最新情報をお届けします。</p>
        </div>
      </div>

      {/* ピックアップ記事 */}
      <div className="mx-auto -mt-8 max-w-5xl px-5">
        <div className="grid gap-4 md:grid-cols-3">
          {featured.map((a, i) => {
            const g = categoryGradients[a.category] || "from-blue-500 to-cyan-400";
            return (
              <Link key={a.slug} href={`/lp/column/${a.slug}`} className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition hover:shadow-xl">
                <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${g} p-6`}>
                  <span className="text-4xl font-black text-white/20">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-semibold text-blue-600">{a.category}</span>
                  <h3 className="mt-1 text-[14px] font-bold leading-snug text-slate-800 group-hover:text-blue-600 transition line-clamp-2">{a.title}</h3>
                  <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">{a.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 py-12">
        {/* カテゴリフィルター */}
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                active === cat ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat}
              {cat !== "すべて" && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  {articles.filter((a) => a.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 記事グリッド */}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const g = categoryGradients[a.category] || "from-blue-500 to-cyan-400";
            const icon = categoryIcons[a.category] || categoryIcons["ガイド"];
            return (
              <Link key={a.slug} href={`/lp/column/${a.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${g}`}>
                  <svg className="h-10 w-10 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">{a.category}</span>
                    <span className="text-slate-400">{a.readTime}</span>
                  </div>
                  <h2 className="mt-2 text-[14px] font-bold leading-snug text-slate-800 group-hover:text-blue-600 transition line-clamp-2">{a.title}</h2>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400 line-clamp-2">{a.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
                    続きを読む
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-8 text-center text-white md:p-12">
          <h2 className="text-xl font-extrabold md:text-2xl">LINE公式アカウントでクリニック業務をDX化しませんか？</h2>
          <p className="mt-2 text-[13px] text-blue-100">Lオペ for CLINICなら、予約・問診・配信・決済・配送管理をオールインワンで。</p>
          <a href="/lp/contact" className="mt-5 inline-block rounded-xl bg-white px-8 py-3 text-[13px] font-bold text-blue-600 shadow-lg transition hover:shadow-xl">無料で資料請求</a>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-[12px] text-slate-400">
        <Link href="/lp" className="hover:text-blue-600">← Lオペ for CLINIC トップに戻る</Link>
      </footer>
    </div>
  );
}
