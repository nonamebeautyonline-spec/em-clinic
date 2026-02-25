"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ComposedChart, LineChart, BarChart, AreaChart,
  Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

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

interface ChartData {
  period: number;
  followerTrend: { date: string; followers: number; diff: number }[];
  deliveryStats: { date: string; sent: number }[];
  clickStats: { date: string; clicks: number; uniqueClicks: number }[];
  blockStats: { date: string; blocks: number; followers: number; blockRate: number }[];
}

interface BroadcastStat {
  id: number;
  name: string;
  status: string;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  noUidCount: number;
  deliveryRate: number;
  totalClicks: number;
  uniqueClicks: number;
  clickRate: number;
  sentAt: string;
}

interface DashboardData {
  stats: { followers: number; targetedReaches: number; blocks: number };
  monthlySent: number;
  dailyStats: DailyStats[];
  recentMessages: RecentMessage[];
  chartData?: ChartData;
  broadcastStats?: BroadcastStat[];
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

const PERIOD_OPTIONS = [
  { value: 7, label: "7日" },
  { value: 30, label: "30日" },
  { value: 90, label: "90日" },
];

// 日付フォーマット: "2026-02-15" → "2/15"
function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface TestAccount {
  patient_id: string;
  patient_name: string;
  has_line_uid: boolean;
}

export default function LineDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [activeTab, setActiveTab] = useState<"charts" | "table" | "broadcasts">("charts");

  // テスト送信設定（複数アカウント対応）
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [testPid, setTestPid] = useState("");
  const [testSaving, setTestSaving] = useState(false);
  const [testError, setTestError] = useState("");

  // テスト送信アカウント読み込み
  const fetchTestAccounts = async () => {
    try {
      const res = await fetch("/api/admin/line/test-account", { credentials: "include" });
      const json = await res.json();
      if (json.accounts && json.accounts.length > 0) {
        setTestAccounts(json.accounts);
      } else if (json.patient_id) {
        // 後方互換
        setTestAccounts([{ patient_id: json.patient_id, patient_name: json.patient_name, has_line_uid: json.has_line_uid }]);
      } else {
        setTestAccounts([]);
      }
    } catch { /* ignore */ }
  };

  // テスト送信アカウント追加
  const handleAddTestAccount = async () => {
    if (!testPid.trim() || testSaving) return;
    setTestSaving(true);
    setTestError("");
    try {
      const res = await fetch("/api/admin/line/test-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: testPid.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.account) {
        setTestAccounts(prev => [...prev, json.account]);
        setTestPid("");
      } else {
        setTestError(json.error || "設定に失敗しました");
      }
    } catch {
      setTestError("設定に失敗しました");
    } finally {
      setTestSaving(false);
    }
  };

