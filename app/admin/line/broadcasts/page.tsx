"use client";

import { useState, useEffect } from "react";

interface Broadcast {
  id: number;
  name: string;
  message_content: string;
  status: string;
  total_targets: number;
  sent_count: number;
  failed_count: number;
  no_uid_count: number;
  created_at: string;
  sent_at: string | null;
}

const STATUS_LABELS: Record<string, { text: string; class: string }> = {
  draft: { text: "下書き", class: "bg-gray-100 text-gray-700" },
  scheduled: { text: "予約済み", class: "bg-blue-100 text-blue-700" },
  sending: { text: "送信中", class: "bg-yellow-100 text-yellow-700" },
  sent: { text: "送信完了", class: "bg-green-100 text-green-700" },
  failed: { text: "失敗", class: "bg-red-100 text-red-700" },
};

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/admin/line/broadcast", { credentials: "include" });
      const data = await res.json();
      if (data.broadcasts) setBroadcasts(data.broadcasts);
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">配信履歴</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">配信履歴がありません</div>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((b) => {
            const st = STATUS_LABELS[b.status] || { text: b.status, class: "bg-gray-100" };
            return (
              <div key={b.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{b.name}</h3>
                    <span className="text-xs text-gray-400">{formatDate(b.created_at)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${st.class}`}>{st.text}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{b.message_content}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">対象: <strong>{b.total_targets}</strong>人</span>
                  <span className="text-green-600">送信: <strong>{b.sent_count}</strong></span>
                  <span className="text-red-600">失敗: <strong>{b.failed_count}</strong></span>
                  <span className="text-gray-400">UID無: <strong>{b.no_uid_count}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
