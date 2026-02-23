"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- 型定義 ---
interface KPI {
  total: number;
  approvalRate: number;
  rejectionRate: number;
  avgConfidence: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  avgResponseTimeSec: number;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface DailyTrend {
  date: string;
  total: number;
  sent: number;
  rejected: number;
  expired: number;
  pending: number;
  inputTokens: number;
  outputTokens: number;
}

interface RecentDraft {
  id: number;
  status: string;
  category: string;
  originalMessage: string;
  draftReply: string;
  confidence: number | null;
  modelUsed: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface StatsData {
  kpi: KPI;
  categoryStats: CategoryStat[];
  dailyTrend: DailyTrend[];
  recentDrafts: RecentDraft[];
  period: number;
}

// カテゴリラベル
const CATEGORY_LABELS: Record<string, string> = {
  operational: "運用系",
  medical: "医療系",
  greeting: "挨拶",
  booking: "予約",
  shipping: "発送",
  payment: "決済",
  other: "その他",
};

// カテゴリカラー
const CATEGORY_COLORS: Record<string, string> = {
  operational: "#6366f1",
  medical: "#ef4444",
  greeting: "#10b981",
  booking: "#f59e0b",
  shipping: "#3b82f6",
  payment: "#8b5cf6",
  other: "#9ca3af",
};

// ステータスラベル
const STATUS_LABELS: Record<string, string> = {
  sent: "送信済",
  rejected: "却下",
  expired: "期限切れ",
  pending: "保留中",
  approved: "承認済",
};

// ステータスカラー
const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
};

// 日付フォーマット（短縮: 2/20）
function fmtShortDate(s: string) {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 日時フォーマット（2/20 14:30）
function fmtDateTime(s: string) {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// トークン数を読みやすく表示
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// カスタムTooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * AI返信統計のコンテンツ部分（ページラッパーを除いた純粋な統計UI）
 * ai-reply-settings ページからタブ経由で埋め込み可能
 */
export function AIReplyStatsContent() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/line/ai-reply-stats?period=${p}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("[ai-reply-stats] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  // ローディング
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">AI返信統計を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400">データの取得に失敗しました</p>
      </div>
    );
  }

  const { kpi, categoryStats, dailyTrend, recentDrafts } = data;

  return (
    <div className="space-y-6">
      {/* 期間切替 + KPIカード */}
      <div>
        <div className="flex items-center justify-end mb-4">
          {/* 期間切替 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[7, 30, 90].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p}日
              </button>
            ))}
          </div>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            label="総処理数"
            value={String(kpi.total)}
            sub="件"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            gradient="from-slate-50 to-gray-50"
            border="border-gray-100/50"
            valueColor="text-gray-700"
            subColor="text-gray-400"
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
          />
          <KPICard
            label="承認率"
            value={`${kpi.approvalRate}%`}
            sub={`${Math.round(kpi.total * kpi.approvalRate / 100)}件送信`}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            gradient="from-emerald-50 to-green-50"
            border="border-emerald-100/50"
            valueColor="text-emerald-700"
            subColor="text-emerald-500"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KPICard
            label="平均信頼度"
            value={`${(kpi.avgConfidence * 100).toFixed(1)}%`}
            sub="confidence"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            gradient="from-blue-50 to-indigo-50"
            border="border-blue-100/50"
            valueColor="text-blue-700"
            subColor="text-blue-500"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <KPICard
            label="トークン消費"
            value={fmtTokens(kpi.totalTokens)}
            sub={`$${kpi.estimatedCost.toFixed(2)}`}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            gradient="from-violet-50 to-purple-50"
            border="border-violet-100/50"
            valueColor="text-violet-700"
            subColor="text-violet-500"
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
          />
        </div>
      </div>

      {/* グラフ・テーブル */}
        {/* 日次件数推移（AreaChart） */}
        <ChartCard title="日次件数推移" icon="trend">
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9ca3af" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtShortDate}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  name="送信"
                  stackId="1"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradSent)"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  name="却下"
                  stackId="1"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#gradRejected)"
                />
                <Area
                  type="monotone"
                  dataKey="expired"
                  name="期限切れ"
                  stackId="1"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  fill="url(#gradExpired)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* カテゴリ分布 + トークン消費推移 (2カラム) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* カテゴリ別分布（BarChart） */}
          <ChartCard title="カテゴリ別分布" icon="category">
            {categoryStats.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={categoryStats.map((c) => ({
                      name: CATEGORY_LABELS[c.category] || c.category,
                      count: c.count,
                      fill: CATEGORY_COLORS[c.category] || "#9ca3af",
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="件数"
                      radius={[0, 4, 4, 0]}
                    >
                      {categoryStats.map((c, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORY_COLORS[c.category] || "#9ca3af"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* トークン消費推移（BarChart） */}
          <ChartCard title="トークン消費推移" icon="token">
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dailyTrend} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtShortDate}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v: number) => fmtTokens(v)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar
                    dataKey="inputTokens"
                    name="入力トークン"
                    stackId="tokens"
                    fill="#818cf8"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="outputTokens"
                    name="出力トークン"
                    stackId="tokens"
                    fill="#c4b5fd"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </div>

        {/* 追加KPI: 応答時間・却下率 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKPI
            label="却下率"
            value={`${kpi.rejectionRate}%`}
            color="text-red-600"
          />
          <MiniKPI
            label="平均応答時間"
            value={kpi.avgResponseTimeSec > 0 ? `${kpi.avgResponseTimeSec}秒` : "-"}
            color="text-blue-600"
          />
          <MiniKPI
            label="入力トークン"
            value={fmtTokens(kpi.totalInputTokens)}
            color="text-indigo-600"
          />
          <MiniKPI
            label="出力トークン"
            value={fmtTokens(kpi.totalOutputTokens)}
            color="text-purple-600"
          />
        </div>

        {/* 直近のドラフト一覧テーブル */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-800">直近のAI返信ドラフト</h2>
            <span className="text-xs text-gray-400 ml-1">最新{recentDrafts.length}件</span>
          </div>

          {recentDrafts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-400">ドラフトデータがありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* PC テーブル */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="bg-gray-50/50 text-xs text-gray-500 font-medium">
                    <th className="px-4 py-2.5 text-left">ステータス</th>
                    <th className="px-4 py-2.5 text-left">カテゴリ</th>
                    <th className="px-4 py-2.5 text-left">元メッセージ</th>
                    <th className="px-4 py-2.5 text-left">返信案</th>
                    <th className="px-4 py-2.5 text-right">信頼度</th>
                    <th className="px-4 py-2.5 text-right">日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentDrafts.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={d.category} />
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-xs text-gray-700 truncate block">
                          {d.originalMessage || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-xs text-gray-500 truncate block">
                          {d.draftReply || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ConfidenceBar value={d.confidence} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                          {fmtDateTime(d.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* モバイル表示 */}
              <div className="md:hidden divide-y divide-gray-50">
                {recentDrafts.map((d) => (
                  <div key={d.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.status} />
                        <CategoryBadge category={d.category} />
                      </div>
                      <span className="text-[10px] text-gray-400">{fmtDateTime(d.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">{d.originalMessage || "-"}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{d.draftReply || "-"}</p>
                    <div className="flex items-center justify-end">
                      <ConfidenceBar value={d.confidence} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 注意書き */}
        <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
          <h3 className="text-xs font-bold text-cyan-700 mb-2">AI返信統計について</h3>
          <ul className="text-xs text-cyan-600 space-y-1">
            <li>- トークン消費量はモデルの入力・出力トークン数の合計です</li>
            <li>- 推定コストはGPT-4o-mini相当の料金で概算しています</li>
            <li>- 応答時間は送信済みドラフトの「作成〜送信」の平均です</li>
            <li>- 信頼度はAIが返信案の適切さを自己評価した値（0〜100%）です</li>
          </ul>
        </div>
    </div>
  );
}

/**
 * AI返信統計ページ（直接アクセス用）
 * ヘッダー付きのフルページラッパー
 */
export default function AIReplyStatsPage() {
  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              AI返信統計
            </h1>
            <p className="text-sm text-gray-400 mt-1">AI返信のパフォーマンスを分析</p>
          </div>
        </div>
      </div>

      {/* 統計コンテンツ */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <AIReplyStatsContent />
      </div>
    </div>
  );
}

// --- サブコンポーネント ---

function KPICard({
  label,
  value,
  sub,
  icon,
  gradient,
  border,
  valueColor,
  subColor,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  gradient: string;
  border: string;
  valueColor: string;
  subColor: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 border ${border}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-md ${iconBg} ${iconColor} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className={`text-[10px] ${subColor} mt-0.5`}>{sub}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const iconConfig: Record<string, { from: string; to: string; svg: string }> = {
    trend: {
      from: "from-cyan-400",
      to: "to-blue-500",
      svg: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    },
    category: {
      from: "from-indigo-400",
      to: "to-violet-500",
      svg: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z",
    },
    token: {
      from: "from-violet-400",
      to: "to-purple-500",
      svg: "M13 10V3L4 14h7v7l9-11h-7z",
    },
  };
  const ic = iconConfig[icon] || iconConfig.trend;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${ic.from} ${ic.to} flex items-center justify-center`}>
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ic.svg} />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[240px]">
      <p className="text-xs text-gray-400">表示データがありません</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || "#9ca3af";
  const label = CATEGORY_LABELS[category] || category;
  return (
    <span
      className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {label}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[10px] text-gray-300">-</span>;
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 font-medium w-8 text-right">{pct}%</span>
    </div>
  );
}

function MiniKPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
