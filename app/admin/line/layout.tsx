"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";

// 1行目: メイン機能
const MAIN_TABS = [
  { href: "/admin/line", label: "トップ" },
  { href: "/admin/line/friends", label: "友達一覧" },
  { href: "/admin/line/talk", label: "個別トーク" },
  { href: "/admin/line/send", label: "一斉送信" },
  { href: "/admin/line/templates", label: "テンプレート" },
  { href: "/admin/line/forms", label: "回答フォーム" },
  { href: "/admin/line/step-scenarios", label: "ステップ配信" },
  { href: "/admin/line/lifecycle-events", label: "固定イベント設定" },
  { href: "/admin/line/keyword-replies", label: "自動応答" },
  { href: "/admin/line/ai-reply-settings", label: "AI返信" },
  { href: "/admin/line/reminder-rules", label: "リマインド" },
  { href: "/admin/line/tags", label: "タグ管理" },
  { href: "/admin/line/actions", label: "アクション管理" },
];

// 2行目: 設定・管理系
const SUB_TABS = [
  { href: "/admin/line/marks", label: "対応マーク" },
  { href: "/admin/line/friends/fields", label: "情報欄" },
  { href: "/admin/line/media", label: "メディア" },
  { href: "/admin/line/rich-menus", label: "リッチメニュー" },
  { href: "/admin/line/friend-settings", label: "友達追加時設定" },
  { href: "/admin/line/chatbot", label: "チャットボット" },
  { href: "/admin/line/flow-builder", label: "フロービルダー" },
  { href: "/admin/line/ab-test", label: "A/Bテスト" },
  { href: "/admin/line/coupons", label: "クーポン" },
  { href: "/admin/line/click-analytics", label: "クリック分析" },
  { href: "/admin/line/analytics", label: "配信効果分析" },
  { href: "/admin/line/nps", label: "NPS" },
  { href: "/admin/line/messages", label: "送信履歴" },
  { href: "/admin/line/column-settings", label: "表示設定" },
];

function ScrollableTabRow({
  tabs,
  size,
  isActive,
  className,
}: {
  tabs: { href: string; label: string }[];
  size: "main" | "sub";
  isActive: (href: string) => boolean;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const textSize = size === "main" ? "text-[12px]" : "text-[11px]";

  return (
    <div className={`relative ${className || ""}`}>
      {/* 左フェード＋矢印 */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1 pr-3 bg-gradient-to-r from-white via-white/90 to-transparent"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {/* タブスクロール領域 */}
      <div
        ref={scrollRef}
        className="flex items-center px-2 overflow-x-auto [&::-webkit-scrollbar]:h-0"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              scroll={false}
              className={`relative px-2.5 py-1.5 ${textSize} font-medium whitespace-nowrap transition-colors ${
                active
                  ? "text-[#06C755]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] bg-[#06C755] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
      {/* 右フェード＋矢印 */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1 pl-3 bg-gradient-to-l from-white via-white/90 to-transparent"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function LineLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 流入経路はLINE機能とは独立したページ — タブナビを表示しない
  if (pathname === "/admin/line/tracking-sources") {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === "/admin/line" || href === "/admin/line/friends") return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <div className="flex flex-col h-full">
      {/* LINE機能 タブナビゲーション（モバイルでは非表示） */}
      <div className="hidden md:block flex-shrink-0 bg-white border-b border-gray-200">
        <ScrollableTabRow tabs={MAIN_TABS} size="main" isActive={isActive} />
        <ScrollableTabRow tabs={SUB_TABS} size="sub" isActive={isActive} className="pb-1 border-t border-gray-50" />
      </div>
      {/* コンテンツ */}
      <div className={`flex-1 min-h-0 ${pathname === "/admin/line/talk" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
      </div>
    </div>
  );
}
