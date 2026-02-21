"use client";

// app/platform/errors/page.tsx
// プラットフォーム管理: エラーログダッシュボード

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ErrorLog {
  id: string;
  tenant_id: string | null;
  admin_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  tenants: { id: string; name: string; slug: string } | null;
}

interface DailyCount {
  date: string;
  count: number;
}

interface TenantDist {
  tenantId: string;
  tenantName: string;
  count: number;
}

interface ErrorData {
  errors: ErrorLog[];
  dailyCounts: DailyCount[];
  tenantDistribution: TenantDist[];
  total: number;
  pagination: { page: number; limit: number; totalPages: number };
}

export default function ErrorsDashboardPage() {
  const [data, setData] = useState<ErrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tenantFilter, setTenantFilter] = useState("");

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days: String(days),
        page: String(page),
        limit: "50",
      });
      if (tenantFilter) params.set("tenant_id", tenantFilter);

      const res = await fetch(`/api/platform/errors?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("エラーログ取得失敗");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [days, page, tenantFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">エラーログ</h1>
          <p className="text-sm text-zinc-500 mt-1">
            システム全体のエラーと障害をモニタリング
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* テナントフィルター */}
          {data && data.tenantDistribution.length > 0 && (
            <select
              value={tenantFilter}
              onChange={(e) => {
                setTenantFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">全テナント</option>
              {data.tenantDistribution.map((t) => (
                <option key={t.tenantId} value={t.tenantId}>
                  {t.tenantName} ({t.count}件)
                </option>
              ))}
            </select>
          )}
          {/* 期間選択 */}
          <div className="flex rounded-lg border border-zinc-300 overflow-hidden">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDays(d);
                  setPage(1);
                }}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  days === d
                    ? "bg-amber-600 text-white"
                    : "bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 日別エラー件数グラフ */}
      {data && data.dailyCounts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">日別エラー件数</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                />
                <Tooltip
                  labelFormatter={(label) => `${label}`}
                  formatter={(value) => [`${value ?? 0}件`, "エラー数"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e4e4e7",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* テナント別エラー分布 */}
      {data && data.tenantDistribution.length > 0 && !tenantFilter && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">テナント別エラー分布</h2>
          <div className="space-y-3">
            {data.tenantDistribution.slice(0, 10).map((t) => {
              const maxCount = data.tenantDistribution[0]?.count || 1;
              const barWidth = Math.max((t.count / maxCount) * 100, 3);
              return (
                <div key={t.tenantId} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-700 w-32 truncate font-medium">
                    {t.tenantName}
                  </span>
                  <div className="flex-1 bg-zinc-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-600 w-16 text-right font-medium">
                    {t.count}件
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* エラーログテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            エラーログ一覧
            {data && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({data.total}件)
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data && data.errors.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      テナント
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      アクション
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      リソース
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.errors.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === log.id ? null : log.id)
                          }
                          className="text-sm text-zinc-700 hover:text-amber-600 transition-colors text-left"
                        >
                          {formatDateTime(log.created_at)}
                          {log.details && (
                            <span className="ml-1 text-xs text-zinc-400">
                              {expandedId === log.id ? "[-]" : "[+]"}
                            </span>
                          )}
                        </button>
                        {expandedId === log.id && log.details && (
                          <pre className="mt-2 p-3 bg-zinc-50 rounded text-xs text-zinc-600 max-w-md overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {log.tenants?.name || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 font-mono">
                        {log.resource_type}
                        {log.resource_id && ` / ${log.resource_id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                        {log.ip_address || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {data.pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  {data.pagination.page} / {data.pagination.totalPages} ページ
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                    }
                    disabled={page === data.pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-10 text-center text-sm text-zinc-400">
            エラーログはありません
          </div>
        )}
      </div>
    </div>
  );
}
