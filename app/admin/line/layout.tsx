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
  { href: "/admin/line/step-scenarios", label: "ステップ配信" },
  { href: "/admin/line/flex-builder", label: "Flexビルダー" },
  { href: "/admin/line/ab-test", label: "A/Bテスト" },
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
  { href: "/admin/line/keyword-replies", label: "自動応答" },
  { href: "/admin/line/messages", label: "送信履歴" },
  { href: "/admin/line/click-analytics", label: "クリック分析" },
  { href: "/admin/line/menu-rules", label: "メニュー自動切替" },
  { href: "/admin/line/column-settings", label: "表示設定" },
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
