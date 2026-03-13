"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

interface WebhookEvent {
  id: number;
  event_source: string;
  event_id: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  last_retried_at: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Summary {
  total: number;
  failed: number;
  completed: number;
  processing: number;
}

const STATUS_COLORS: Record<string, string> = {
  failed: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  processing: "bg-yellow-100 text-yellow-800",
};

const SOURCE_LABELS: Record<string, string> = {
  square: "Square",
  gmo: "GMO",
  stripe: "Stripe",
  send_reminder: "リマインダー",
};

interface WebhookEventsResponse {
  events: WebhookEvent[];
  total: number;
  summary: Summary;
}

export default function WebhookEventsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [replayingId, setReplayingId] = useState<number | null>(null);

  // SWRキーをフィルタ・ページに応じて動的に構築
  const swrKey = (() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (statusFilter) params.set("status", statusFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    return `/api/admin/webhook-events?${params}`;
  })();

  const { data: responseData, isLoading: loading } = useSWR<WebhookEventsResponse>(swrKey);
  const events = responseData?.events || [];
  const total = responseData?.total || 0;
  const summary = responseData?.summary || { total: 0, failed: 0, completed: 0, processing: 0 };

  const handleReplay = async (eventId: number) => {
    if (!confirm("このイベントをリプレイしますか？\n外部APIの状態が変わっている可能性があります。")) return;

    setReplayingId(eventId);
    try {
      const res = await fetch(`/api/admin/webhook-events/${eventId}/replay`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        alert("リプレイ成功");
      } else {
        alert(`リプレイ失敗: ${data.error}`);
      }
      await mutate(swrKey);
    } catch (err) {
      alert("リプレイエラー");
    } finally {
      setReplayingId(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    } catch {
      return iso;
    }
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Webhook イベント管理</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">合計</div>
          <div className="text-2xl font-bold">{summary.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-500">失敗</div>
          <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-500">完了</div>
          <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-500">処理中</div>
          <div className="text-2xl font-bold text-yellow-600">{summary.processing}</div>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2"
        >
          <option value="">全ステータス</option>
          <option value="failed">失敗</option>
          <option value="completed">完了</option>
          <option value="processing">処理中</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2"
        >
          <option value="">全ソース</option>
          <option value="square">Square</option>
          <option value="gmo">GMO</option>
          <option value="stripe">Stripe</option>
          <option value="send_reminder">リマインダー</option>
        </select>
        <button
          onClick={() => mutate(swrKey)}
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded"
        >
          更新
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">ソース</th>
              <th className="px-4 py-3 text-left">イベントID</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-left">エラー</th>
              <th className="px-4 py-3 text-left">リトライ</th>
              <th className="px-4 py-3 text-left">作成日時</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  読み込み中...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  イベントがありません
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{ev.id}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                      {SOURCE_LABELS[ev.event_source] || ev.event_source}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={ev.event_id}>
                    {ev.event_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[ev.status] || "bg-gray-100"}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate" title={ev.error_message || ""}>
                    {ev.error_message || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {ev.retry_count > 0 ? (
                      <span>
                        {ev.retry_count}回
                        {ev.last_retried_at && (
                          <span className="text-gray-400 ml-1">
                            ({formatDate(ev.last_retried_at)})
                          </span>
                        )}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(ev.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {ev.status === "failed" && (
                      <button
                        onClick={() => handleReplay(ev.id)}
                        disabled={replayingId === ev.id}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                      >
                        {replayingId === ev.id ? "実行中..." : "リプレイ"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            前へ
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
