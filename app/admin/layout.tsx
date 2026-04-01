"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import PatientLookupWidget from "@/components/admin/PatientLookupWidget";
import { FeaturesProvider, useFeatures } from "@/lib/hooks/use-features";
import { SWRProvider } from "@/lib/swr/provider";
import { adminFetcher } from "@/lib/swr/config";
import type { Feature, Industry } from "@/lib/feature-flags-shared";
import { PRODUCT_NAMES } from "@/lib/feature-flags-shared";
import { resolveMenuKeyFromPath } from "@/lib/menu-permissions";
import { getVisibleMenuKeys } from "@/lib/industry-menu-config";
import { getSectionLabel } from "@/lib/industry-config";

// 認証不要のパス
const PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/setup"];

// ロゴコンポーネント（業種に応じたプロダクト名を表示）
function LogoMark({ compact, industry = "clinic" }: { compact?: boolean; industry?: Industry }) {
  const gradientClass = "bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent";
  const productName = PRODUCT_NAMES[industry] || PRODUCT_NAMES.clinic;
  // "Lオペ for CLINIC" → suffix = "for CLINIC", "Lオペ" → suffix = ""
  const suffix = productName.replace("Lオペ", "").trim();
  if (compact) {
    return (
      <Image src="/icon.png" alt="Lオペ" width={36} height={36} className="rounded-lg object-contain" />
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0 overflow-hidden ml-1">
      <Image src="/icon.png" alt="Lオペ" width={32} height={32} className="shrink-0 rounded-lg object-contain" />
      <span className={`text-xl font-bold whitespace-nowrap ${gradientClass}`}>Lオペ{suffix && <> <span className="text-sm font-semibold tracking-widest uppercase">{suffix}</span></>}</span>
    </div>
  );
}

// スマホ用メニュー項目（必要な機能のみ）
const MOBILE_MENU_ITEMS: { href: string; icon: string; label: string; feature?: Feature; menuKey?: string }[] = [
  { href: "/admin/accounting", icon: "💹", label: "売上管理", menuKey: "accounting" },
  { href: "/admin/line/talk", icon: "💬", label: "LINE機能", menuKey: "line" },
  { href: "/admin/line/tracking-sources", icon: "📈", label: "流入経路", menuKey: "tracking_sources" },
  { href: "/admin/reservations", icon: "📅", label: "予約リスト", menuKey: "reservations" },
  { href: "/admin/reorders", icon: "🔄", label: "再処方リスト", feature: "reorder", menuKey: "reorders" },
  { href: "/admin/doctor", icon: "🩺", label: "簡易カルテ", menuKey: "doctor" },
  { href: "/admin/karte", icon: "📋", label: "カルテ", menuKey: "karte" },
  { href: "/admin/noname-master", icon: "📋", label: "決済", menuKey: "payments" },
  { href: "/admin/subscription-plans", icon: "🔄", label: "定期プラン", menuKey: "subscription_plans" },
  { href: "/admin/ec-subscriptions", icon: "🔄", label: "定期購入管理", menuKey: "ec_subscriptions" },
  { href: "/admin/shipping/pending", icon: "📦", label: "発送", menuKey: "shipping" },
  { href: "/admin/view-mypage", icon: "👁️", label: "顧客マイページ確認", menuKey: "view_mypage" },
  { href: "/admin/merge-patients", icon: "🔗", label: "顧客情報変更", menuKey: "merge_patients" },
  { href: "/admin/intake-form", icon: "📝", label: "問診設定", feature: "form_builder", menuKey: "intake_form" },
  { href: "/admin/schedule", icon: "🗓️", label: "予約設定", menuKey: "schedule" },
  { href: "/admin/notification-settings", icon: "📩", label: "イベント通知", menuKey: "notification_settings" },
  { href: "/admin/products", icon: "💊", label: "商品管理", menuKey: "products" },
  { href: "/admin/campaigns", icon: "🎯", label: "キャンペーン", menuKey: "campaigns" },
  { href: "/admin/inventory", icon: "📦", label: "在庫", menuKey: "inventory" },
  // SALON専用
  { href: "/admin/stylists", icon: "💇", label: "スタッフ管理", menuKey: "stylists" },
  { href: "/admin/treatments", icon: "✂️", label: "施術メニュー", menuKey: "treatments" },
  { href: "/admin/salon-karte", icon: "📒", label: "施術カルテ", menuKey: "salon_karte" },
  { href: "/admin/hotpepper", icon: "🔥", label: "HotPepper連携", menuKey: "hotpepper" },
  { href: "/admin/stamp-cards", icon: "🎫", label: "スタンプカード", menuKey: "stamp_cards" },
  // EC専用
  { href: "/admin/ec-settings", icon: "🔗", label: "EC連携設定", menuKey: "ec_settings" },
  { href: "/admin/rfm", icon: "📊", label: "RFM分析", menuKey: "rfm" },
  { href: "/admin/settings", icon: "⚙️", label: "設定", menuKey: "settings" },
  { href: "/admin/help", icon: "❓", label: "ヘルプ", menuKey: "help" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [platformRole, setPlatformRole] = useState<string>("tenant_admin");
  const [tenantRole, setTenantRole] = useState<string>("admin");
  const [allowedMenuKeys, setAllowedMenuKeys] = useState<string[] | null>(null);
  const [industry, setIndustry] = useState<Industry>("clinic");
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef(pathname);

  // 未読カウント・再処方件数・在庫アラート件数のポーリング
  // SWRのrefreshInterval: タブ非表示時は自動停止、復帰時にrevalidateOnFocusで即時再取得
  // layout自体はSWRProvider外なのでadminFetcherを直接渡す
  const { data: unreadData } = useSWR<{ count: number }>(
    isAuthenticated ? "/api/admin/unread-count" : null,
    adminFetcher,
    { refreshInterval: 15000, revalidateOnFocus: true },
  );
  const { data: reorderData } = useSWR<{ count: number }>(
    isAuthenticated ? "/api/admin/reorders/pending-count" : null,
    adminFetcher,
    { refreshInterval: 30000, revalidateOnFocus: true },
  );
  const { data: alertData } = useSWR<{ count: number }>(
    isAuthenticated ? "/api/admin/inventory/alerts/count" : null,
    adminFetcher,
    { refreshInterval: 30000, revalidateOnFocus: true },
  );
  const { data: bookingAlertData } = useSWR<{ alert: boolean }>(
    isAuthenticated ? "/api/admin/booking-open/alert" : null,
    adminFetcher,
    { refreshInterval: 60000, revalidateOnFocus: true },
  );
  const unreadCount = unreadData?.count ?? 0;
  const pendingReorderCount = reorderData?.count ?? 0;
  const inventoryAlertCount = alertData?.count ?? 0;
  const bookingAlert = bookingAlertData?.alert ?? false;

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
            setAllowedMenuKeys(data.user?.allowedMenuKeys ?? null);
            setIndustry((data.user?.industry as Industry) || "clinic");
            // 認証完了とローディング解除を同時に行う（間にawaitを挟まない）
            setIsAuthenticated(true);
            setLoading(false);

            // 初回ログイン時: セットアップ未完了ならオンボーディングへリダイレクト（認証後に非同期で実行）
            if (!pathname.startsWith("/admin/onboarding")) {
              fetch("/api/admin/setup-status", { credentials: "include" })
                .then((r) => r.ok ? r.json() : null)
                .then((d) => {
                  if (d?.completedCount === 0) {
                    router.push("/admin/onboarding");
                  }
                })
                .catch(() => {});
            }
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

  // 子コンポーネントからモバイルメニューを開くためのカスタムイベント
  useEffect(() => {
    const handler = () => setIsMobileMenuOpen(true);
    window.addEventListener("open-mobile-menu", handler);
    return () => window.removeEventListener("open-mobile-menu", handler);
  }, []);

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

  // 業種+ロール権限で統合されたメニューキー
  const visibleMenuKeys = getVisibleMenuKeys(industry, allowedMenuKeys);

  // 不許可ページへのリダイレクト（業種フィルタ + ロール権限の両方を適用）
  useEffect(() => {
    if (!isAuthenticated) return;
    if (PUBLIC_PATHS.includes(pathname)) return;
    if (pathname.startsWith("/admin/onboarding")) return;

    const menuKey = resolveMenuKeyFromPath(pathname);
    // menuKey が null（マッピング対象外のパス）は許可
    if (menuKey === null) return;
    if (!visibleMenuKeys.includes(menuKey)) {
      router.push("/admin/dashboard");
    }
  }, [pathname, isAuthenticated, visibleMenuKeys, router]);

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

  // オンボーディングページはサイドバーなしのフルスクリーン表示
  const isOnboarding = pathname.startsWith("/admin/onboarding");
  if (isOnboarding) {
    return <SWRProvider><FeaturesProvider>{children}</FeaturesProvider></SWRProvider>;
  }

  return (
    <SWRProvider>
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
              <LogoMark industry={industry} />
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
                  badge={item.href === "/admin/line/talk" ? unreadCount : item.href === "/admin/reorders" ? pendingReorderCount : item.href === "/admin/inventory" ? inventoryAlertCount : undefined}
                  alert={item.href === "/admin/schedule" ? bookingAlert : undefined}
                  feature={item.feature}
                  menuKey={item.menuKey}
                  allowedMenuKeys={visibleMenuKeys}
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
              <LogoMark industry={industry} />
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
          <MenuItem
            href="/admin/dashboard"
            icon="📊"
            label="ダッシュボード"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/dashboard" || pathname === "/admin"}
            menuKey="dashboard"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/accounting"
            icon="💹"
            label="売上管理"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/accounting"}
            menuKey="accounting"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/line/talk"
            icon="💬"
            label="LINE機能"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/line") && pathname !== "/admin/line/tracking-sources"}
            badge={unreadCount}
            menuKey="line"
            allowedMenuKeys={visibleMenuKeys}
          />

          <MenuSection label={getSectionLabel(industry, "予約・診察")} isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/reservations"
            icon="📅"
            label="予約リスト"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/reservations"}
            menuKey="reservations"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/reorders"
            icon="🔄"
            label="再処方リスト"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/reorders"}
            badge={pendingReorderCount}
            feature="reorder"
            menuKey="reorders"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/karte"
            icon="📋"
            label="カルテ"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/karte" || pathname === "/admin/kartesearch"}
            menuKey="karte"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/doctor"
            icon="🩺"
            label="簡易カルテ"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/doctor"}
            menuKey="doctor"
            allowedMenuKeys={visibleMenuKeys}
          />

          <MenuSection label="決済管理" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/noname-master"
            icon="📋"
            label="決済"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/noname-master"}
            menuKey="payments"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/bank-transfer/reconcile"
            icon="🔍"
            label="銀行振込照合"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/bank-transfer/reconcile"}
            menuKey="bank_reconcile"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/subscription-plans"
            icon="🔄"
            label="定期プラン"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/subscription-plans")}
            menuKey="subscription_plans"
            allowedMenuKeys={visibleMenuKeys}
          />

          <MenuSection label={getSectionLabel(industry, "発送管理")} isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/shipping/pending"
            icon="📦"
            label="発送"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/shipping/pending"}
            menuKey="shipping"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/shipping/tracking"
            icon="🏷️"
            label="追跡番号"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/shipping/tracking"}
            menuKey="shipping_tracking"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/shipping/settings"
            icon="⚙️"
            label="配送設定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/shipping/settings"}
            menuKey="shipping_settings"
            allowedMenuKeys={visibleMenuKeys}
          />

          <MenuSection label={getSectionLabel(industry, "顧客管理")} isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/view-mypage"
            icon="👁️"
            label="顧客マイページ確認"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/view-mypage"}
            menuKey="view_mypage"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/merge-patients"
            icon="🔗"
            label="顧客情報変更"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/merge-patients" || pathname === "/admin/patient-data" || pathname === "/admin/dedup-patients"}
            menuKey="merge_patients"
            allowedMenuKeys={visibleMenuKeys}
          />

          <MenuSection label={getSectionLabel(industry, "業務管理")} isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/intake-form"
            icon="📝"
            label="問診設定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/intake-form"}
            feature="form_builder"
            menuKey="intake_form"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/schedule"
            icon="🗓️"
            label="予約設定"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/schedule")}
            alert={bookingAlert}
            menuKey="schedule"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/notification-settings"
            icon="📩"
            label="イベント通知"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/notification-settings"}
            menuKey="notification_settings"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/products"
            icon="💊"
            label="商品管理"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/products"}
            menuKey="products"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/campaigns"
            icon="🎯"
            label="キャンペーン"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/campaigns")}
            menuKey="campaigns"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/inventory"
            icon="📦"
            label="在庫"
            isOpen={isSidebarOpen}
            isActive={pathname.startsWith("/admin/inventory")}
            badge={inventoryAlertCount}
            menuKey="inventory"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/line/tracking-sources"
            icon="📈"
            label="流入経路"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/line/tracking-sources"}
            menuKey="tracking_sources"
            allowedMenuKeys={visibleMenuKeys}
          />

          {/* SALON専用メニュー */}
          <MenuSection label="予約・施術" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/stylists"
            icon="💇"
            label="スタッフ管理"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/stylists")}
            menuKey="stylists"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/treatments"
            icon="✂️"
            label="施術メニュー"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/treatments")}
            menuKey="treatments"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/salon-karte"
            icon="📒"
            label="施術カルテ"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/salon-karte")}
            menuKey="salon_karte"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/hotpepper"
            icon="🔥"
            label="HotPepper連携"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/hotpepper")}
            menuKey="hotpepper"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/stamp-cards"
            icon="🎫"
            label="スタンプカード"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/stamp-cards")}
            menuKey="stamp_cards"
            allowedMenuKeys={visibleMenuKeys}
          />

          {/* EC専用メニュー */}
          <MenuSection label="注文管理" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/ec-subscriptions"
            icon="🔄"
            label="定期購入管理"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/ec-subscriptions")}
            menuKey="ec_subscriptions"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/ec-settings"
            icon="🔗"
            label="EC連携設定"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/ec-settings")}
            menuKey="ec_settings"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/rfm"
            icon="📊"
            label="RFM分析"
            isOpen={isSidebarOpen}
            isActive={pathname?.startsWith("/admin/rfm")}
            menuKey="rfm"
            allowedMenuKeys={visibleMenuKeys}
          />

          <MenuSection label="システム" isOpen={isSidebarOpen} />
          <MenuItem
            href="/admin/settings"
            icon="⚙️"
            label="設定"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/settings"}
            menuKey="settings"
            allowedMenuKeys={visibleMenuKeys}
          />
          <MenuItem
            href="/admin/help"
            icon="❓"
            label="ヘルプ"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin/help"}
            menuKey="help"
            allowedMenuKeys={visibleMenuKeys}
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
      <main className={`flex-1 min-h-0 relative ${pathname === "/admin/line/talk" || pathname === "/admin/line/flex-builder" ? "overflow-hidden" : "overflow-y-auto"}`}>
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
    </SWRProvider>
  );
}

