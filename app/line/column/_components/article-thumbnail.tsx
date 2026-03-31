"use client";

import React from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════════════
   記事サムネイル — LINE汎用コラム用
   淡いグラデーション背景 + カテゴリラベル + タイトル
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── 記事ごとのサムネイル設定（後で追加） ─── */
const thumbMeta: Record<string, { subtitle: string; ill: string }> = {};

/* ─── カテゴリ色設定 ─── */
const catTheme: Record<string, { from: string; to: string; accent: string; label: string }> = {
  "LINE公式アカウント入門": { from: "from-blue-50",    to: "to-sky-100/60",    accent: "#2563eb", label: "bg-blue-100 text-blue-700" },
  "ツール比較・選定":       { from: "from-violet-50",  to: "to-indigo-100/60", accent: "#7c3aed", label: "bg-violet-100 text-violet-700" },
  "配信・メッセージング":   { from: "from-rose-50",    to: "to-pink-100/60",   accent: "#e11d48", label: "bg-rose-100 text-rose-700" },
  "リッチメニュー・UI設計": { from: "from-cyan-50",    to: "to-teal-100/60",   accent: "#0891b2", label: "bg-cyan-100 text-cyan-700" },
  "自動化・効率化":         { from: "from-teal-50",    to: "to-emerald-100/60",accent: "#0d9488", label: "bg-teal-100 text-teal-700" },
  "業種別活用事例":         { from: "from-orange-50",  to: "to-amber-100/60",  accent: "#f97316", label: "bg-orange-100 text-orange-700" },
  "分析・改善":             { from: "from-amber-50",   to: "to-yellow-100/60", accent: "#f59e0b", label: "bg-amber-100 text-amber-700" },
  "成功事例・ノウハウ":     { from: "from-emerald-50", to: "to-green-100/60",  accent: "#10b981", label: "bg-emerald-100 text-emerald-700" },
};

/* ─── デフォルトテーマ ─── */
const defaultTheme = { from: "from-sky-50", to: "to-cyan-100/60", accent: "#0284c7", label: "bg-sky-100 text-sky-700" };

/* ═══════════════════════════════════════════════════════════════════════════
   メガホンアイコン
   ═══════════════════════════════════════════════════════════════════════════ */
function MegaphoneIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill={color}>
      <path d="M13.5 3.5c.3-.2.7-.1.9.2.5.9 1.1 3 1.1 6.3s-.6 5.4-1.1 6.3c-.2.3-.6.4-.9.2L8 13H5.5A2.5 2.5 0 013 10.5v-1A2.5 2.5 0 015.5 7H8l5.5-3.5zM15 7a1 1 0 011 1v4a1 1 0 01-2 0V8a1 1 0 011-1z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   デフォルトSVGイラスト（汎用LINE用）
   ═══════════════════════════════════════════════════════════════════════════ */
function IllDefault() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="180" cy="20" r="10" fill="#dbeafe" opacity="0.5" />
      <circle cx="15" cy="150" r="14" fill="#c7d2fe" opacity="0.4" />
      {/* LINEアイコン風 */}
      <rect x="50" y="25" width="80" height="100" rx="16" fill="white" stroke="#06C755" strokeWidth="2.5" />
      <path d="M70 55c0-8 20-8 20 0v5c0 8-20 8-20 0z" fill="#06C755" opacity="0.3" />
      <rect x="65" y="70" width="50" height="5" rx="2.5" fill="#bfdbfe" />
      <rect x="65" y="82" width="40" height="5" rx="2.5" fill="#bfdbfe" opacity="0.7" />
      <rect x="65" y="94" width="45" height="5" rx="2.5" fill="#bfdbfe" opacity="0.5" />
      {/* 吹き出し */}
      <rect x="140" y="40" width="45" height="28" rx="8" fill="white" stroke="#60a5fa" strokeWidth="1.5" />
      <rect x="148" y="48" width="30" height="4" rx="2" fill="#bfdbfe" />
      <rect x="148" y="56" width="20" height="4" rx="2" fill="#bfdbfe" opacity="0.6" />
      {/* チェック */}
      <circle cx="160" cy="120" r="14" fill="#dcfce7" opacity="0.8" />
      <path d="M153 120l4 4 8-8" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   メインコンポーネント: ArticleThumbnail
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  slug: string;
  title: string;
  category: string;
  /** "card" = 一覧カード / "hero" = 記事ページヒーロー / "sm" = 関連記事サムネイル */
  size?: "card" | "hero" | "sm";
  /** タイトル非表示（カード下部にタイトルがある場合） */
  hideTitle?: boolean;
}

export default function ArticleThumbnail({ slug, title, category, size = "card", hideTitle = false }: Props) {
  const meta = thumbMeta[slug] || { subtitle: "", ill: "default" };
  const theme = catTheme[category] || defaultTheme;
  const pngSrc = `/line/column/thumbnails/${slug}.png`;

  const isHero = size === "hero";
  const isSm = size === "sm";

  /* PNG画像がある場合: 全サイズで生成サムネイルを使用 */
  return (
    <div className={`relative overflow-hidden bg-gray-100 aspect-[1200/630]`}>
      <Image
        src={pngSrc}
        alt={title}
        fill
        className="object-cover"
        sizes={isHero ? "100vw" : isSm ? "200px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        onError={(e) => {
          /* PNG未生成時: 非表示にして旧デザインにフォールバック */
          (e.currentTarget as HTMLImageElement).style.display = "none";
          const fallback = e.currentTarget.parentElement?.querySelector("[data-fallback]");
          if (fallback) (fallback as HTMLElement).style.display = "block";
        }}
      />
      {/* フォールバック: SVGデザイン（PNG読み込み失敗時のみ表示） */}
      <div data-fallback style={{ display: "none" }} className="absolute inset-0">
        <ArticleThumbnailFallback
          slug={slug} title={title} category={category}
          size={size} hideTitle={hideTitle}
          theme={theme}
        />
      </div>
    </div>
  );
}

/* SVGデザイン（フォールバック用） */
function ArticleThumbnailFallback({ title, category, size, hideTitle, theme }: {
  slug: string; title: string; category: string;
  size?: "card" | "hero" | "sm"; hideTitle?: boolean;
  theme: { from: string; to: string; accent: string; label: string };
}) {
  const isHero = size === "hero";
  const isSm = size === "sm";

  if (isSm) {
    return (
      <div className={`h-full bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center`}>
        <div className="h-[50px] w-[65px]"><IllDefault /></div>
      </div>
    );
  }

  return (
    <div className={`h-full bg-gradient-to-br ${theme.from} ${theme.to} ${isHero ? "px-8 py-10 md:px-14 md:py-14" : "px-5 py-5"}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
        <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-white/15" />
      </div>
      <div className={`relative z-10 flex items-center ${isHero ? "gap-8" : "gap-4"}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <MegaphoneIcon color={theme.accent} />
            <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${theme.label}`}>{category}</span>
          </div>
          {!hideTitle && (
            <h3 className="mt-2 font-extrabold leading-snug tracking-tight text-gray-800 text-[14px] md:text-[16px] line-clamp-3">{title}</h3>
          )}
        </div>
        <div className={`shrink-0 ${isHero ? "hidden h-[180px] w-[240px] md:block" : "h-[100px] w-[130px] hidden sm:block"}`}>
          <IllDefault />
        </div>
      </div>
    </div>
  );
}
