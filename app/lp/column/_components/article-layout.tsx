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
   読了プログレスバー
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
    <div className="fixed top-0 left-0 z-50 h-[3px] w-full bg-slate-100">
      <div className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-[width] duration-150" style={{ width: `${progress}%` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   目次（デスクトップ: サイドバー固定 / モバイル: 記事冒頭）
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
    <nav aria-label="目次" className="space-y-1 text-[13px]">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">目次</p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block rounded-md px-3 py-1.5 transition ${
            activeId === item.id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          {item.label}
        </a>
      ))}
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
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-slate-400">SHARE</span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-800 hover:text-white"
        aria-label="Xでシェア"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      </a>
      <a
        href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-[#06C755] hover:text-white"
        aria-label="LINEでシェア"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 3.31 2.61 6.18 6.5 7.33-.09.35-.59 2.25-.61 2.39 0 0-.01.09.04.12.05.04.11.02.11.02.14-.02 1.68-1.1 2.38-1.62.51.08 1.04.12 1.58.12 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
      </a>
      <button
        onClick={copy}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-blue-600 hover:text-white"
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
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-bold text-white">L</div>
      <div>
        <p className="text-[13px] font-bold text-slate-800">Lオペ for CLINIC 編集部</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
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
    <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-6">
      <p className="flex items-center gap-2 text-[13px] font-bold text-blue-800">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-blue-600"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
        この記事でわかること
      </p>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[13px] text-slate-700">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
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
    <div className="my-10 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-6 text-center">
      <p className="text-[14px] font-bold text-slate-800">クリニックのLINE活用、まずは無料で相談しませんか？</p>
      <p className="mt-1 text-[12px] text-slate-500">Lオペ for CLINICの機能・料金・導入事例をまとめた資料をお送りします。</p>
      <a href="/lp/contact" className="mt-3 inline-block rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">
        無料で資料請求
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   メインレイアウト
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ArticleLayout({ slug, breadcrumbLabel, keyPoints, toc, children }: ArticleLayoutProps) {
  const self = articles.find((a) => a.slug === slug)!;
  const related = articles.filter((a) => a.slug !== slug).slice(0, 4);
  const articleRef = useRef<HTMLDivElement>(null);

  /* カテゴリごとのグラデーション色 */
  const categoryGradients: Record<string, string> = {
    "活用事例": "from-emerald-500 to-teal-400",
    "ツール比較": "from-violet-500 to-purple-400",
    "ガイド": "from-blue-500 to-cyan-400",
    "業務改善": "from-orange-500 to-amber-400",
    "マーケティング": "from-pink-500 to-rose-400",
    "比較": "from-violet-500 to-purple-400",
  };
  const gradient = categoryGradients[self.category] || "from-blue-500 to-cyan-400";

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <ReadingProgress />

      {/* ヒーロー */}
      <div className={`bg-gradient-to-br ${gradient} px-5 pb-12 pt-20`}>
        <div className="mx-auto max-w-3xl">
          <nav aria-label="パンくずリスト">
            <ol className="flex items-center gap-1.5 text-[11px] text-white/70 list-none m-0 p-0">
              <li><a href="https://l-ope.jp" className="hover:text-white transition">ホーム</a></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/lp" className="hover:text-white transition">Lオペ for CLINIC</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/lp/column" className="hover:text-white transition">コラム</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white font-medium">{breadcrumbLabel}</li>
            </ol>
          </nav>

          <div className="mt-6 flex items-center gap-3 text-[11px]">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold text-white">{self.category}</span>
            <time className="text-white/70">{self.date}</time>
            <span className="text-white/70">{self.readTime}</span>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight text-white md:text-3xl">{self.title}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">{self.description}</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex gap-12">
          {/* 記事本文 */}
          <main className="min-w-0 flex-1">
            {/* この記事でわかること */}
            {keyPoints.length > 0 && (
              <div className="mb-10">
                <KeyPoints points={keyPoints} />
              </div>
            )}

            {/* モバイル目次 */}
            <details className="mb-10 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:hidden">
              <summary className="cursor-pointer text-[13px] font-bold text-slate-700">目次を表示</summary>
              <div className="mt-3">
                <TableOfContents items={toc} />
              </div>
            </details>

            {/* 本文 */}
            <div ref={articleRef} className="prose-article space-y-10 text-[15px] leading-[1.9] text-slate-600">
              {children}
            </div>

            {/* シェア + 著者 */}
            <div className="mt-16 space-y-8">
              <div className="flex items-center justify-between border-t border-slate-100 pt-8">
                <p className="text-[13px] font-bold text-slate-700">この記事をシェア</p>
                <ShareButtons title={self.title} slug={slug} />
              </div>
              <AuthorCard />
            </div>

            {/* CTA */}
            <div className="mt-12 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-8 text-center text-white">
              <h2 className="text-xl font-extrabold">クリニックのLINE活用を始めませんか？</h2>
              <p className="mt-2 text-[13px] text-blue-100">Lオペ for CLINICなら、予約・問診・配信・決済をオールインワンで。</p>
              <a href="/lp/contact" className="mt-4 inline-block rounded-xl bg-white px-8 py-3 text-[13px] font-bold text-blue-600 shadow-lg transition hover:shadow-xl">無料で資料請求</a>
            </div>

            {/* 関連記事 */}
            <div className="mt-12">
              <h2 className="text-lg font-bold text-slate-800">関連記事</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {related.map((a) => {
                  const g = categoryGradients[a.category] || "from-blue-500 to-cyan-400";
                  return (
                    <Link key={a.slug} href={`/lp/column/${a.slug}`} className="group overflow-hidden rounded-xl border border-slate-100 transition hover:border-blue-200 hover:shadow-md">
                      <div className={`h-2 bg-gradient-to-r ${g}`} />
                      <div className="p-4">
                        <span className="text-[10px] font-semibold text-blue-600">{a.category}</span>
                        <p className="mt-1 text-[13px] font-semibold text-slate-700 group-hover:text-blue-600 transition">{a.title}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </main>

          {/* サイドバー（デスクトップ） */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-16 space-y-8">
              <TableOfContents items={toc} />
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-[12px] font-bold text-slate-700">無料で資料請求</p>
                <a href="/lp/contact" className="mt-2 inline-block w-full rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 py-2 text-[11px] font-bold text-white transition hover:shadow-md">
                  お問い合わせ
                </a>
              </div>
              <ShareButtons title={self.title} slug={slug} />
            </div>
          </aside>
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-slate-100 py-8 text-center text-[12px] text-slate-400">
        <Link href="/lp/column" className="hover:text-blue-600">← コラム一覧に戻る</Link>
        <span className="mx-3">|</span>
        <Link href="/lp" className="hover:text-blue-600">Lオペ for CLINIC トップ</Link>
      </footer>
    </div>
  );
}
