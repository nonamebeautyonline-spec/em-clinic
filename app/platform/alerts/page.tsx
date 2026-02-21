"use client";

// app/platform/alerts/page.tsx
// プラットフォーム管理: セキュリティアラート一覧ページ

import { useState, useEffect, useCallback } from "react";

interface Alert {
  id: string;
  tenant_id: string | null;
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  tenants: { id: string; name: string; slug: string } | null;
}

interface AlertsData {
  alerts: Alert[];
  unacknowledgedCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: "重大", bg: "bg-red-100", text: "text-red-700", border: "border-l-red-500" },
  high: { label: "高", bg: "bg-orange-100", text: "text-orange-700", border: "border-l-orange-500" },
  medium: { label: "中", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-l-yellow-500" },
  low: { label: "低", bg: "bg-zinc-100", text: "text-zinc-600", border: "border-l-zinc-400" },
};

export default function AlertsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "true" | "false">("false"); // デフォルト: 未確認
  const [severityFilter, setSeverityFilter] = useState("");
  const [ackingId, setAckingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        acknowledged: filter,
      });
      if (severityFilter) params.set("severity", severityFilter);

      const res = await fetch(`/api/platform/alerts?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("アラート取得失敗");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [page, filter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    setAckingId(alertId);
    try {
      const res = await fetch(`/api/platform/alerts/${alertId}/ack`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("確認処理に失敗しました");
      // リストを再取得
      await fetchAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setAckingId(null);
    }
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
          <h1 className="text-2xl font-bold text-zinc-900">セキュリティアラート</h1>
          <p className="text-sm text-zinc-500 mt-1">
            セキュリティに関する警告・通知の管理
          </p>
        </div>
        {data && data.unacknowledgedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-700">
              未確認: {data.unacknowledgedCount}件
            </span>
          </div>
        )}
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-3 mb-6">
        {/* 確認状態フィルター */}
        <div className="flex rounded-lg border border-zinc-300 overflow-hidden">
          {([
            { key: "false", label: "未確認" },
            { key: "true", label: "確認済み" },
            { key: "all", label: "すべて" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-amber-600 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 深刻度フィルター */}
        <select
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">全深刻度</option>
          <option value="critical">重大</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* アラートテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data && data.alerts.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      深刻度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      タイトル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      テナント
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      状態
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.alerts.map((alert) => {
                    const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
                    return (
                      <tr
                        key={alert.id}
                        className={`hover:bg-zinc-50 transition-colors ${
                          !alert.acknowledged_at ? `border-l-4 ${sev.border}` : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.text}`}
                          >
                            {sev.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-zinc-900">
                            {alert.title}
                          </div>
                          {alert.description && (
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                              {alert.description}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {alert.tenants?.name || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">
                          {formatDateTime(alert.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          {alert.acknowledged_at ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              確認済み
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              未確認
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!alert.acknowledged_at && (
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={ackingId === alert.id}
                              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                            >
                              {ackingId === alert.id ? "処理中..." : "確認済みにする"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {data.pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  {data.pagination.page} / {data.pagination.totalPages} ページ
                  （{data.pagination.total}件中）
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
            アラートはありません
          </div>
        )}
      </div>
    </div>
  );
}
