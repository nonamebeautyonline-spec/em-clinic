"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import PatientLookupWidget from "@/components/admin/PatientLookupWidget";

// 認証不要のパス
const PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/setup"];

// スマホ用メニュー項目（必要な機能のみ）
const MOBILE_MENU_ITEMS = [
  { href: "/admin/accounting", icon: "💹", label: "売上管理" },
  { href: "/admin/reservations", icon: "📅", label: "予約リスト" },
  { href: "/admin/reorders", icon: "🔄", label: "再処方リスト" },
  { href: "/admin/schedule", icon: "🗓️", label: "予約管理" },
  { href: "/admin/doctor", icon: "🩺", label: "Drカルテ" },
  { href: "/admin/karte", icon: "📄", label: "カルテ一覧" },
  { href: "/admin/noname-master", icon: "📋", label: "決済マスター" },
  { href: "/admin/refunds", icon: "💸", label: "返金一覧" },
  { href: "/admin/shipping/pending", icon: "📦", label: "本日発送予定" },
  { href: "/admin/line/talk", icon: "💬", label: "LINE機能" },
  { href: "/admin/patient-data", icon: "🗑️", label: "予約・問診削除" },
  { href: "/admin/view-mypage", icon: "👁️", label: "顧客マイページ確認" },
  { href: "/admin/merge-patients", icon: "🔗", label: "患者統合" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    // 認証不要のパスはスキップ
    if (PUBLIC_PATHS.includes(pathname)) {
      setLoading(false);
      return;
    }

    // 認証済みなら再チェック不要（ページ遷移時のスピナー防止）
    if (isAuthenticated) return;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // セッションチェック失敗
      }

      // 認証失敗 → ログインへ
      router.push("/admin/login");
    };

    checkSession();
  }, [pathname, router, isAuthenticated]);

  // ページ遷移時の処理
  useEffect(() => {
    // パスが変わったらローディング表示
    if (prevPathnameRef.current !== pathname) {
      setIsPageTransitioning(true);
      setIsMobileMenuOpen(false);

      // 短時間でローディングを解除（コンテンツ更新の視覚的フィードバック）
      const timer = setTimeout(() => {
        setIsPageTransitioning(false);
      }, 150);

      prevPathnameRef.current = pathname;
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // サイドバーのスクロール位置を保存・復元
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem("admin-sidebar-scroll");
    if (savedScrollPos && sidebarNavRef.current) {
      sidebarNavRef.current.scrollTop = parseInt(savedScrollPos, 10);
    }
  }, []);

  const handleSidebarScroll = () => {
    if (sidebarNavRef.current) {
      sessionStorage.setItem("admin-sidebar-scroll", sidebarNavRef.current.scrollTop.toString());
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ログアウトエラーは無視
    }
    setIsAuthenticated(false);
    router.push("/admin/login");
  };

  // 認証不要のページ（ログイン、パスワードリセット等）
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // 認証チェック中またはリダイレクト中
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* モバイル用ハンバーガーボタン（トークページでは非表示：専用タブナビを使用） */}
      {pathname !== "/admin/line/talk" && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
          aria-label="メニューを開く"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* モバイル用オーバーレイメニュー */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* オーバーレイ背景 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* メニューパネル */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white flex flex-col">
            {/* ヘッダー */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h1 className="text-xl font-bold">管理画面</h1>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-slate-800 rounded"
                aria-label="メニューを閉じる"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* メニュー項目 */}
            <nav className="flex-1 overflow-y-auto py-4">
              {MOBILE_MENU_ITEMS.map((item) => (
                <MobileMenuItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href || pathname?.startsWith(item.href + "/")}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              ))}
            </nav>
            {/* ログアウト */}
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={handleLogout}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-2 text-sm"
              >
                <span>ログアウト</span>
                <span>🚪</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* PC用サイドバー */}
      <aside
        className={`hidden md:flex ${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-slate-900 text-white transition-all duration-300 flex-col h-screen sticky top-0`}
      >
        {/* ロゴ・トグル */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {isSidebarOpen ? (
            <>
              <h1 className="text-xl font-bold">管理画面</h1>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-slate-800 rounded"
              >
                ◀
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded mx-auto"
            >
              ▶
            </button>
          )}
        </div>

        {/* ナビゲーションメニュー */}
        <nav ref={sidebarNavRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto py-4">
          <MenuItem
            href="/admin"
            icon="📊"
            label="ダッシュボード"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin"}
          />
          <MenuItem
            href="/admin/accounting"
            icon="💹"
            label="売上管理"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/accounting"}
          />

          <MenuItem
            href="/admin/line/talk"
            icon="💬"
            label="LINE機能"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/line")}
          />

          <MenuSection label="予約・診察" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/reservations"
            icon="📅"
            label="予約リスト"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/reservations"}
          />
          <MenuItem
            href="/admin/reorders"
            icon="🔄"
            label="再処方リスト"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/reorders"}
          />
          <MenuItem
            href="/admin/schedule"
            icon="🗓️"
            label="予約管理"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/schedule")}
          />
          <MenuItem
            href="/admin/doctor"
            icon="🩺"
            label="Drカルテ"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/doctor"}
          />
          <MenuItem
            href="/admin/karte"
            icon="📄"
            label="カルテ一覧"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/karte"}
          />
          <MenuItem
            href="/admin/kartesearch"
            icon="🔍"
            label="カルテ検索"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/kartesearch"}
          />

          <MenuSection label="決済管理" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/noname-master/square"
            icon="💳"
            label="カード決済"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/noname-master/square"}
          />
          <MenuItem
            href="/admin/noname-master/bank-transfer"
            icon="🏦"
            label="銀行振込"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/noname-master/bank-transfer"}
          />
          <MenuItem
            href="/admin/bank-transfer/reconcile"
            icon="🔍"
            label="銀行振込照合"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/bank-transfer/reconcile"}
          />
          <MenuItem
            href="/admin/noname-master"
            icon="📋"
            label="決済マスター"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/noname-master"}
          />
          <MenuItem
            href="/admin/refunds"
            icon="💸"
            label="返金一覧"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/refunds"}
          />

          <MenuSection label="発送管理" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/shipping/pending"
            icon="📦"
            label="本日発送予定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/shipping/pending"}
          />
          <MenuItem
            href="/admin/shipping/tracking"
            icon="🏷️"
            label="追跡番号付与"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/shipping/tracking"}
          />

          <MenuSection label="患者管理" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/patient-data"
            icon="🗑️"
            label="予約・問診削除"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/patient-data"}
          />
          <MenuItem
            href="/admin/view-mypage"
            icon="👁️"
            label="顧客マイページ確認"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/view-mypage"}
          />
          <MenuItem
            href="/admin/merge-patients"
            icon="🔗"
            label="患者統合"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/merge-patients"}
          />

          <MenuSection label="業務管理" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/bank-transfer"
            icon="💰"
            label="銀行振込管理"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/bank-transfer"}
          />

          <MenuSection label="システム" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/accounts"
            icon="⚙️"
            label="アカウント設定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/accounts"}
          />
        </nav>

        {/* ログアウト */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-2 text-sm"
          >
            {isSidebarOpen && <span>ログアウト</span>}
            <span>🚪</span>
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className={`flex-1 min-h-0 relative ${pathname === "/admin/line/talk" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {/* ページ遷移時のローディングオーバーレイ */}
        {isPageTransitioning && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-600">読み込み中...</span>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* 患者検索ウィジェット */}
      <PatientLookupWidget />
    </div>
  );
}

interface MenuItemProps {
  href: string;
  icon: string;
  label: string;
  isOpen: boolean;
  isActive: boolean;
}

function MenuItem({ href, icon, label, isOpen, isActive }: MenuItemProps) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`w-full px-4 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
        isActive ? "bg-slate-800 border-l-4 border-blue-500" : ""
      }`}
    >
      <span className="text-base">{icon}</span>
      {isOpen && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}

interface MobileMenuItemProps {
  href: string;
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function MobileMenuItem({ href, icon, label, isActive, onClick }: MobileMenuItemProps) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors ${
        isActive ? "bg-slate-800 border-l-4 border-blue-500" : ""
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

interface MenuSectionProps {
  label: string;
  isOpen: boolean;
}

function MenuSection({ label, isOpen }: MenuSectionProps) {
  if (!isOpen) return null;

  return (
    <div className="px-4 py-2 mt-4 mb-2">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</h2>
    </div>
  );
}
