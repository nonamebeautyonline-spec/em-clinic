"use client";

import { useState, useEffect, useCallback } from "react";

interface StatusData {
  status: string;
  services: Record<string, string>;
  incidents: {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    started_at: string;
    resolved_at: string | null;
  }[];
  timestamp: string;
}

// ステータスに応じた色
function statusColor(status: string): string {
  switch (status) {
    case "healthy":
      return "bg-green-500";
    case "degraded":
      return "bg-yellow-500";
    case "unhealthy":
      return "bg-red-500";
    case "unconfigured":
      return "bg-slate-400";
    default:
      return "bg-slate-400";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "healthy":
      return "正常";
    case "degraded":
      return "低下";
    case "unhealthy":
      return "障害";
    case "unconfigured":
      return "未設定";
    default:
      return "不明";
  }
}

function severityBadge(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "major":
      return "bg-orange-100 text-orange-800";
    case "minor":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function incidentStatusLabel(status: string): string {
  switch (status) {
    case "investigating":
      return "調査中";
    case "identified":
      return "原因特定";
    case "monitoring":
      return "監視中";
    case "resolved":
      return "解決済み";
    default:
      return status;
  }
}

const SERVICE_LABELS: Record<string, string> = {
  database: "データベース",
  cache: "キャッシュ",
  api: "APIサーバー",
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("データ取得失敗");
      setData(await res.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // 60秒間隔で自動更新
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overallBg =
    data?.status === "healthy"
      ? "bg-green-50 border-green-200"
      : data?.status === "degraded"
        ? "bg-yellow-50 border-yellow-200"
        : "bg-red-50 border-red-200";

  const overallText =
    data?.status === "healthy"
      ? "text-green-800"
      : data?.status === "degraded"
        ? "text-yellow-800"
        : "text-red-800";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">
            L<span className="text-blue-600">オペ</span> for CLINIC サービスステータス
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            リアルタイムのサービス稼働状況
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading && !data && (
          <div className="text-center py-12 text-slate-400">読み込み中...</div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* 全体ステータス */}
            <div className={`rounded-lg border p-6 mb-8 ${overallBg}`}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${statusColor(data.status)}`} />
                <span className={`text-lg font-bold ${overallText}`}>
                  {data.status === "healthy"
                    ? "すべてのシステムが正常に稼働しています"
                    : data.status === "degraded"
                      ? "一部のシステムでパフォーマンスが低下しています"
                      : "システム障害が発生しています"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                最終更新: {new Date(data.timestamp).toLocaleString("ja-JP")}
              </p>
            </div>

            {/* サービス別ステータス */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">サービス稼働状態</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(data.services).map(([key, status]) => (
                  <div key={key} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusColor(status)}`} />
                      <span className="text-sm font-medium text-slate-900">
                        {SERVICE_LABELS[key] || key}
                      </span>
                    </div>
                    <span className="text-sm text-slate-600">{statusLabel(status)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* インシデント履歴 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">過去30日のインシデント</h2>
              </div>
              {data.incidents.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                  過去30日間にインシデントはありません
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.incidents.map((incident) => (
                    <div key={incident.id} className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {incidentStatusLabel(incident.status)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{incident.title}</h3>
                      {incident.description && (
                        <p className="text-xs text-slate-600 mt-1">{incident.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>発生: {new Date(incident.started_at).toLocaleString("ja-JP")}</span>
                        {incident.resolved_at && (
                          <span>解決: {new Date(incident.resolved_at).toLocaleString("ja-JP")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
          Lオペ for CLINIC &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
