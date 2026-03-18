"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { articles } from "../articles";
import ArticleThumbnail from "./article-thumbnail";

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

/* ═══════════════════════════════════════════════════════════════════════════
   読了プログレスバー（細い・控えめ）
   ═══════════════════════════════════════════════════════════════════════════ */

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 z-50 h-[2px] w-full bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   目次
   ═══════════════════════════════════════════════════════════════════════════ */

function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="目次">
      <p className="mb-3 text-[12px] font-bold text-gray-400 tracking-wider">目次</p>
      <ul className="space-y-0.5 border-l border-gray-200 text-[13px]">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block border-l-2 py-1.5 pl-4 -ml-px transition ${
                activeId === item.id
                  ? "border-blue-500 font-semibold text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SNSシェアボタン
   ═══════════════════════════════════════════════════════════════════════════ */

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const url = `https://l-ope.jp/lp/column/${slug}`;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <div className="flex items-center gap-3">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
        aria-label="Xでシェア"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      </a>
      <a
        href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-[#06C755] hover:bg-[#06C755] hover:text-white"
        aria-label="LINEでシェア"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 3.31 2.61 6.18 6.5 7.33-.09.35-.59 2.25-.61 2.39 0 0-.01.09.04.12.05.04.11.02.11.02.14-.02 1.68-1.1 2.38-1.62.51.08 1.04.12 1.58.12 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
      </a>
      <button
        onClick={copy}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-sky-500 hover:bg-sky-500 hover:text-white"
        aria-label="URLをコピー"
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   著者カード
   ═══════════════════════════════════════════════════════════════════════════ */

function AuthorCard() {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[14px] font-bold text-gray-500">
        L
      </div>
      <div>
        <p className="text-[13px] font-bold text-gray-900">Lオペ for CLINIC 編集部</p>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-400">
          クリニック経営とLINE公式アカウント活用に関する最新情報をお届けします。予約管理・患者対応・DX推進など、クリニックの業務効率化に役立つノウハウを発信中。
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   「この記事でわかること」ボックス
   ═══════════════════════════════════════════════════════════════════════════ */

function KeyPoints({ points }: { points: string[] }) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-5">
      <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800">
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-sky-500" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        この記事でわかること
      </p>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-gray-600">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
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
    <div className="my-10 overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-6 text-center ring-1 ring-blue-100">
      <p className="text-[14px] font-bold text-gray-800">クリニックのLINE活用、まずは無料で相談しませんか？</p>
      <p className="mt-1 text-[12px] text-gray-500">Lオペ for CLINICの機能・料金・導入事例をまとめた資料をお送りします。</p>
      <a
        href="/lp#contact"
        className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-[12px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg"
      >
        無料で資料請求
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   カテゴリラベル
   ═══════════════════════════════════════════════════════════════════════════ */

const categoryColors: Record<string, { bg: string; text: string }> = {
  活用事例: { bg: "bg-emerald-50", text: "text-emerald-700" },
  ツール比較: { bg: "bg-violet-50", text: "text-violet-700" },
  ガイド: { bg: "bg-sky-50", text: "text-sky-700" },
  業務改善: { bg: "bg-amber-50", text: "text-amber-700" },
  マーケティング: { bg: "bg-rose-50", text: "text-rose-700" },
  比較: { bg: "bg-violet-50", text: "text-violet-700" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   メインレイアウト
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ArticleLayout({ slug, breadcrumbLabel, keyPoints, toc, children }: ArticleLayoutProps) {
  const self = articles.find((a) => a.slug === slug)!;
  /* 関連記事: 同カテゴリ優先 → 残りから補完して4件 */
  const others = articles.filter((a) => a.slug !== slug);
  const sameCategory = others.filter((a) => a.category === self.category);
  const diffCategory = others.filter((a) => a.category !== self.category);
  const related = [...sameCategory, ...diffCategory].slice(0, 4);
  const articleRef = useRef<HTMLDivElement>(null);
  const cc = categoryColors[self.category] || { bg: "bg-gray-50", text: "text-gray-600" };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <ReadingProgress />

      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/lp" className="flex items-center gap-1 text-[14px] font-bold tracking-tight text-gray-900 hover:opacity-70 transition">
            Lオペ <span className="text-blue-600">for CLINIC</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/lp/column" className="text-[12px] text-gray-400 hover:text-gray-700 transition">
              コラム一覧
            </Link>
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
            <li><Link href="/lp/column" className="hover:text-blue-600 transition">コラム</Link></li>
            <li aria-hidden="true" className="text-gray-300">/</li>
            <li className="text-gray-700 font-medium">{breadcrumbLabel}</li>
          </ol>
        </nav>
      </div>

      {/* marchスタイル記事ヒーロー */}
      <div className="mx-auto max-w-4xl px-6 pt-6">
        <div className="overflow-hidden rounded-xl">
          <ArticleThumbnail slug={slug} title={self.title} category={self.category} size="hero" />
        </div>
        {/* メタ情報 */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">L</div>
              <span className="text-[12px] text-gray-500">Lオペ for CLINIC 編集部</span>
            </div>
            <time className="text-[12px] text-gray-400">{formatDate(self.date)}</time>
            <span className="text-[12px] text-gray-300">{self.readTime}</span>
          </div>
          <ShareButtons title={self.title} slug={slug} />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex gap-12">
          {/* 記事本文 */}
          <main className="min-w-0 max-w-3xl flex-1">
            {/* この記事でわかること */}
            {keyPoints.length > 0 && (
              <div className="mb-10">
                <KeyPoints points={keyPoints} />
              </div>
            )}

            {/* モバイル目次 */}
            <details className="mb-10 rounded-lg border border-gray-200 p-4 lg:hidden">
              <summary className="cursor-pointer text-[13px] font-bold text-gray-700">目次</summary>
              <div className="mt-3">
                <TableOfContents items={toc} />
              </div>
            </details>

            {/* 本文 */}
            <div ref={articleRef} className="prose-article space-y-8 text-[15px] leading-[1.9] text-gray-600">
              {children}
            </div>

            {/* シェア + 著者 */}
            <div className="mt-16 space-y-6">
              <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                <p className="text-[12px] font-bold text-gray-400">この記事をシェア</p>
                <ShareButtons title={self.title} slug={slug} />
              </div>
              <AuthorCard />
            </div>

            {/* CTA（明るいトーン） */}
            <div className="mt-10 overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-8 text-center ring-1 ring-blue-100">
              <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Lオペ for CLINIC</p>
              <h2 className="mt-2 text-[18px] font-bold text-gray-800">クリニックのLINE活用を始めませんか？</h2>
              <p className="mt-1 text-[13px] text-gray-500">予約・問診・配信・決済をオールインワンで。</p>
              <a
                href="/lp#contact"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg"
              >
                無料で資料請求
              </a>
            </div>

            {/* 関連記事 */}
            <div className="mt-12">
              <h2 className="text-[16px] font-bold text-gray-900">関連記事</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {related.map((a) => {
                  const rc = categoryColors[a.category] || { bg: "bg-gray-50", text: "text-gray-600" };
                  return (
                    <Link
                      key={a.slug}
                      href={`/lp/column/${a.slug}`}
                      className="group flex items-start gap-4 py-4 transition"
                    >
                      <div className="shrink-0 pt-1">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${rc.bg} ${rc.text}`}>
                          {a.category}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-gray-700 group-hover:text-blue-600 transition leading-relaxed">
                        {a.title}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </main>

          {/* サイドバー（デスクトップ） */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-8 space-y-8">
              <TableOfContents items={toc} />
              <div className="rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-[12px] font-bold text-gray-700">無料で資料請求</p>
                <p className="mt-1 text-[11px] text-gray-400">まずはお気軽にご相談ください</p>
                <a
                  href="/lp#contact"
                  className="mt-3 inline-block w-full rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 py-2.5 text-[11px] font-bold text-white transition hover:shadow-md hover:shadow-blue-500/20"
                >
                  お問い合わせ
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 text-center">
        <div className="flex items-center justify-center gap-6">
          <Link href="/lp/column" className="text-[12px] text-gray-400 hover:text-blue-600 transition">
            ← コラム一覧に戻る
          </Link>
          <Link href="/lp" className="text-[12px] text-gray-400 hover:text-blue-600 transition">
            Lオペ for CLINIC トップ
          </Link>
          <Link href="/lp/features" className="text-[12px] text-gray-400 hover:text-blue-600 transition">
            機能一覧
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── 日付フォーマット ─── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   記事内ビジュアルコンポーネント（エクスポート）
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── 成果ハイライト（Before → After カード） ─── */
export function ResultCard({ before, after, metric, description }: {
  before: string;
  after: string;
  metric: string;
  description?: string;
}) {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-stretch divide-x divide-slate-200">
        <div className="flex-1 bg-gray-50 p-4 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase">Before</p>
          <p className="mt-1 text-[22px] font-bold text-gray-400">{before}</p>
        </div>
        <div className="flex items-center px-3">
          <svg className="h-5 w-5 text-sky-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="flex-1 bg-sky-50 p-4 text-center">
          <p className="text-[11px] font-bold text-sky-600 uppercase">After</p>
          <p className="mt-1 text-[22px] font-bold text-sky-600">{after}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 px-4 py-2.5 text-center">
        <p className="text-[13px] font-bold text-gray-700">{metric}</p>
        {description && <p className="mt-0.5 text-[12px] text-gray-400">{description}</p>}
      </div>
    </div>
  );
}

/* ─── 数値グリッド（KPI表示） ─── */
export function StatGrid({ stats }: { stats: { value: string; unit?: string; label: string }[] }) {
  return (
    <div className={`my-6 grid gap-3 ${stats.length <= 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-[24px] font-bold tracking-tight text-gray-900">
            {s.value}<span className="text-[14px] text-gray-400">{s.unit || ""}</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── 横棒グラフ（比較表示） ─── */
export function BarChart({ data, unit }: { data: { label: string; value: number; color?: string }[]; unit?: string }) {
  const maxVal = Math.max(...data.map((d) => d.value));
  return (
    <div className="my-6 space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-right text-[12px] text-gray-600">{d.label}</span>
          <div className="flex-1">
            <div className="h-7 rounded-sm bg-gray-100">
              <div
                className={`h-full rounded-sm ${d.color || "bg-sky-500"} transition-all duration-500`}
                style={{ width: `${(d.value / maxVal) * 100}%` }}
              />
            </div>
          </div>
          <span className="w-16 text-[13px] font-bold text-gray-700">{d.value}{unit || ""}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── 比較テーブル ─── */
export function ComparisonTable({ headers, rows }: {
  headers: string[];
  rows: (string | boolean)[][];
}) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((h, i) => (
              <th key={i} className={`px-4 py-3 font-semibold text-gray-700 ${i === 0 ? "text-left" : "text-center"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50/50">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-3 ${ci === 0 ? "text-left text-gray-700" : "text-center"}`}>
                  {typeof cell === "boolean" ? (
                    cell ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    ) : <span className="text-gray-300">—</span>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── コールアウトボックス（注意・ポイント） ─── */
export function Callout({ type = "info", title, children }: {
  type?: "info" | "warning" | "success" | "point";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    info: { border: "border-sky-200", bg: "bg-sky-50/50", icon: "text-sky-500", titleColor: "text-sky-800" },
    warning: { border: "border-amber-200", bg: "bg-amber-50/50", icon: "text-amber-500", titleColor: "text-amber-800" },
    success: { border: "border-emerald-200", bg: "bg-emerald-50/50", icon: "text-emerald-500", titleColor: "text-emerald-800" },
    point: { border: "border-violet-200", bg: "bg-violet-50/50", icon: "text-violet-500", titleColor: "text-violet-800" },
  };
  const s = styles[type];
  const icons = {
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
    success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    point: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  };
  return (
    <div className={`my-6 rounded-lg border ${s.border} ${s.bg} p-5`}>
      <div className="flex items-start gap-3">
        <svg className={`h-5 w-5 shrink-0 ${s.icon}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d={icons[type]} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          {title && <p className={`text-[13px] font-bold ${s.titleColor}`}>{title}</p>}
          <div className="mt-1 text-[13px] leading-relaxed text-gray-600">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── フローステップ（番号付き） ─── */
export function FlowSteps({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <div className="my-6 space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-bold text-white">
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="h-full w-px bg-gray-200" />}
          </div>
          <div className="pb-6">
            <p className="text-[14px] font-bold text-gray-900">{s.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── 円グラフ風（SVGドーナツ） ─── */
export function DonutChart({ percentage, label, sublabel }: {
  percentage: number;
  label: string;
  sublabel?: string;
}) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="my-6 flex items-center justify-center gap-6">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40" fill="none" stroke="#0ea5e9" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold text-gray-900">{percentage}%</span>
        </div>
      </div>
      <div>
        <p className="text-[15px] font-bold text-gray-900">{label}</p>
        {sublabel && <p className="mt-0.5 text-[12px] text-gray-400">{sublabel}</p>}
      </div>
    </div>
  );
}
