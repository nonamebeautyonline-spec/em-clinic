"use client";

import React from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════════════
   記事サムネイル — EC向けコラム用
   ベージュ/シルバーのグラデーション背景 + カテゴリラベル + タイトル
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── カテゴリ色設定 ─── */
const catTheme: Record<string, { from: string; to: string; accent: string; label: string }> = {
  "EC×LINE活用入門":  { from: "from-amber-50",   to: "to-stone-100/60",  accent: "#b45309", label: "bg-amber-100 text-amber-700" },
  "カゴ落ち対策":      { from: "from-rose-50",    to: "to-pink-100/60",   accent: "#e11d48", label: "bg-rose-100 text-rose-700" },
  "配信・リピート促進": { from: "from-violet-50",  to: "to-indigo-100/60", accent: "#7c3aed", label: "bg-violet-100 text-violet-700" },
  "顧客管理・CRM":     { from: "from-stone-50",   to: "to-gray-100/60",   accent: "#57534e", label: "bg-stone-100 text-stone-700" },
  "発送管理・物流":     { from: "from-sky-50",     to: "to-cyan-100/60",   accent: "#0284c7", label: "bg-sky-100 text-sky-700" },
  "業態別活用事例":     { from: "from-orange-50",  to: "to-amber-100/60",  accent: "#f97316", label: "bg-orange-100 text-orange-700" },
  "分析・改善":         { from: "from-teal-50",    to: "to-emerald-100/60",accent: "#0d9488", label: "bg-teal-100 text-teal-700" },
  "成功事例・売上UP":   { from: "from-emerald-50", to: "to-green-100/60",  accent: "#10b981", label: "bg-emerald-100 text-emerald-700" },
};

/* ─── デフォルトテーマ ─── */
const defaultTheme = { from: "from-stone-50", to: "to-amber-100/60", accent: "#8B7355", label: "bg-stone-100 text-stone-700" };

/* ═══════════════════════════════════════════════════════════════════════════
   ショッピングカートアイコン
   ═══════════════════════════════════════════════════════════════════════════ */
function CartIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill={color}>
      <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   デフォルトSVGイラスト（EC用）
   ═══════════════════════════════════════════════════════════════════════════ */
function IllDefault() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="180" cy="20" r="10" fill="#fde68a" opacity="0.5" />
      <circle cx="15" cy="150" r="14" fill="#d6d3d1" opacity="0.4" />
      {/* ショッピングバッグ風 */}
      <rect x="55" y="35" width="70" height="90" rx="12" fill="white" stroke="#8B7355" strokeWidth="2.5" />
      <path d="M75 35V25a15 15 0 0130 0v10" fill="none" stroke="#8B7355" strokeWidth="2" />
      <rect x="70" y="65" width="40" height="5" rx="2.5" fill="#d6d3d1" />
      <rect x="70" y="77" width="30" height="5" rx="2.5" fill="#d6d3d1" opacity="0.7" />
      <rect x="70" y="89" width="35" height="5" rx="2.5" fill="#d6d3d1" opacity="0.5" />
      {/* 配送トラック */}
      <rect x="140" y="80" width="45" height="25" rx="5" fill="white" stroke="#B8A080" strokeWidth="1.5" />
      <rect x="148" y="87" width="30" height="4" rx="2" fill="#d6d3d1" />
      <rect x="148" y="95" width="20" height="4" rx="2" fill="#d6d3d1" opacity="0.6" />
      {/* チェック */}
      <circle cx="160" cy="130" r="14" fill="#fef3c7" opacity="0.8" />
      <path d="M153 130l4 4 8-8" stroke="#d97706" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
  size?: "card" | "hero" | "sm";
  hideTitle?: boolean;
}

export default function ArticleThumbnail({ slug, title, category, size = "card", hideTitle = false }: Props) {
  const theme = catTheme[category] || defaultTheme;
  const pngSrc = `/ec/column/thumbnails/${slug}.png`;

  const isHero = size === "hero";
  const isSm = size === "sm";

  return (
    <div className={`relative overflow-hidden bg-gray-100 aspect-[1200/630]`}>
      <Image
        src={pngSrc}
        alt={title}
        fill
        className="object-cover"
        sizes={isHero ? "100vw" : isSm ? "200px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        onError={(e) => {
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
            <CartIcon color={theme.accent} />
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
