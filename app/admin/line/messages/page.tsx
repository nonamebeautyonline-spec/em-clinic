"use client";

import { useState, useEffect } from "react";

interface MessageLog {
  id: number;
  patient_id: string;
  line_uid: string | null;
  message_type: string;
  content: string;
  status: string;
  campaign_id: number | null;
  error_message: string | null;
  sent_at: string;
}

const STATUS_LABELS: Record<string, { text: string; class: string }> = {
  sent: { text: "送信済み", class: "bg-green-100 text-green-700" },
  failed: { text: "失敗", class: "bg-red-100 text-red-700" },
  no_uid: { text: "UID無し", class: "bg-gray-100 text-gray-700" },
  scheduled: { text: "予約中", class: "bg-blue-100 text-blue-700" },
  canceled: { text: "キャンセル", class: "bg-yellow-100 text-yellow-700" },
};

const TYPE_LABELS: Record<string, string> = {
  individual: "個別",
  broadcast: "一斉",
  reminder: "リマインド",
  scheduled: "予約送信",
  segment: "セグメント",
  step: "ステップ",
};

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchMessages = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(page * limit));
    if (filterType) params.set("type", filterType);

    const res = await fetch(`/api/admin/messages/log?${params}`, { credentials: "include" });
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
    if (data.total !== undefined) setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, [page, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">送信履歴</h1>

      {/* フィルタ */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
          className="px-3 py-1.5 border rounded text-sm"
        >
          <option value="">種別: 全て</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">全 {total} 件</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-gray-400">送信履歴がありません</div>
      ) : (
        <>
          <div className="bg-white border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">日時</th>
                  <th className="px-4 py-3 text-left">種別</th>
                  <th className="px-4 py-3 text-left">患者ID</th>
                  <th className="px-4 py-3 text-left">内容</th>
                  <th className="px-4 py-3 text-left">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => {
                  const st = STATUS_LABELS[m.status] || { text: m.status, class: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(m.sent_at)}</td>
                      <td className="px-4 py-2">{TYPE_LABELS[m.message_type] || m.message_type}</td>
                      <td className="px-4 py-2 font-mono text-xs">{m.patient_id || "-"}</td>
                      <td className="px-4 py-2 max-w-xs truncate text-gray-600">{m.content}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${st.class}`}>{st.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {total > limit && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                前
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">
                {page + 1} / {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                次
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
