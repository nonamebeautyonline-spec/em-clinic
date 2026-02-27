"use client";

// app/platform/usage/page.tsx
// プラットフォーム管理: テナント使用量ダッシュボード
// テナントごとのメッセージ数/quota、ストレージ使用量、AI呼出数をプログレスバーで視覚化

import { useState, useEffect, useCallback } from "react";

// --- 型定義 ---

interface TenantUsage {
  tenantId: string;
  tenantName: string;
  slug: string;
  isActive: boolean;
  messageCount: number;
  messageQuota: number;
  percentUsed: number;
  remaining: number;
  overageCount: number;
  storageMb: number;
  storageQuotaMb: number;
  storagePercent: number;
  apiCallCount: number;
  alertLevel: "normal" | "caution" | "warning" | "limit";
  alertLabel: string;
  month: string;
}

interface UsageSummary {
  totalTenants: number;
  cautionCount: number;
  warningCount: number;
  limitCount: number;
  totalMessages: number;
  totalStorageMb: number;
}

type AlertFilter = "all" | "normal" | "caution" | "warning" | "limit";

// --- 定数 ---

const ALERT_BADGE_STYLES: Record<string, string> = {
  normal: "bg-green-100 text-green-700 border-green-200",
  caution: "bg-yellow-100 text-yellow-700 border-yellow-200",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  limit: "bg-red-100 text-red-700 border-red-200",
};

const ALERT_PROGRESS_STYLES: Record<string, string> = {
  normal: "bg-green-500",
  caution: "bg-yellow-500",
  warning: "bg-orange-500",
  limit: "bg-red-500",
};

const ALERT_FILTERS: { key: AlertFilter; label: string }[] = [
  { key: "all", label: "全て" },
  { key: "limit", label: "制限" },
  { key: "warning", label: "警告" },
  { key: "caution", label: "注意" },
  { key: "normal", label: "正常" },
];

export default function UsageDashboardPage() {
  const [tenants, setTenants] = useState<TenantUsage[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // データ取得
  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/usage", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "使用量データの取得に失敗しました");
      }
      const data = await res.json();
      setTenants(data.tenants || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // フィルタリング
  const filteredTenants = tenants.filter((t) => {
    if (filter !== "all" && t.alertLevel !== filter) return false;
    if (
      debouncedSearch &&
      !t.tenantName.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
      !t.slug.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // プログレスバーコンポーネント
  const ProgressBar = ({
    percent,
    alertLevel,
    label,
  }: {
    percent: number;
    alertLevel: string;
    label: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs font-medium text-zinc-700">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${ALERT_PROGRESS_STYLES[alertLevel] || "bg-green-500"}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            使用量モニタリング
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            テナントごとのメッセージ送信数・ストレージ・API呼出数のリアルタイム監視
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* サマリーカード */}
        {summary && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">テナント数</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary.totalTenants}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">総メッセージ数</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary.totalMessages.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">総ストレージ</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary.totalStorageMb}
                <span className="text-sm font-normal text-slate-400 ml-1">
                  MB
                </span>
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-4 border-l-4 border-l-yellow-400">
              <p className="text-xs text-yellow-600 mb-1">注意</p>
              <p className="text-2xl font-bold text-yellow-700">
                {summary.cautionCount}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4 border-l-4 border-l-orange-400">
              <p className="text-xs text-orange-600 mb-1">警告</p>
              <p className="text-2xl font-bold text-orange-700">
                {summary.warningCount}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 border-l-4 border-l-red-400">
              <p className="text-xs text-red-600 mb-1">制限</p>
              <p className="text-2xl font-bold text-red-700">
                {summary.limitCount}
              </p>
            </div>
          </div>
        )}

        {/* 検索・フィルターバー */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 検索 */}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="テナント名またはslugで検索..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 更新ボタン */}
            <button
              onClick={fetchUsage}
              disabled={loading}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {loading ? "更新中..." : "更新"}
            </button>
          </div>

          {/* アラートフィルタータブ */}
          <div className="flex gap-1 mt-4 border-t border-slate-100 pt-4">
            {ALERT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === f.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
                {f.key !== "all" && summary && (
                  <span className="ml-1.5 text-xs opacity-75">
                    (
                    {f.key === "normal"
                      ? summary.totalTenants -
                        summary.cautionCount -
                        summary.warningCount -
                        summary.limitCount
                      : f.key === "caution"
                        ? summary.cautionCount
                        : f.key === "warning"
                          ? summary.warningCount
                          : summary.limitCount}
                    )
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ローディングスケルトン */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded w-1/4 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/6 mb-4" />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                        <div className="h-2 bg-slate-200 rounded" />
                      </div>
                      <div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                        <div className="h-2 bg-slate-200 rounded" />
                      </div>
                      <div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                        <div className="h-5 bg-slate-200 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              {debouncedSearch || filter !== "all"
                ? "条件に一致するテナントがありません"
                : "使用量データがありません"}
            </h3>
            <p className="text-sm text-slate-500">
              {debouncedSearch || filter !== "all"
                ? "検索条件やフィルターを変更してください"
                : "アクティブなテナントが登録されていません"}
            </p>
          </div>
        ) : (
          <>
            {/* 件数表示 */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {filteredTenants.length}件のテナントを表示中
                {filter !== "all" && ` (${ALERT_FILTERS.find((f) => f.key === filter)?.label}のみ)`}
              </p>
              <p className="text-xs text-slate-400">
                対象月: {filteredTenants[0]?.month || "-"}
              </p>
            </div>

            {/* テナント使用量カード一覧 */}
            <div className="space-y-4">
              {filteredTenants.map((tenant) => (
                <div
                  key={tenant.tenantId}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* ヘッダー行 */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {tenant.tenantName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {tenant.slug}.lope.jp
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ALERT_BADGE_STYLES[tenant.alertLevel]}`}
                    >
                      {tenant.alertLabel}
                    </span>
                  </div>

                  {/* メトリクスグリッド */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* メッセージ使用量 */}
                    <div>
                      <ProgressBar
                        percent={tenant.percentUsed}
                        alertLevel={tenant.alertLevel}
                        label="メッセージ"
                      />
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-900">
                          {tenant.messageCount.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">
                          / {tenant.messageQuota.toLocaleString()} 通
                        </span>
                      </div>
                      {tenant.overageCount > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          超過: {tenant.overageCount.toLocaleString()} 通
                        </p>
                      )}
                    </div>

                    {/* ストレージ使用量 */}
                    <div>
                      <ProgressBar
                        percent={tenant.storagePercent}
                        alertLevel={
                          tenant.storagePercent >= 90
                            ? "limit"
                            : tenant.storagePercent >= 70
                              ? "warning"
                              : "normal"
                        }
                        label="ストレージ"
                      />
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-900">
                          {tenant.storageMb}
                        </span>
                        <span className="text-xs text-slate-400">
                          / {tenant.storageQuotaMb} MB
                        </span>
                      </div>
                    </div>

                    {/* API呼出数 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-500">
                          API呼出数
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-900">
                          {tenant.apiCallCount.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">回</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">当月累計</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
