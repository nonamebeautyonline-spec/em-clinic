"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminToken, setAdminToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      setAdminToken(token);
      setIsAuthenticated(true);
    } else if (pathname !== "/admin/login") {
      router.push("/admin/login");
    }
    setLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setAdminToken("");
    router.push("/admin/login");
  };

  // ログイン画面は特別扱い
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // 認証されていない場合はローディングまたはリダイレクト
  if (!isAuthenticated) {
    return <>{children}</>; // リダイレクト処理はuseEffectで行う
  }

  if (loading) {
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* サイドバー */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-slate-900 text-white transition-all duration-300 flex flex-col h-screen sticky top-0`}
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
        <nav className="flex-1 overflow-y-auto py-4">
          <MenuItem
            href="/admin"
            icon="📊"
            label="ダッシュボード"
            isOpen={isSidebarOpen}
            isActive={pathname === "/admin"}
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
      <main className="flex-1 overflow-y-auto">{children}</main>
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
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full px-4 py-2 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
        isActive ? "bg-slate-800 border-l-4 border-blue-500" : ""
      }`}
    >
      <span className="text-base">{icon}</span>
      {isOpen && <span className="text-sm font-medium">{label}</span>}
    </button>
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
