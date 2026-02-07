"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DailyStats {
  date: string;
  followers: number;
  targetedReaches: number;
  blocks: number;
}

interface RecentMessage {
  id: number;
  patient_id: string;
  patient_name: string;
  message_type: string;
  content: string;
  status: string;
  sent_at: string;
}

interface DashboardData {
  stats: { followers: number; targetedReaches: number; blocks: number };
  monthlySent: number;
  dailyStats: DailyStats[];
  recentMessages: RecentMessage[];
}

const TYPE_CONFIG: Record<string, { text: string; icon: string }> = {
  individual: { text: "個別", icon: "👤" },
  broadcast: { text: "一斉", icon: "📣" },
  reminder: { text: "リマインド", icon: "🔔" },
  scheduled: { text: "予約送信", icon: "⏰" },
  segment: { text: "セグメント", icon: "🎯" },
  step: { text: "ステップ", icon: "📋" },
};

const STATUS_CONFIG: Record<string, { text: string; bg: string; textColor: string; dot: string }> = {
  sent: { text: "送信済み", bg: "bg-emerald-50", textColor: "text-emerald-700", dot: "bg-emerald-500" },
  failed: { text: "失敗", bg: "bg-red-50", textColor: "text-red-700", dot: "bg-red-500" },
  no_uid: { text: "UID無し", bg: "bg-gray-100", textColor: "text-gray-600", dot: "bg-gray-400" },
  scheduled: { text: "予約中", bg: "bg-blue-50", textColor: "text-blue-700", dot: "bg-blue-500" },
  canceled: { text: "キャンセル", bg: "bg-amber-50", textColor: "text-amber-700", dot: "bg-amber-500" },
};

export default function LineDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/line/dashboard", { credentials: "include" });
        const json = await res.json();
        setData(json);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDateShort = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}（${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]}）`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400 text-sm">データの取得に失敗しました</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">LINE公式アカウントの概況</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 有効友だち数 */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">有効友だち数</p>
              <p className="text-3xl font-bold mt-1">{data.stats.followers.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
          </div>
        </div>

        {/* ターゲットリーチ */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">ターゲットリーチ</p>
              <p className="text-3xl font-bold mt-1">{data.stats.targetedReaches.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
          </div>
        </div>

        {/* ブロック */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-rose-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-rose-100 text-xs font-medium uppercase tracking-wider">ブロック</p>
              <p className="text-3xl font-bold mt-1">{data.stats.blocks.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>
            </div>
          </div>
        </div>

        {/* 今月の配信数 */}
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-violet-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">今月の配信数</p>
              <p className="text-3xl font-bold mt-1">{data.monthlySent.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* 下段: 友だち数推移 + 最新メッセージ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 友だち数推移 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">友だち数推移</h2>
            <p className="text-xs text-gray-400 mt-0.5">過去7日間の推移</p>
          </div>
          {data.dailyStats.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">統計データがありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">日付</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">有効友だち</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">増減</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">ブロック</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.dailyStats.map((day, i) => {
                    const prev = data.dailyStats[i + 1];
                    const diff = prev ? day.followers - prev.followers : null;
                    return (
                      <tr key={day.date} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{formatDateShort(day.date)}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">{day.followers.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          {diff !== null ? (
                            <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                              {diff > 0 ? `+${diff}` : diff === 0 ? "±0" : String(diff)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">{day.blocks.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 最新送信メッセージ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">最新送信メッセージ</h2>
              <p className="text-xs text-gray-400 mt-0.5">直近の送信履歴</p>
            </div>
            <Link
              href="/admin/line/messages"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              すべて見る →
            </Link>
          </div>
          {data.recentMessages.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">送信履歴がありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recentMessages.map((msg) => {
                const tp = TYPE_CONFIG[msg.message_type] || { text: msg.message_type, icon: "💬" };
                const st = STATUS_CONFIG[msg.status] || { text: msg.status, bg: "bg-gray-100", textColor: "text-gray-600", dot: "bg-gray-400" };
                return (
                  <div key={msg.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-gray-500">{tp.icon} {tp.text}</span>
                          <span className="text-[11px] text-gray-400">{formatDate(msg.sent_at)}</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${st.bg} ${st.textColor}`}>
                            <span className={`w-1 h-1 rounded-full ${st.dot}`} />
                            {st.text}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-700 mb-0.5">{msg.patient_name}</p>
                        <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
