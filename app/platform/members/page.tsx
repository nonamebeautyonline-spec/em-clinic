"use client";

// app/platform/members/page.tsx
// プラットフォーム管理: メンバー管理ページ

import { useState, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";

// ---- 型定義 ----

interface TenantInfo {
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  role: string;
}

interface Member {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  platformRole: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  tenantRole: string | null;
  createdAt: string;
  updatedAt: string;
  allTenants: TenantInfo[];
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface MembersResponse {
  ok: boolean;
  members: Member[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  tenants: TenantOption[];
}

// ---- メインコンポーネント ----

export default function PlatformMembersPage() {
  const [tenantsCache, setTenantsCache] = useState<TenantOption[]>([]);
  // 操作モーダル
  const [actionTarget, setActionTarget] = useState<Member | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [newRole, setNewRole] = useState("");

  // フィルター
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // ページネーション
  const [page, setPage] = useState(1);
  const limit = 20;

  // 動的SWRキー
  const memberParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) memberParams.set("search", search);
  if (tenantFilter) memberParams.set("tenant_id", tenantFilter);
  if (roleFilter) memberParams.set("role", roleFilter);

  const { data: rawData, error: swrError, isLoading: loading } = useSWR<MembersResponse>(
    `/api/platform/members?${memberParams}`,
  );

  useEffect(() => {
    if (rawData?.tenants && rawData.tenants.length > 0) {
      setTenantsCache(rawData.tenants);
    }
  }, [rawData]);

  const members = rawData?.members || [];
  const total = rawData?.total || 0;
  const totalPages = rawData?.totalPages || 1;
  const tenants = tenantsCache;
  const error = swrError?.message || (rawData && !rawData.ok ? "エラーが発生しました" : "");

  // 検索実行（デバウンス）
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // フィルター変更時にページリセット
  const handleTenantFilterChange = (value: string) => {
    setTenantFilter(value);
    setPage(1);
  };
  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  // メンバー操作実行
  const handleAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    setActionError("");

    try {
      const body: Record<string, string> = { action: actionType };
      if (actionType === "change_role") body.role = newRole;

      const res = await fetch(`/api/platform/members/${actionTarget.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionError(data.error || "操作に失敗しました");
        setActionLoading(false);
        return;
      }

      const labels: Record<string, string> = {
        toggle_active: actionTarget.isActive ? "無効化しました" : "有効化しました",
        change_role: "ロールを変更しました",
        force_logout: "強制ログアウトしました",
        reset_2fa: "2FAをリセットしました",
      };
      setActionSuccess(labels[actionType] || "操作が完了しました");
      setActionTarget(null);
      setActionType("");
      // 一覧を再取得
      mutate((key: string) => typeof key === "string" && key.startsWith("/api/platform/members"));
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setActionLoading(false);
    }
  };

  const openAction = (member: Member, type: string) => {
    setActionTarget(member);
    setActionType(type);
    setActionError("");
    if (type === "change_role") {
      setNewRole(member.platformRole === "platform_admin" ? "tenant_admin" : "platform_admin");
    }
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionType("");
    setActionError("");
  };

  // 日時フォーマット
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg shadow-violet-500/25">
            <span>M</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              メンバー管理
            </h1>
            <p className="text-sm text-slate-500">
              全テナントの管理者アカウント
            </p>
          </div>
        </div>
      </div>

      {/* 操作成功メッセージ */}
      {actionSuccess && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-green-700 text-sm">
          {actionSuccess}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* フィルターバー */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* 検索 */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="名前・メールで検索..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* テナントフィルター */}
          <select
            value={tenantFilter}
            onChange={(e) => handleTenantFilterChange(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">全テナント</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* ロールフィルター */}
          <select
            value={roleFilter}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">全ロール</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="tenant_admin">Tenant Admin</option>
          </select>
        </div>

        {/* 件数表示 */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            {loading ? "読み込み中..." : `${total}件のメンバー`}
          </span>
          {(search || tenantFilter || roleFilter) && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setTenantFilter("");
                setRoleFilter("");
                setPage(1);
              }}
              className="text-violet-600 hover:text-violet-800 font-medium"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      </div>

      {/* メンバーテーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* テーブルヘッダー */}
        <div className="hidden md:flex items-center px-5 py-3 bg-slate-50 border-b border-slate-200">
          <span className="flex-1 min-w-0 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            名前
          </span>
          <span className="w-56 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            メール
          </span>
          <span className="w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            所属テナント
          </span>
          <span className="w-32 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            ロール
          </span>
          <span className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
            登録日
          </span>
          <span className="w-20 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
            状態
          </span>
          <span className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
            操作
          </span>
        </div>

        {/* ローディングスケルトン */}
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center px-5 py-4 animate-pulse"
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-3 bg-slate-100 rounded w-40 md:hidden" />
                  </div>
                </div>
                <div className="hidden md:block w-56">
                  <div className="h-4 bg-slate-200 rounded w-36" />
                </div>
                <div className="hidden md:block w-40">
                  <div className="h-5 bg-slate-200 rounded-full w-24" />
                </div>
                <div className="hidden md:block w-32">
                  <div className="h-5 bg-slate-200 rounded-full w-20" />
                </div>
                <div className="hidden md:block w-28">
                  <div className="h-4 bg-slate-200 rounded w-20 ml-auto" />
                </div>
                <div className="hidden md:block w-20 flex justify-center">
                  <div className="h-5 bg-slate-200 rounded-full w-12 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          /* 空状態 */
          <div className="py-16 text-center">
            <div className="text-4xl mb-3 opacity-40">👥</div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              メンバーが見つかりません
            </p>
            <p className="text-xs text-slate-400">
              検索条件を変更してみてください
            </p>
          </div>
        ) : (
          /* メンバー一覧 */
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col md:flex-row md:items-center px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                {/* 名前 + アバター */}
                <div className="flex-1 min-w-0 flex items-center gap-3 mb-2 md:mb-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      member.platformRole === "platform_admin"
                        ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                        : "bg-gradient-to-br from-slate-400 to-slate-500"
                    }`}
                  >
                    {(member.name || "?")[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {member.name || "(名前なし)"}
                    </div>
                    {/* モバイルではここにメール表示 */}
                    <div className="text-xs text-slate-400 truncate md:hidden">
                      {member.email}
                    </div>
                  </div>
                </div>

                {/* メール（PC） */}
                <div className="hidden md:block w-56">
                  <span className="text-sm text-slate-600 truncate block">
                    {member.email}
                  </span>
                </div>

                {/* 所属テナント */}
                <div className="w-full md:w-40 mb-2 md:mb-0">
                  <div className="flex flex-wrap gap-1">
                    {member.allTenants.length > 0 ? (
                      member.allTenants.map((t) => (
                        <span
                          key={t.tenantId}
                          className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-violet-50 text-violet-700 border border-violet-200"
                          title={t.tenantSlug || ""}
                        >
                          {t.tenantName || t.tenantSlug || "不明"}
                        </span>
                      ))
                    ) : member.tenantName ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-violet-50 text-violet-700 border border-violet-200">
                        {member.tenantName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        未所属
                      </span>
                    )}
                  </div>
                </div>

                {/* ロール */}
                <div className="w-full md:w-32 mb-2 md:mb-0">
                  <div className="flex flex-wrap gap-1">
                    <RoleBadge role={member.platformRole} />
                    {member.tenantRole && member.tenantRole !== member.platformRole && (
                      <TenantRoleBadge role={member.tenantRole} />
                    )}
                  </div>
                </div>

                {/* 登録日 */}
                <div className="hidden md:block w-28 text-right">
                  <span className="text-xs text-slate-500">
                    {formatDate(member.createdAt)}
                  </span>
                </div>

                {/* ステータス */}
                <div className="md:w-20 md:text-center">
                  <StatusBadge isActive={member.isActive} />
                </div>

                {/* 操作メニュー */}
                <div className="md:w-24 md:text-center">
                  <MemberActionMenu member={member} onAction={openAction} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {total}件中 {(page - 1) * limit + 1} - {Math.min(page * limit, total)}件
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                最初
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                前へ
              </button>
              <span className="px-3 py-1.5 text-xs font-medium text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                次へ
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                最後
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 操作確認モーダル */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {actionType === "toggle_active" && (actionTarget.isActive ? "メンバーを無効化" : "メンバーを有効化")}
              {actionType === "change_role" && "ロールを変更"}
              {actionType === "force_logout" && "強制ログアウト"}
              {actionType === "reset_2fa" && "2FAをリセット"}
            </h3>
            <p className="text-sm text-slate-600 mb-1">
              対象: <span className="font-medium">{actionTarget.name || actionTarget.email}</span>
            </p>
            <p className="text-sm text-slate-500 mb-4">
              {actionType === "toggle_active" && (actionTarget.isActive
                ? "このメンバーを無効化し、全セッションを終了します。"
                : "このメンバーを再度有効化します。")}
              {actionType === "change_role" && "プラットフォームロールを変更します。"}
              {actionType === "force_logout" && "全てのアクティブセッションを強制終了します。"}
              {actionType === "reset_2fa" && "2要素認証の設定をリセットします。次回ログイン時に再設定が必要になります。"}
            </p>

            {actionType === "change_role" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">新しいロール</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="platform_admin">Platform Admin</option>
                  <option value="tenant_admin">Tenant Admin</option>
                </select>
              </div>
            )}

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeAction}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                  actionType === "toggle_active" && actionTarget.isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {actionLoading ? "処理中..." : "実行"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- サブコンポーネント ----

function RoleBadge({ role }: { role: string }) {
  if (role === "platform_admin") {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
        Platform Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
      Tenant Admin
    </span>
  );
}

function TenantRoleBadge({ role }: { role: string }) {
  if (role === "owner") {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700 border border-blue-200">
        Owner
      </span>
    );
  }
  if (role === "viewer") {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">
        Viewer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
      {role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700 border border-green-200">
        有効
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
      無効
    </span>
  );
}

function MemberActionMenu({
  member,
  onAction,
}: {
  member: Member;
  onAction: (member: Member, action: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
        title="操作"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-40">
          <button
            onClick={() => { onAction(member, "toggle_active"); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
          >
            {member.isActive ? "無効化" : "有効化"}
          </button>
          <button
            onClick={() => { onAction(member, "change_role"); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
          >
            ロール変更
          </button>
          <button
            onClick={() => { onAction(member, "force_logout"); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
          >
            強制ログアウト
          </button>
          <button
            onClick={() => { onAction(member, "reset_2fa"); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
          >
            2FAリセット
          </button>
        </div>
      )}
    </div>
  );
}
