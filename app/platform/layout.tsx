"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SWRConfig } from "swr";
import Link from "next/link";
import { ProductProvider } from "@/lib/contexts/product-context";
import { PRODUCT_NAMES, INDUSTRY_ICONS, type Industry } from "@/lib/feature-flags";

// プラットフォーム管理メニュー
const PLATFORM_MENU_ITEMS = [
  { href: "/platform", icon: "📊", label: "ダッシュボード" },
  { href: "/platform/tenants", icon: "🏥", label: "テナント管理" },
  { href: "/platform/applications", icon: "📩", label: "申し込み管理" },
  { href: "/platform/inquiries", icon: "💬", label: "お問い合わせ" },
  { href: "/platform/members", icon: "👥", label: "メンバー管理" },
  { href: "/platform/billing", icon: "💳", label: "契約・請求" },
  { href: "/platform/analytics", icon: "📈", label: "分析" },
  { href: "/platform/benchmark", icon: "🏆", label: "ベンチマーク" },
  { href: "/platform/ai-insights", icon: "🧠", label: "AI Insights" },
  { href: "/platform/ai-operations", icon: "🤖", label: "AI Operations" },
  { href: "/platform/ai-queues", icon: "📋", label: "AI Queues" },
  { href: "/platform/ai-supervisor", icon: "🛡️", label: "AI Supervisor" },
  { href: "/platform/ai-governance", icon: "🔒", label: "AI Governance" },
  { href: "/platform/ai-builder", icon: "🔧", label: "AI Builder" },
  { href: "/platform/ai-playground", icon: "🎮", label: "AI Playground" },
  { href: "/platform/ai-workforce", icon: "👷", label: "AI Workforce" },
  { href: "/platform/health", icon: "💚", label: "システムヘルス" },
  { href: "/platform/errors", icon: "⚠️", label: "エラーログ" },
  { href: "/platform/alerts", icon: "🔔", label: "アラート" },
  { href: "/platform/audit", icon: "🔍", label: "監査ログ" },
  { href: "/platform/shared-templates", icon: "📋", label: "共有テンプレート" },
  { href: "/platform/richmenu-generator", icon: "🎨", label: "リッチメニュー生成" },
  { href: "/platform/seo", icon: "🔍", label: "SEO分析" },
  { href: "/platform/system", icon: "⚙️", label: "システム設定" },
  { href: "/platform/settings", icon: "🔐", label: "アカウント設定" },
];

// ロゴコンポーネント（プラットフォーム管理: アンバー/オレンジ系でテナント管理のcyan/blueと差別化）
function LogoMark({ compact }: { compact?: boolean }) {
  const gradientClass = "bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent";
  if (compact) {
    return (
      <span className={`text-lg font-black tracking-tight ${gradientClass}`} style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        P
      </span>
    );
  }
  return (
    <div className="flex items-baseline gap-0">
      <span className={`text-xl font-black tracking-tight ${gradientClass}`} style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        Lオペ
      </span>
      <span className={`ml-1.5 text-[10px] font-semibold tracking-widest uppercase ${gradientClass}`}>Platform</span>
    </div>
  );
}

