// 設定 > Cron実行履歴セクション
"use client";

import { useState, useEffect, useCallback } from "react";

interface CronLog {
  id: string;
  cron_name: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failed";
  result_summary: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
}

// 既知のCronジョブ名
const CRON_NAMES = [
  { value: "", label: "全て" },
  { value: "send-scheduled", label: "予約送信" },
  { value: "collect-line-stats", label: "LINE統計収集" },
  { value: "generate-invoices", label: "請求書生成" },
  { value: "generate-reminders", label: "リマインダー生成" },
  { value: "process-steps", label: "ステップ配信" },
  { value: "segment-recalculate", label: "セグメント再計算" },
  { value: "followup", label: "フォローアップ" },
  { value: "ai-reply", label: "AI自動返信" },
  { value: "health-report", label: "ヘルスレポート" },
  { value: "report-usage", label: "利用状況レポート" },
  { value: "usage-alert", label: "利用量アラート" },
  { value: "usage-check", label: "利用量チェック" },
  { value: "audit-archive", label: "監査ログアーカイブ" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全て" },
  { value: "running", label: "実行中" },
  { value: "success", label: "成功" },
  { value: "failed", label: "失敗" },
];

function StatusBadge({ status }: { status: CronLog["status"] }) {
  const styles: Record<string, string> = {
    running: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    running: "実行中",
    success: "成功",
    failed: "失敗",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getCronLabel(name: string): string {
  const found = CRON_NAMES.find((c) => c.value === name);
  return found ? found.label : name;
}

interface CronSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function CronSection({ onToast }: CronSectionProps) {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cronNameFilter, setCronNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      if (cronNameFilter) params.set("cron_name", cronNameFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/cron-logs?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`取得失敗 (${res.status})`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Cron履歴の取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [page, cronNameFilter, statusFilter, onToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // フィルタ変更時はページをリセット
  const handleCronNameChange = (value: string) => {
    setCronNameFilter(value);
    setPage(0);
  };
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Cron実行履歴</h2>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            更新
          </button>
        </div>
        <p className="text-sm text-gray-500">定期実行ジョブの実行履歴を確認できます</p>
      </div>

      {/* フィルタ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Cron名</label>
            <select
              value={cronNameFilter}
              onChange={(e) => handleCronNameChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {CRON_NAMES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 一覧 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500">読み込み中...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            実行履歴がありません
          </div>
        ) : (
          <>
            {/* テーブルヘッダー */}
            <div className="hidden md:grid grid-cols-[1fr_140px_140px_80px_80px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase">
              <div>Cron名</div>
              <div>開始</div>
              <div>終了</div>
              <div>所要時間</div>
              <div>状態</div>
            </div>

            {/* ログ行 */}
            {logs.map((log) => (
              <div key={log.id} className="border-b border-gray-50 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* PC表示 */}
                  <div className="hidden md:grid grid-cols-[1fr_140px_140px_80px_80px] gap-2 items-center">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {getCronLabel(log.cron_name)}
                      <span className="ml-2 text-xs text-gray-400 font-mono">{log.cron_name}</span>
                    </div>
                    <div className="text-xs text-gray-600">{formatDateTime(log.started_at)}</div>
                    <div className="text-xs text-gray-600">{formatDateTime(log.finished_at)}</div>
                    <div className="text-xs text-gray-600 font-mono">{formatDuration(log.duration_ms)}</div>
                    <div><StatusBadge status={log.status} /></div>
                  </div>

                  {/* モバイル表示 */}
                  <div className="md:hidden space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{getCronLabel(log.cron_name)}</span>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDateTime(log.started_at)}</span>
                      <span>{formatDuration(log.duration_ms)}</span>
                    </div>
                  </div>
                </button>

                {/* 展開詳細 */}
                {expandedId === log.id && (
                  <div className="px-4 pb-3 space-y-2">
                    {log.error_message && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-medium text-red-700 mb-1">エラー</p>
                        <p className="text-sm text-red-600 font-mono whitespace-pre-wrap">{log.error_message}</p>
                      </div>
                    )}
                    {log.result_summary && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 mb-1">結果サマリー</p>
                        <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(log.result_summary, null, 2)}
                        </pre>
                      </div>
                    )}
                    {!log.error_message && !log.result_summary && (
                      <p className="text-xs text-gray-400 py-2">詳細情報はありません</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  全{total}件中 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)}件
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    前へ
                  </button>
                  <span className="px-2 text-xs text-gray-500">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
