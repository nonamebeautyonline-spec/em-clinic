"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const BASE = "/d-64219f25f0e177ee";

const DEMO_MENU_ITEMS = [
  { href: BASE, icon: "📊", label: "ダッシュボード" },
  { href: `${BASE}/talk`, icon: "💬", label: "LINEトーク" },
  { href: `${BASE}/friends`, icon: "👥", label: "友だち管理" },
  { href: `${BASE}/broadcasts`, icon: "📢", label: "メッセージ配信" },
  { href: `${BASE}/calendar`, icon: "📅", label: "予約カレンダー" },
  { href: `${BASE}/karte`, icon: "🩺", label: "Drカルテ" },
  { href: `${BASE}/shipping`, icon: "📦", label: "発送管理" },
];

function LogoMark({ compact }: { compact?: boolean }) {
  const gradientClass = "bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent";
  if (compact) {
    return (
      <span className={`text-lg font-black tracking-tight ${gradientClass}`} style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        L
      </span>
    );
  }
  return (
    <div className="flex items-baseline gap-0">
      <span className={`text-xl font-black tracking-tight ${gradientClass}`} style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
        Lオペ
      </span>
      <span className={`ml-1.5 text-[10px] font-semibold tracking-widest uppercase ${gradientClass}`}>for CLINIC</span>
      <span className="ml-2 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">DEMO</span>
    </div>
  );
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === `${BASE}/login`) {
      setLoading(false);
      return;
    }

    const session = localStorage.getItem("demo_session");
    if (session === "true") {
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      router.push(`${BASE}/login`);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("demo_session");
    setIsAuthenticated(false);
    router.push(`${BASE}/login`);
  };

  // ログインページはレイアウトなし
  if (pathname === `${BASE}/login`) {
    return <>{children}</>;
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-slate-50 flex overflow-hidden">
      {/* モバイル用ハンバーガーボタン */}
      {pathname !== `${BASE}/talk` && (
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
              {DEMO_MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors ${
                    pathname === item.href || (item.href !== BASE && pathname?.startsWith(item.href))
                      ? "bg-slate-800 border-l-4 border-blue-500"
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
      <aside className={`hidden md:flex ${isSidebarOpen ? "w-64" : "w-20"} bg-slate-900 text-white transition-all duration-300 flex-col h-screen sticky top-0`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {isSidebarOpen ? (
            <>
              <LogoMark />
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-800 rounded">
                ◀
              </button>
            </>
          ) : (
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded mx-auto">
              <LogoMark compact />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {DEMO_MENU_ITEMS.map((item) => {
            const isActive = item.href === BASE
              ? pathname === BASE
              : pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full px-4 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                  isActive ? "bg-slate-800 border-l-4 border-blue-500" : ""
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-2 text-sm">
            {isSidebarOpen && <span>ログアウト</span>}
            <span>🚪</span>
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className={`flex-1 min-h-0 relative ${pathname === `${BASE}/talk` ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
        {/* デモ注記バナー */}
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500/90 text-white text-center text-xs py-1.5 z-30 backdrop-blur-sm">
          これはデモ環境です。実際のデータは含まれていません。
        </div>
      </main>
    </div>
  );
}
