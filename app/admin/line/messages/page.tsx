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

const STATUS_CONFIG: Record<string, { text: string; bg: string; textColor: string; dot: string }> = {
  sent: { text: "送信済み", bg: "bg-emerald-50", textColor: "text-emerald-700", dot: "bg-emerald-500" },
  failed: { text: "失敗", bg: "bg-red-50", textColor: "text-red-700", dot: "bg-red-500" },
  no_uid: { text: "UID無し", bg: "bg-gray-100", textColor: "text-gray-600", dot: "bg-gray-400" },
  scheduled: { text: "予約中", bg: "bg-blue-50", textColor: "text-blue-700", dot: "bg-blue-500" },
  canceled: { text: "キャンセル", bg: "bg-amber-50", textColor: "text-amber-700", dot: "bg-amber-500" },
};

const TYPE_CONFIG: Record<string, { text: string; icon: string }> = {
  individual: { text: "個別", icon: "👤" },
  broadcast: { text: "一斉", icon: "📣" },
  reminder: { text: "リマインド", icon: "🔔" },
  scheduled: { text: "予約送信", icon: "⏰" },
  segment: { text: "セグメント", icon: "🎯" },
  step: { text: "ステップ", icon: "📋" },
};

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              送信履歴
            </h1>
            <p className="text-sm text-gray-400 mt-1">全メッセージの送信ログを時系列で確認</p>
          </div>

          {/* フィルタバー */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => { setFilterType(""); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filterType ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                全て
              </button>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setFilterType(key); setPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterType === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {cfg.text}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">全 {total.toLocaleString()} 件</span>
            </div>
          </div>
        </div>
      </div>

      {/* メッセージリスト */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">送信履歴がありません</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">日時</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">種別</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">患者ID</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">内容</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {messages.map((m) => {
                      const st = STATUS_CONFIG[m.status] || { text: m.status, bg: "bg-gray-100", textColor: "text-gray-600", dot: "bg-gray-400" };
                      const tp = TYPE_CONFIG[m.message_type] || { text: m.message_type, icon: "💬" };
                      const isExpanded = expandedId === m.id;
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        >
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(m.sent_at)}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <span className="text-[11px]">{tp.icon}</span>
                              {tp.text}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{m.patient_id || "—"}</td>
                          <td className="px-5 py-3 max-w-xs">
                            <p className={`text-gray-600 text-xs leading-relaxed ${isExpanded ? "whitespace-pre-wrap" : "truncate"}`}>
                              {m.content}
                            </p>
                            {isExpanded && m.error_message && (
                              <p className="text-xs text-red-500 mt-1 bg-red-50 rounded px-2 py-1">{m.error_message}</p>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium ${st.bg} ${st.textColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-1 px-3">
                  <span className="text-sm font-medium text-gray-900">{page + 1}</span>
                  <span className="text-sm text-gray-400">/</span>
                  <span className="text-sm text-gray-400">{totalPages}</span>
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={(page + 1) * limit >= total}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
