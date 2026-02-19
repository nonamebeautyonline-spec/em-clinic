"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// プラットフォーム管理メニュー
const PLATFORM_MENU_ITEMS = [
  { href: "/platform", icon: "📊", label: "ダッシュボード" },
  { href: "/platform/tenants", icon: "🏥", label: "テナント管理" },
  { href: "/platform/members", icon: "👥", label: "メンバー管理" },
  { href: "/platform/billing", icon: "💳", label: "契約・請求" },
  { href: "/platform/audit", icon: "🔍", label: "監査ログ" },
  { href: "/platform/system", icon: "⚙️", label: "システム設定" },
];

// ロゴコンポーネント
function LogoMark({ compact }: { compact?: boolean }) {
  const gradientClass = "bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent";
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

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
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
      router.push("/admin/login");
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
    router.push("/admin/login");
  };

  // 認証チェック中
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-violet-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-slate-50 flex overflow-hidden">
      {/* モバイル用ハンバーガーボタン */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
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
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <LogoMark />
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-800 rounded" aria-label="メニューを閉じる">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="px-3 mb-3">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all text-xs font-medium"
                >
                  <span>←</span>
                  <span>テナント管理に戻る</span>
                </Link>
              </div>
              {PLATFORM_MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors ${
                    (item.href === "/platform" ? pathname === "/platform" : pathname?.startsWith(item.href))
                      ? "bg-slate-800 border-l-4 border-violet-500"
                      : ""
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleLogout} className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-2 text-sm">
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
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {isSidebarOpen ? (
            <>
              <LogoMark />
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-800 rounded">◀</button>
            </>
          ) : (
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded mx-auto">
              <LogoMark compact />
            </button>
          )}
        </div>

        <nav ref={sidebarNavRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all text-xs font-medium"
            >
              <span>←</span>
              {isSidebarOpen && <span>テナント管理に戻る</span>}
            </Link>
          </div>
          {isSidebarOpen && (
            <div className="px-4 mb-2">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Platform</span>
            </div>
          )}
          {PLATFORM_MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              className={`w-full px-4 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                (item.href === "/platform" ? pathname === "/platform" : pathname?.startsWith(item.href))
                  ? "bg-slate-800 border-l-4 border-violet-500"
                  : ""
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-2 text-sm">
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
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-600">読み込み中...</span>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