  // テスト送信アカウント解除
  const handleRemoveTestAccount = async (patientId: string) => {
    await fetch("/api/admin/line/test-account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ patient_id: patientId }),
    });
    setTestAccounts(prev => prev.filter(a => a.patient_id !== patientId));
  };

  useEffect(() => {
    fetchTestAccounts();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/line/dashboard?period=${period}`, { credentials: "include" });
        const json = await res.json();
        setData(json);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDateShort = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}（${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]}）`;
  };

  if (loading && !data) {
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

      {/* タブ切替 + 期間選択 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: "charts" as const, label: "グラフ" },
            { key: "broadcasts" as const, label: "配信別分析" },
            { key: "table" as const, label: "詳細" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "charts" && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* グラフタブ */}
      {activeTab === "charts" && (
        <div className="space-y-6">
          {data.chartData && data.chartData.followerTrend.length > 0 ? (
            <>
              {/* 友だち増減推移 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-1">友だち数推移</h2>
                <p className="text-xs text-gray-400 mb-4">有効友だち数と日次増減</p>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={data.chartData.followerTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(v) => `${v}`}
                      formatter={(value: any, name: any) => {
                        if (name === "followers") return [Number(value).toLocaleString(), "友だち数"];
                        return [Number(value) > 0 ? `+${value}` : value, "増減"];
                      }}
                    />
                    <Legend formatter={(v) => v === "followers" ? "友だち数" : "日次増減"} />
                    <Line yAxisId="left" type="monotone" dataKey="followers" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Bar yAxisId="right" dataKey="diff" fill="#6ee7b7" radius={[2, 2, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 配信数 + クリック率 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-800 mb-1">配信数</h2>
                  <p className="text-xs text-gray-400 mb-4">日別のメッセージ送信数</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.chartData.deliveryStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(v) => `${v}`}
                        formatter={(value: any) => [Number(value).toLocaleString(), "送信数"]}
                      />
                      <Bar dataKey="sent" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-800 mb-1">クリック数</h2>
                  <p className="text-xs text-gray-400 mb-4">計測リンクのクリック数推移</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.chartData.clickStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(v) => `${v}`}
                        formatter={(value: any, name: any) => [
                          Number(value).toLocaleString(),
                          name === "clicks" ? "総クリック" : "ユニーク",
                        ]}
                      />
                      <Legend formatter={(v) => v === "clicks" ? "総クリック" : "ユニーク"} />
                      <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="uniqueClicks" stroke="#93c5fd" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ブロック率 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-1">ブロック推移</h2>
                <p className="text-xs text-gray-400 mb-4">日別ブロック数とブロック率</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.chartData.blockStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(v) => `${v}`}
                      formatter={(value: any, name: any) => {
                        if (name === "blocks") return [value, "ブロック数"];
                        return [`${value}%`, "ブロック率"];
                      }}
                    />
                    <Legend formatter={(v) => v === "blocks" ? "ブロック数" : "ブロック率(%)"} />
                    <Area type="monotone" dataKey="blocks" stroke="#f43f5e" fill="#fecdd3" strokeWidth={2} />
                    <Line type="monotone" dataKey="blockRate" stroke="#fb7185" strokeWidth={1} dot={{ r: 2 }} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400 mb-2">チャートデータがありません</p>
              <p className="text-xs text-gray-300">日次統計の収集が開始されるとグラフが表示されます</p>
            </div>
          )}
        </div>
      )}

      {/* 配信別分析タブ */}
      {activeTab === "broadcasts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">配信別分析</h2>
            <p className="text-xs text-gray-400 mt-0.5">直近20件の一斉配信の成果</p>
          </div>
          {(!data.broadcastStats || data.broadcastStats.length === 0) ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">配信データがありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">配信名</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">対象</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">送信</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">到達率</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">クリック</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">CTR</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.broadcastStats.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{b.name}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{b.totalTargets}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{b.sentCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium ${b.deliveryRate >= 90 ? "text-emerald-600" : b.deliveryRate >= 70 ? "text-amber-600" : "text-red-500"}`}>
                          {b.deliveryRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {b.uniqueClicks > 0 ? `${b.uniqueClicks} / ${b.totalClicks}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.clickRate > 0 ? (
                          <span className="text-xs font-medium text-blue-600">{b.clickRate}%</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(b.sentAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 詳細タブ（既存のテーブル表示） */}
      {activeTab === "table" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 友だち数推移テーブル */}
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
      )}

      {/* テスト送信設定 */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            テスト送信設定
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            テスト送信先アカウントを登録すると、一斉配信・テンプレート・キーワード応答の各画面でテスト送信が可能になります
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* 登録済みアカウント一覧 */}
          {testAccounts.length > 0 && (
            <div className="space-y-2">
              {testAccounts.map((a) => (
                <div key={a.patient_id} className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{a.patient_name || "名前未登録"}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{a.patient_id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {a.has_line_uid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            LINE連携済み
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            LINE未連携
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTestAccount(a.patient_id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    解除
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* アカウント追加フォーム */}
          {testAccounts.length < 10 && (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testPid}
                  onChange={(e) => { setTestPid(e.target.value); setTestError(""); }}
                  placeholder="患者IDを入力（例: PID-001234）"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 bg-gray-50/50 transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleAddTestAccount()}
                />
                <button
                  onClick={handleAddTestAccount}
                  disabled={!testPid.trim() || testSaving}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5"
                >
                  {testSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      追加中...
                    </>
                  ) : "追加"}
                </button>
              </div>
              {testError && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {testError}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">最大10人まで登録可能（現在 {testAccounts.length}/10）</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
