"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PatientLookupWidget from "@/components/admin/PatientLookupWidget";
import { FeaturesProvider, useFeatures } from "@/lib/hooks/use-features";
import type { Feature } from "@/lib/feature-flags";

// 認証不要のパス
const PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/setup"];

// ロゴコンポーネント
function LogoMark({ compact }: { compact?: boolean }) {
  const gradientClass = "bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent";
  if (compact) {
    return (
      <Image src="/images/l-ope-logo.png" alt="Lオペ" width={36} height={36} className="object-contain" />
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0 overflow-hidden ml-1">
      <Image src="/images/l-ope-logo.png" alt="Lオペ" width={32} height={32} className="shrink-0 object-contain" />
      <span className={`text-xl font-bold whitespace-nowrap ${gradientClass}`}>Lオペ <span className="text-sm font-semibold tracking-widest uppercase">for CLINIC</span></span>
    </div>
  );
}

// スマホ用メニュー項目（必要な機能のみ）
const MOBILE_MENU_ITEMS: { href: string; icon: string; label: string; feature?: Feature }[] = [
  { href: "/admin/accounting", icon: "💹", label: "売上管理" },
  { href: "/admin/line/talk", icon: "💬", label: "LINE機能" },
  { href: "/admin/reservations", icon: "📅", label: "予約リスト" },
  { href: "/admin/reorders", icon: "🔄", label: "再処方リスト", feature: "reorder" },
  { href: "/admin/schedule", icon: "🗓️", label: "予約管理" },
  { href: "/admin/doctor", icon: "🩺", label: "簡易Drカルテ" },
  { href: "/admin/karte", icon: "📋", label: "カルテ" },
  { href: "/admin/noname-master", icon: "📋", label: "決済マスター" },
  { href: "/admin/refunds", icon: "💸", label: "返金一覧" },
  { href: "/admin/shipping/pending", icon: "📦", label: "本日発送予定" },
  { href: "/admin/inventory", icon: "📦", label: "在庫" },
  { href: "/admin/intake-form", icon: "📝", label: "問診設定", feature: "form_builder" },
  { href: "/admin/patient-data", icon: "🗑️", label: "予約・問診削除" },
  { href: "/admin/view-mypage", icon: "👁️", label: "顧客マイページ確認" },
  { href: "/admin/merge-patients", icon: "🔗", label: "患者情報変更・統合" },
  { href: "/admin/dedup-patients", icon: "🔍", label: "患者名寄せ" },
  { href: "/admin/products", icon: "💊", label: "商品管理" },
  { href: "/admin/settings", icon: "⚙️", label: "設定" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [platformRole, setPlatformRole] = useState<string>("tenant_admin");
  const [tenantRole, setTenantRole] = useState<string>("admin");
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef(pathname);

  // 未読カウント取得
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/unread-count", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* 無視 */ }
  }, []);

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
            // CSRFトークン初期化 + fetch自動付与（管理画面用）
            fetch("/api/csrf-token", { credentials: "include" })
              .then((r) => r.ok ? r.json() : null)
              .then((d) => {
                if (!d?.csrfToken) return;
                // 二重登録防止
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((window as any).__csrfPatched) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).__csrfPatched = true;
                // 全fetchにCSRFヘッダーを自動付与
                const origFetch = window.fetch;
                window.fetch = function (input, init) {
                  const method = (init?.method || "GET").toUpperCase();
                  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
                    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
                    // 同一オリジンのAPIリクエストのみ
                    if (url.startsWith("/api/") || url.startsWith(location.origin + "/api/")) {
                      // Cookieからトークン読み取り
                      const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
                      if (match) {
                        const headers = new Headers(init?.headers);
                        if (!headers.has("x-csrf-token")) {
                          headers.set("x-csrf-token", match[1]);
                        }
                        init = { ...init, headers };
                      }
                    }
                  }
                  return origFetch.call(this, input, init);
                };
              })
              .catch(() => {});
            setPlatformRole(data.user?.platformRole || "tenant_admin");
            setTenantRole(data.user?.tenantRole || "admin");
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

  // 未読カウントのポーリング（30秒間隔）
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

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
    <FeaturesProvider>
    <div className="h-dvh bg-slate-50 flex overflow-hidden">
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
              <LogoMark />
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
            {tenantRole === "viewer" && (
              <div className="mx-3 mt-3 px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-center">
                <span className="text-amber-300 text-xs font-semibold">閲覧専用モード</span>
              </div>
            )}
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
                  badge={item.href === "/admin/line/talk" ? unreadCount : undefined}
                  feature={item.feature}
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
              <LogoMark />
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
              <LogoMark compact />
            </button>
          )}
        </div>

        {/* 閲覧専用バッジ */}
        {tenantRole === "viewer" && (
          <div className={`mx-3 mt-3 ${isSidebarOpen ? "px-3 py-2" : "px-1 py-1.5"} bg-amber-500/20 border border-amber-500/40 rounded-lg text-center`}>
            <span className="text-amber-300 text-xs font-semibold">{isSidebarOpen ? "閲覧専用モード" : "RO"}</span>
          </div>
        )}

        {/* ナビゲーションメニュー */}
        <nav ref={sidebarNavRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto py-4">
          {/* プラットフォーム管理への切替リンク */}
          {platformRole === "platform_admin" && (
            <div className="px-3 mb-3">
              <Link
                href="/platform"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-violet-300 hover:from-violet-600/30 hover:to-indigo-600/30 transition-all text-xs font-medium"
              >
                <span>🌐</span>
                {isSidebarOpen && <span>プラットフォーム管理</span>}
              </Link>
            </div>
          )}
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
            badge={unreadCount}
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
            feature="reorder"
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
            label="簡易Drカルテ"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/doctor"}
          />
          <MenuItem
            href="/admin/karte"
            icon="📋"
            label="カルテ"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/karte" || pathname === "/admin/kartesearch"}
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
          <MenuItem
            href="/admin/shipping/settings"
            icon="⚙️"
            label="配送設定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/shipping/settings"}
          />
          <MenuItem
            href="/admin/inventory"
            icon="📦"
            label="在庫"
            isOpen={isSidebarOpen}
            isActive={pathname.startsWith("/admin/inventory")}
          />

          <MenuSection label="患者管理" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/intake-form"
            icon="📝"
            label="問診設定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/intake-form"}
            feature="form_builder"
          />
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
            label="患者情報変更・統合"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/merge-patients"}
          />
          <MenuItem
            href="/admin/dedup-patients"
            icon="🔍"
            label="患者名寄せ"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/dedup-patients"}
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
            href="/admin/products"
            icon="💊"
            label="商品管理"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/products"}
          />
          <MenuItem
            href="/admin/settings"
            icon="⚙️"
            label="設定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/settings"}
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
    </FeaturesProvider>
  );
}

interface MenuItemProps {
  href: string;
  icon: string;
  label: string;
  isOpen: boolean;
  isActive: boolean;
  badge?: number;
  feature?: Feature;
}

function MenuItem({ href, icon, label, isOpen, isActive, badge, feature }: MenuItemProps) {
  const { hasFeature } = useFeatures();
  if (feature && !hasFeature(feature)) return null;

  return (
    <Link
      href={href}
      scroll={false}
      className={`w-full px-4 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
        isActive ? "bg-slate-800 border-l-4 border-blue-500" : ""
      }`}
    >
      <span className="text-base relative">
        {icon}
        {!isOpen && badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {isOpen && (
        <>
          <span className="text-sm font-medium">{label}</span>
          {badge != null && badge > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

interface MobileMenuItemProps {
  href: string;
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  feature?: Feature;
}

function MobileMenuItem({ href, icon, label, isActive, onClick, badge, feature }: MobileMenuItemProps) {
  const { hasFeature } = useFeatures();
  if (feature && !hasFeature(feature)) return null;

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
      {badge != null && badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
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
