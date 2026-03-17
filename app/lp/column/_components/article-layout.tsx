"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { articles } from "../articles";

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
        className="h-full bg-sky-500 transition-[width] duration-150"
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
                  ? "border-sky-500 font-semibold text-gray-900"
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
    <div className="my-10 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
      <p className="text-[14px] font-bold text-gray-900">クリニックのLINE活用、まずは無料で相談しませんか？</p>
      <p className="mt-1 text-[12px] text-gray-400">Lオペ for CLINICの機能・料金・導入事例をまとめた資料をお送りします。</p>
      <a
        href="/lp#contact"
        className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-[12px] font-bold text-white transition hover:bg-gray-700"
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
  const related = articles.filter((a) => a.slug !== slug).slice(0, 4);
  const articleRef = useRef<HTMLDivElement>(null);
  const cc = categoryColors[self.category] || { bg: "bg-gray-50", text: "text-gray-600" };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <ReadingProgress />

      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/lp" className="text-[13px] font-bold text-gray-900 hover:opacity-70 transition">
            Lオペ for CLINIC
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/lp/column" className="text-[12px] text-gray-400 hover:text-gray-700 transition">
              コラム一覧
            </Link>
            <a
              href="/lp#contact"
              className="rounded-lg bg-gray-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-gray-700"
            >
              資料請求
            </a>
          </div>
        </div>
      </header>

      {/* パンくず */}
      <div className="border-b border-gray-50 bg-gray-50/50">
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-6 py-3">
          <ol className="flex items-center gap-2 text-[12px] text-gray-400 list-none m-0 p-0">
            <li><Link href="/lp" className="hover:text-gray-700 transition">トップ</Link></li>
            <li aria-hidden="true" className="text-gray-300">&gt;</li>
            <li><Link href="/lp/column" className="hover:text-gray-700 transition">コラム</Link></li>
            <li aria-hidden="true" className="text-gray-300">&gt;</li>
            <li className="text-gray-700 font-medium">{breadcrumbLabel}</li>
          </ol>
        </nav>
      </div>

      {/* 記事ヘッダー */}
      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${cc.bg} ${cc.text}`}>
              {self.category}
            </span>
            <time className="text-[12px] text-gray-400">{formatDate(self.date)}</time>
            <span className="text-[12px] text-gray-300">{self.readTime}</span>
          </div>
          <h1 className="mt-4 text-[24px] font-bold leading-snug tracking-tight text-gray-900 md:text-[28px]">
            {self.title}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{self.description}</p>

          {/* シェアボタン（ヘッダー内） */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">L</div>
              <span className="text-[12px] text-gray-400">Lオペ for CLINIC 編集部</span>
            </div>
            <ShareButtons title={self.title} slug={slug} />
          </div>
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

            {/* CTA */}
            <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Lオペ for CLINIC</p>
              <h2 className="mt-2 text-[18px] font-bold text-gray-900">クリニックのLINE活用を始めませんか？</h2>
              <p className="mt-1 text-[13px] text-gray-400">予約・問診・配信・決済をオールインワンで。</p>
              <a
                href="/lp#contact"
                className="mt-4 inline-block rounded-lg bg-gray-900 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-gray-700"
              >
                無料で資料請求
              </a>
            </div>

            {/* 関連記事 */}
            <div className="mt-12">
              <h2 className="text-[16px] font-bold text-gray-900">関連記事</h2>
              <div className="mt-4 divide-y divide-gray-100">
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
                      <p className="text-[13px] font-semibold text-gray-700 group-hover:text-sky-600 transition leading-relaxed">
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
                  className="mt-3 inline-block w-full rounded-lg bg-gray-900 py-2.5 text-[11px] font-bold text-white transition hover:bg-gray-700"
                >
                  お問い合わせ
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8 text-center">
        <Link href="/lp/column" className="text-[12px] text-gray-400 hover:text-gray-600 transition">
          ← コラム一覧に戻る
        </Link>
        <span className="mx-3 text-gray-200">|</span>
        <Link href="/lp" className="text-[12px] text-gray-400 hover:text-gray-600 transition">
          Lオペ for CLINIC トップ
        </Link>
      </footer>
    </div>
  );
}

/* ─── 日付フォーマット ─── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