interface MenuItemProps {
  href: string;
  icon: string;
  label: string;
  isOpen: boolean;
  isActive: boolean;
  badge?: number;
  alert?: boolean;
  feature?: Feature;
  menuKey?: string;
  allowedMenuKeys?: string[] | null;
}

function MenuItem({ href, icon, label, isOpen, isActive, badge, alert: showAlert, feature, menuKey, allowedMenuKeys }: MenuItemProps) {
  const { hasFeature } = useFeatures();
  if (feature && !hasFeature(feature)) return null;
  // メニュー権限制御: allowedMenuKeys が配列かつ menuKey 指定ありの場合、含まれていなければ非表示
  if (allowedMenuKeys !== null && allowedMenuKeys !== undefined && menuKey && !allowedMenuKeys.includes(menuKey)) return null;

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
        {!isOpen && showAlert && (
          <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
            !
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
          {showAlert && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
              !
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
  alert?: boolean;
  feature?: Feature;
  menuKey?: string;
  allowedMenuKeys?: string[] | null;
}

function MobileMenuItem({ href, icon, label, isActive, onClick, badge, alert: showAlert, feature, menuKey, allowedMenuKeys }: MobileMenuItemProps) {
  const { hasFeature } = useFeatures();
  if (feature && !hasFeature(feature)) return null;
  // メニュー権限制御: allowedMenuKeys が配列かつ menuKey 指定ありの場合、含まれていなければ非表示
  if (allowedMenuKeys !== null && allowedMenuKeys !== undefined && menuKey && !allowedMenuKeys.includes(menuKey)) return null;

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
      {showAlert && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
          !
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
