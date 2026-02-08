"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 1行目: メイン機能
const MAIN_TABS = [
  { href: "/admin/line", label: "トップ" },
  { href: "/admin/line/friends", label: "友達一覧" },
  { href: "/admin/line/talk", label: "個別トーク" },
  { href: "/admin/line/send", label: "一斉送信" },
  { href: "/admin/line/templates", label: "テンプレート" },
  { href: "/admin/line/forms", label: "回答フォーム" },
];

// 2行目: 設定・管理系
const SUB_TABS = [
  { href: "/admin/line/actions", label: "アクション管理" },
  { href: "/admin/line/tags", label: "タグ管理" },
  { href: "/admin/line/marks", label: "対応マーク" },
  { href: "/admin/line/media", label: "メディア一覧" },
  { href: "/admin/line/rich-menus", label: "リッチメニュー設定" },
  { href: "/admin/line/friend-settings", label: "友達追加時設定" },
  { href: "/admin/line/friends/fields", label: "情報欄設定" },
  { href: "/admin/line/messages", label: "送信履歴" },
];

export default function LineLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // /admin/line と /admin/line/friends は exact match（サブパスと区別するため）
    if (href === "/admin/line" || href === "/admin/line/friends") return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const renderTab = (tab: { href: string; label: string }, size: "main" | "sub" = "main") => {
    const active = isActive(tab.href);
    const textSize = size === "main" ? "text-sm" : "text-[12px]";
    return (
      <Link
        key={tab.href}
        href={tab.href}
        scroll={false}
        className={`relative px-3 py-1.5 ${textSize} font-medium whitespace-nowrap transition-colors ${
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
  };

  return (
    <div className="flex flex-col h-full">
      {/* LINE機能 タブナビゲーション（モバイルでは非表示） */}
      <div className="hidden md:block flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 pl-5 pr-3 py-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#06C755] to-[#05a648] flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="font-bold text-gray-800 text-sm">LINE機能</span>
        </div>
        {/* 1行目: メイン機能 */}
        <div className="flex items-center px-2">
          {MAIN_TABS.map(t => renderTab(t, "main"))}
        </div>
        {/* 2行目: 設定・管理系 */}
        <div className="flex items-center px-2 pb-1 border-t border-gray-50">
          {SUB_TABS.map(t => renderTab(t, "sub"))}
        </div>
      </div>
      {/* コンテンツ */}
      <div className={`flex-1 min-h-0 ${pathname === "/admin/line/talk" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
      </div>
    </div>
  );
}
