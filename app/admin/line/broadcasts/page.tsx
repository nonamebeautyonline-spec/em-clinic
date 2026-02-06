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

const STATUS_CONFIG: Record<string, { text: string; bg: string; text_color: string; dot: string }> = {
  draft: { text: "下書き", bg: "bg-gray-50", text_color: "text-gray-600", dot: "bg-gray-400" },
  scheduled: { text: "予約済み", bg: "bg-blue-50", text_color: "text-blue-700", dot: "bg-blue-500" },
  sending: { text: "送信中", bg: "bg-amber-50", text_color: "text-amber-700", dot: "bg-amber-500 animate-pulse" },
  sent: { text: "送信完了", bg: "bg-emerald-50", text_color: "text-emerald-700", dot: "bg-emerald-500" },
  failed: { text: "失敗", bg: "bg-red-50", text_color: "text-red-700", dot: "bg-red-500" },
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

  const getSuccessRate = (b: Broadcast) => {
    if (b.total_targets === 0) return 0;
    return Math.round((b.sent_count / b.total_targets) * 100);
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                配信履歴
              </h1>
              <p className="text-sm text-gray-400 mt-1">一斉配信の送信結果を確認</p>
            </div>
          </div>

          {/* サマリー */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-3 border border-gray-100/50 text-center">
              <div className="text-xl font-bold text-gray-700">{broadcasts.length}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">総配信数</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100/50 text-center">
              <div className="text-xl font-bold text-emerald-700">{broadcasts.filter(b => b.status === "sent").length}</div>
              <div className="text-[10px] text-emerald-500 mt-0.5">送信完了</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100/50 text-center">
              <div className="text-xl font-bold text-blue-700">{broadcasts.filter(b => b.status === "scheduled").length}</div>
              <div className="text-[10px] text-blue-500 mt-0.5">予約中</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 border border-red-100/50 text-center">
              <div className="text-xl font-bold text-red-700">{broadcasts.filter(b => b.status === "failed").length}</div>
              <div className="text-[10px] text-red-500 mt-0.5">失敗</div>
            </div>
          </div>
        </div>
      </div>

      {/* 配信リスト */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">配信履歴がまだありません</p>
            <p className="text-gray-300 text-xs mt-1">メッセージ送信ページから一斉配信を実行してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((b) => {
              const st = STATUS_CONFIG[b.status] || { text: b.status, bg: "bg-gray-50", text_color: "text-gray-600", dot: "bg-gray-400" };
              const rate = getSuccessRate(b);
              return (
                <div key={b.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">
                  <div className="p-5">
                    {/* 上段: 名前 + ステータス */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-[15px] truncate">{b.name || "無題の配信"}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-400">{formatDate(b.created_at)}</span>
                          {b.sent_at && (
                            <>
                              <span className="text-xs text-gray-300">→</span>
                              <span className="text-xs text-gray-400">送信: {formatDate(b.sent_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${st.bg} ${st.text_color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.text}
                      </span>
                    </div>

                    {/* メッセージプレビュー */}
                    <div className="bg-gray-50 rounded-lg px-3.5 py-2.5 mb-4">
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{b.message_content}</p>
                    </div>

                    {/* 送信結果バー */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">送信結果</span>
                        <span className="font-semibold text-gray-700">{rate}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        {b.sent_count > 0 && (
                          <div
                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full"
                            style={{ width: `${(b.sent_count / b.total_targets) * 100}%` }}
                          />
                        )}
                        {b.failed_count > 0 && (
                          <div
                            className="bg-gradient-to-r from-red-400 to-red-500 h-full"
                            style={{ width: `${(b.failed_count / b.total_targets) * 100}%` }}
                          />
                        )}
                        {b.no_uid_count > 0 && (
                          <div
                            className="bg-gray-300 h-full"
                            style={{ width: `${(b.no_uid_count / b.total_targets) * 100}%` }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-gray-500">送信</span>
                          <span className="font-semibold text-gray-700">{b.sent_count}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-gray-500">失敗</span>
                          <span className="font-semibold text-gray-700">{b.failed_count}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-gray-300" />
                          <span className="text-gray-500">UID無</span>
                          <span className="font-semibold text-gray-700">{b.no_uid_count}</span>
                        </span>
                        <span className="ml-auto text-gray-400">
                          対象: <span className="font-semibold text-gray-600">{b.total_targets}人</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
