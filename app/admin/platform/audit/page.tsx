"use client";

// app/admin/platform/audit/page.tsx
// プラットフォーム管理: 監査ログ閲覧ページ

import { useState, useEffect, useCallback } from "react";

/* ---------- 型定義 ---------- */
interface AuditLog {
  id: string;
  tenant_id: string | null;
  admin_user_id: string | null;
  admin_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  tenants: { id: string; name: string; slug: string } | null;
  admin_users: { id: string; name: string; email: string } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

/* ---------- アクション種別の定義 ---------- */
const ACTION_FILTERS = [
  { value: "", label: "全て" },
  { value: "admin.login", label: "ログイン" },
  { value: "admin.patient", label: "患者操作" },
  { value: "admin.settings", label: "設定変更" },
  { value: "admin.payment", label: "決済" },
  { value: "admin.line", label: "LINE" },
  { value: "create_tenant", label: "テナント作成" },
  { value: "platform.", label: "プラットフォーム" },
] as const;

/* ---------- アクションバッジの色分け ---------- */
function getActionBadgeStyle(action: string): string {
  if (action.includes("login") || action.includes("logout")) {
    return "bg-green-50 text-green-700 border border-green-200";
  }
  if (action.includes("patient") || action.includes("intake")) {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  if (action.includes("settings") || action.includes("config") || action.includes("update")) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  if (action.includes("delete") || action.includes("error") || action.includes("fail")) {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  if (action.includes("payment") || action.includes("checkout") || action.includes("order")) {
    return "bg-purple-50 text-purple-700 border border-purple-200";
  }
  if (action.includes("line") || action.includes("message")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (action.includes("tenant") || action.includes("platform")) {
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  }
  return "bg-slate-50 text-slate-600 border border-slate-200";
}

/* ---------- 相対時刻フォーマット ---------- */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay === 1) {
    return `昨日 ${date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDay < 7) return `${diffDay}日前`;
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAbsoluteTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ---------- メインコンポーネント ---------- */
export default function PlatformAuditPage() {
  // データ
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // フィルター
  const [tenantId, setTenantId] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  // 詳細展開
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // テナント一覧を取得（フィルター用）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/platform/tenants?limit=100", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setTenants(
            (data.tenants || []).map((t: Tenant) => ({
              id: t.id,
              name: t.name,
              slug: t.slug,
            })),
          );
        }
      } catch {
        // テナント取得失敗は無視（フィルターが使えないだけ）
      }
    })();
  }, []);

  // 監査ログを取得
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenant_id", tenantId);
      if (action) params.set("action", action);
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(
        `/api/admin/platform/audit?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `取得失敗 (${res.status})`);
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, action, startDate, endDate, search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // フィルタークリア
  const handleClearFilters = () => {
    setTenantId("");
    setAction("");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  // 検索実行（Enter or ボタン）
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  // 行クリックで詳細展開
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // フィルターが設定されているか
  const hasFilters = tenantId || action || startDate || endDate || search;

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">監査ログ</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                全テナントのアクティビティ履歴
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* フィルターバー */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* テナント選択 */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                テナント
              </label>
              <select
                value={tenantId}
                onChange={(e) => {
                  setTenantId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">全テナント</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* アクション種別 */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                アクション種別
              </label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ACTION_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 開始日 */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 終了日 */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                終了日
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 検索バー + クリアボタン */}
          <div className="mt-3 flex gap-2">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="アクション名やリソースIDで検索..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* サマリー */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {pagination.total > 0 ? (
              <>
                全 <span className="font-semibold text-slate-700">{pagination.total.toLocaleString()}</span> 件
                {pagination.totalPages > 1 && (
                  <span className="ml-1">
                    （{pagination.page} / {pagination.totalPages} ページ）
                  </span>
                )}
              </>
            ) : loading ? (
              "読み込み中..."
            ) : (
              "該当するログはありません"
            )}
          </p>
        </div>

        {/* ログテーブル */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">読み込み中...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">ログがありません</p>
              <p className="text-xs mt-1">フィルター条件を変更してください</p>
            </div>
          ) : (
            <>
              {/* テーブルヘッダー */}
              <div className="hidden lg:grid grid-cols-[160px_120px_1fr_160px_160px_120px] gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div>日時</div>
                <div>テナント</div>
                <div>管理者</div>
                <div>アクション</div>
                <div>リソース</div>
                <div>IP</div>
              </div>

              {/* ログ行 */}
              {logs.map((log) => (
                <div key={log.id} className="border-b border-slate-50 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleExpand(log.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* モバイル表示 */}
                    <div className="lg:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getActionBadgeStyle(log.action)}`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-400" title={formatAbsoluteTime(log.created_at)}>
                          {formatRelativeTime(log.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {log.tenants && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {log.tenants.name}
                          </span>
                        )}
                        <span>{log.admin_users?.name || log.admin_name || "-"}</span>
                      </div>
                      {log.resource_type && (
                        <p className="text-xs text-slate-400 font-mono">
                          {log.resource_type}
                          {log.resource_id ? `: ${log.resource_id}` : ""}
                        </p>
                      )}
                    </div>

                    {/* PC表示 */}
                    <div className="hidden lg:grid grid-cols-[160px_120px_1fr_160px_160px_120px] gap-2 items-center">
                      {/* 日時 */}
                      <div
                        className="text-xs text-slate-600"
                        title={formatAbsoluteTime(log.created_at)}
                      >
                        {formatRelativeTime(log.created_at)}
                      </div>

                      {/* テナント */}
                      <div>
                        {log.tenants ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium truncate max-w-[110px]">
                            {log.tenants.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </div>

                      {/* 管理者名 */}
                      <div className="text-sm text-slate-700 truncate">
                        {log.admin_users?.name || log.admin_name || (
                          <span className="text-slate-300">-</span>
                        )}
                      </div>

                      {/* アクション */}
                      <div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getActionBadgeStyle(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </div>

                      {/* リソース */}
                      <div className="text-xs text-slate-500 font-mono truncate">
                        {log.resource_type || "-"}
                        {log.resource_id ? (
                          <span className="text-slate-400">
                            : {log.resource_id.length > 12
                              ? `${log.resource_id.slice(0, 12)}...`
                              : log.resource_id}
                          </span>
                        ) : null}
                      </div>

                      {/* IP */}
                      <div className="text-xs text-slate-400 font-mono">
                        {log.ip_address || "-"}
                      </div>
                    </div>
                  </button>

                  {/* 詳細展開エリア */}
                  {expandedId === log.id && (
                    <div className="px-4 pb-4 transition-all duration-200 ease-in-out">
                      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        {/* メタ情報 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">ログID:</span>{" "}
                            <span className="text-slate-600 font-mono">{log.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">日時:</span>{" "}
                            <span className="text-slate-600">{formatAbsoluteTime(log.created_at)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">管理者ID:</span>{" "}
                            <span className="text-slate-600 font-mono">
                              {log.admin_user_id || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">メール:</span>{" "}
                            <span className="text-slate-600">
                              {log.admin_users?.email || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">IP:</span>{" "}
                            <span className="text-slate-600 font-mono">
                              {log.ip_address || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">リソース:</span>{" "}
                            <span className="text-slate-600 font-mono">
                              {log.resource_type}{log.resource_id ? `: ${log.resource_id}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* User-Agent */}
                        {log.user_agent && (
                          <div className="text-xs">
                            <span className="text-slate-400">User-Agent:</span>
                            <p className="text-slate-500 mt-0.5 break-all">
                              {log.user_agent}
                            </p>
                          </div>
                        )}

                        {/* 詳細（details JSON） */}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">詳細データ:</p>
                            <pre className="bg-slate-100 rounded p-3 text-xs overflow-x-auto text-slate-700 leading-relaxed">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* ページ番号ボタン */}
            {(() => {
              const pages: number[] = [];
              const total = pagination.totalPages;
              const current = page;

              // 最初のページ
              pages.push(1);

              // 省略記号の前後
              if (current > 3) pages.push(-1); // ... を表す
              for (
                let i = Math.max(2, current - 1);
                i <= Math.min(total - 1, current + 1);
                i++
              ) {
                pages.push(i);
              }
              if (current < total - 2) pages.push(-2); // ... を表す

              // 最後のページ
              if (total > 1) pages.push(total);

              return pages.map((p, idx) => {
                if (p < 0) {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-slate-400">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      p === current
                        ? "bg-blue-600 text-white font-medium"
                        : "border border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