// 認証不要のパス
const PUBLIC_PATHS = ["/platform/login", "/platform/password-reset", "/platform/password-reset/confirm"];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [activeProduct, setActiveProductRaw] = useState<"all" | Industry>("all");
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    // ログインページ・パスワードリセットは認証不要
    if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
      setLoading(false);
      return;
    }

    if (isAuthenticated) return;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.user?.platformRole === "platform_admin") {
            // CSRFトークン初期化 + fetch自動付与
            fetch("/api/csrf-token", { credentials: "include" })
              .then((r) => r.ok ? r.json() : null)
              .then((d) => {
                if (!d?.csrfToken) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((window as any).__csrfPatched) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).__csrfPatched = true;
                const origFetch = window.fetch;
                window.fetch = function (input, init) {
                  const method = (init?.method || "GET").toUpperCase();
                  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
                    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
                    if (url.startsWith("/api/") || url.startsWith(location.origin + "/api/")) {
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
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // セッションチェック失敗
      }

      // 認証失敗またはplatform_adminでない → ログインへ
      router.push("/platform/login");
    };

    checkSession();
  }, [pathname, router, isAuthenticated]);

  // ページ遷移時の処理
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsPageTransitioning(true);
      setIsMobileMenuOpen(false);
      const timer = setTimeout(() => setIsPageTransitioning(false), 150);
      prevPathnameRef.current = pathname;
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // プロダクトスイッチャーの復元
  useEffect(() => {
    const saved = sessionStorage.getItem("platform-active-product");
    if (saved) setActiveProductRaw(saved as "all" | Industry);
  }, []);

  const setActiveProduct = (p: "all" | Industry) => {
    setActiveProductRaw(p);
    sessionStorage.setItem("platform-active-product", p);
  };

  // サイドバーのスクロール位置を保存・復元
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem("platform-sidebar-scroll");
    if (savedScrollPos && sidebarNavRef.current) {
      sidebarNavRef.current.scrollTop = parseInt(savedScrollPos, 10);
    }
  }, []);

  const handleSidebarScroll = () => {
    if (sidebarNavRef.current) {
      sessionStorage.setItem("platform-sidebar-scroll", sidebarNavRef.current.scrollTop.toString());
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
    router.push("/platform/login");
  };

  // ログインページ・パスワードリセットはそのまま表示
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  // 認証チェック中
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
          <p className="mt-4 text-zinc-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <ProductProvider>
    <div className="h-dvh bg-zinc-100 flex overflow-hidden">
      {/* モバイル用ハンバーガーボタン */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-zinc-800 text-white rounded-lg shadow-lg"
        aria-label="メニューを開く"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* モバイル用オーバーレイメニュー */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-800 text-white flex flex-col">
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
              <LogoMark />
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-zinc-700 rounded" aria-label="メニューを閉じる">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              {PLATFORM_MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-700 transition-colors ${
                    (item.href === "/platform" ? pathname === "/platform" : pathname?.startsWith(item.href))
                      ? "bg-zinc-700 border-l-4 border-amber-500"
                      : ""
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-zinc-700">
              <button onClick={handleLogout} className="w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center gap-2 text-sm">
                <span>ログアウト</span>
                <span>🚪</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* PC用サイドバー — zinc-800 ベースでテナント管理(slate-900)と差別化 */}
      <aside
        className={`hidden md:flex ${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-zinc-800 text-white transition-all duration-300 flex-col h-screen sticky top-0`}
      >
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          {isSidebarOpen ? (
            <>
              <LogoMark />
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-zinc-700 rounded">◀</button>
            </>
          ) : (
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-zinc-700 rounded mx-auto">
              <LogoMark compact />
            </button>
          )}
        </div>

        <nav ref={sidebarNavRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto py-4">
          {isSidebarOpen && (
            <div className="px-4 mb-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Platform</span>
            </div>
          )}
          {/* プロダクトスイッチャー */}
          {isSidebarOpen && (
            <div className="px-4 mb-3">
              <select
                value={activeProduct}
                onChange={(e) => setActiveProduct(e.target.value as "all" | Industry)}
                className="w-full bg-zinc-700 text-white border border-zinc-600 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                <option value="all">全プロダクト</option>
                <option value="clinic">{INDUSTRY_ICONS.clinic} {PRODUCT_NAMES.clinic}</option>
                <option value="salon">{INDUSTRY_ICONS.salon} {PRODUCT_NAMES.salon}</option>
                <option value="ec">{INDUSTRY_ICONS.ec} {PRODUCT_NAMES.ec}</option>
                <option value="other">{INDUSTRY_ICONS.other} {PRODUCT_NAMES.other}</option>
              </select>
            </div>
          )}
          {PLATFORM_MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              className={`w-full px-4 py-2 flex items-center gap-2.5 hover:bg-zinc-700 transition-colors ${
                (item.href === "/platform" ? pathname === "/platform" : pathname?.startsWith(item.href))
                  ? "bg-zinc-700 border-l-4 border-amber-500"
                  : ""
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-700">
          <button onClick={handleLogout} className="w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center gap-2 text-sm">
            {isSidebarOpen && <span>ログアウト</span>}
            <span>🚪</span>
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 min-h-0 relative overflow-y-auto">
        {isPageTransitioning && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
              <span className="text-sm text-zinc-600">読み込み中...</span>
            </div>
          </div>
        )}
        <SWRConfig
          value={{
            fetcher: (url: string) =>
              fetch(url, { credentials: "include" }).then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
              }),
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 2000,
            errorRetryCount: 3,
          }}
        >
          {children}
        </SWRConfig>
      </main>
    </div>
    </ProductProvider>
  );
}
