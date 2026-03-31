"use client";

import React from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════════════
   記事サムネイル — サロンコラム用
   淡いグラデーション背景 + カテゴリラベル + タイトル
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── カテゴリ色設定 ─── */
const catTheme: Record<string, { from: string; to: string; accent: string; label: string }> = {
  "サロンLINE活用入門":         { from: "from-blue-50",    to: "to-sky-100/60",    accent: "#2563eb", label: "bg-blue-100 text-blue-700" },
  "予約管理・ホットペッパー連携": { from: "from-pink-50",    to: "to-rose-100/60",   accent: "#ec4899", label: "bg-pink-100 text-pink-700" },
  "配信・リピート促進":         { from: "from-rose-50",    to: "to-pink-100/60",   accent: "#e11d48", label: "bg-rose-100 text-rose-700" },
  "リッチメニュー・UI設計":     { from: "from-cyan-50",    to: "to-teal-100/60",   accent: "#0891b2", label: "bg-cyan-100 text-cyan-700" },
  "顧客管理・CRM":              { from: "from-violet-50",  to: "to-indigo-100/60", accent: "#7c3aed", label: "bg-violet-100 text-violet-700" },
  "業態別活用事例":             { from: "from-orange-50",  to: "to-amber-100/60",  accent: "#f97316", label: "bg-orange-100 text-orange-700" },
  "分析・改善":                 { from: "from-amber-50",   to: "to-yellow-100/60", accent: "#f59e0b", label: "bg-amber-100 text-amber-700" },
  "成功事例・売上UP":           { from: "from-emerald-50", to: "to-green-100/60",  accent: "#10b981", label: "bg-emerald-100 text-emerald-700" },
};

/* ─── デフォルトテーマ ─── */
const defaultTheme = { from: "from-pink-50", to: "to-rose-100/60", accent: "#ec4899", label: "bg-pink-100 text-pink-700" };

/* ═══════════════════════════════════════════════════════════════════════════
   サロンアイコン
   ═══════════════════════════════════════════════════════════════════════════ */
function SalonIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill={color}>
      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   デフォルトSVGイラスト（サロン用）
   ═══════════════════════════════════════════════════════════════════════════ */
function IllDefault() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="180" cy="20" r="10" fill="#fce7f3" opacity="0.5" />
      <circle cx="15" cy="150" r="14" fill="#fecdd3" opacity="0.4" />
      {/* サロン風アイコン */}
      <rect x="50" y="25" width="80" height="100" rx="16" fill="white" stroke="#ec4899" strokeWidth="2.5" />
      <path d="M70 55c0-8 20-8 20 0v5c0 8-20 8-20 0z" fill="#ec4899" opacity="0.3" />
      <rect x="65" y="70" width="50" height="5" rx="2.5" fill="#fecdd3" />
      <rect x="65" y="82" width="40" height="5" rx="2.5" fill="#fecdd3" opacity="0.7" />
      <rect x="65" y="94" width="45" height="5" rx="2.5" fill="#fecdd3" opacity="0.5" />
      {/* スタンプカード風 */}
      <rect x="140" y="40" width="45" height="28" rx="8" fill="white" stroke="#f472b6" strokeWidth="1.5" />
      <circle cx="152" cy="54" r="4" fill="#fecdd3" />
      <circle cx="163" cy="54" r="4" fill="#fecdd3" />
      <circle cx="174" cy="54" r="4" fill="#fecdd3" opacity="0.4" />
      {/* チェック */}
      <circle cx="160" cy="120" r="14" fill="#fce7f3" opacity="0.8" />
      <path d="M153 120l4 4 8-8" stroke="#ec4899" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
  const pngSrc = `/salon/column/thumbnails/${slug}.png`;

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
            <SalonIcon color={theme.accent} />
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
