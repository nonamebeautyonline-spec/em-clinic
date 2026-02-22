"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";

// --- 型定義 ---
interface KPI {
  totalBroadcasts: number;
  avgDeliveryRate: number;
  avgClickRate: number;
  avgCvr: number;
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
  orders: number;
  cvr: number;
  sentAt: string;
}

interface DeliveryPoint {
  date: string;
  sent: number;
}

interface ClickPoint {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

interface FollowerPoint {
  date: string;
  followers: number;
  diff: number;
}

interface ChartData {
  period: number;
  deliveryStats: DeliveryPoint[];
  clickStats: ClickPoint[];
  followerTrend: FollowerPoint[];
  blockStats: { date: string; blocks: number; followers: number; blockRate: number }[];
}

interface AnalyticsData {
  kpi: KPI;
  broadcastStats: BroadcastStat[];
  chartData: ChartData;
  period: number;
}

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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  // CSVダウンロード
  const downloadCsv = () => {
    if (!data?.broadcastStats?.length) return;
    setDownloading("csv");
    try {
      const headers = ["配信名", "送信日時", "ターゲット数", "送信数", "失敗数", "到達率(%)", "ユニーククリック数", "CTR(%)", "推定注文数", "CVR(%)"];
      const rows = data.broadcastStats.map((b) => [
        `"${(b.name || "").replace(/"/g, '""')}"`,
        b.sentAt,
        b.totalTargets,
        b.sentCount,
        b.failedCount,
        b.deliveryRate,
        b.uniqueClicks,
        b.clickRate,
        b.orders,
        b.cvr,
      ].join(","));
      const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `line-analytics-${period}days.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  // PDFダウンロード
  const downloadPdf = async () => {
    setDownloading("pdf");
    try {
      const res = await fetch(`/api/admin/line/analytics/report?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `line-analytics-${period}days.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[analytics] PDF download error:", e);
    } finally {
      setDownloading(null);
    }
  };

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/line/analytics?period=${p}`, { credentials: "include" });
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("[analytics] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handlePeriodChange = (p: number) => {
    setPeriod(p);
  };

  // ローディング
  if (loading && !data) {
    return (
      <div className="min-h-full bg-gray-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">分析データを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-full bg-gray-50/50 flex items-center justify-center">
        <p className="text-sm text-gray-400">データの取得に失敗しました</p>
      </div>
    );
  }

  const { kpi, broadcastStats, chartData } = data;

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                配信効果分析
              </h1>
              <p className="text-sm text-gray-400 mt-1">配信パフォーマンスを可視化</p>
            </div>

            <div className="flex items-center gap-3">
              {/* レポートダウンロード */}
              <div className="flex items-center gap-1">
                <button
                  onClick={downloadCsv}
                  disabled={downloading !== null || !data?.broadcastStats?.length}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {downloading === "csv" ? "..." : "CSV"}
                </button>
                <button
                  onClick={downloadPdf}
                  disabled={downloading !== null}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {downloading === "pdf" ? "..." : "PDF"}
                </button>
              </div>

              {/* 期間切替 */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {[7, 30, 90].map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
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
          </div>

          {/* KPIカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <KPICard
              label="総配信数"
              value={String(kpi.totalBroadcasts)}
              sub="配信"
              gradient="from-slate-50 to-gray-50"
              border="border-gray-100/50"
              valueColor="text-gray-700"
              subColor="text-gray-400"
            />
            <KPICard
              label="平均到達率"
              value={`${kpi.avgDeliveryRate}%`}
              sub="到達率"
              gradient="from-emerald-50 to-green-50"
              border="border-emerald-100/50"
              valueColor="text-emerald-700"
              subColor="text-emerald-500"
            />
            <KPICard
              label="平均CTR"
              value={`${kpi.avgClickRate}%`}
              sub="クリック率"
              gradient="from-blue-50 to-indigo-50"
              border="border-blue-100/50"
              valueColor="text-blue-700"
              subColor="text-blue-500"
            />
            <KPICard
              label="推定CVR"
              value={`${kpi.avgCvr}%`}
              sub="転換率"
              gradient="from-violet-50 to-purple-50"
              border="border-violet-100/50"
              valueColor="text-violet-700"
              subColor="text-violet-500"
            />
          </div>
        </div>
      </div>

      {/* グラフ・テーブル */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* 送信数推移 */}
        <ChartCard title="送信数推移" icon="delivery">
          {chartData.deliveryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData.deliveryStats}>
                <defs>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
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
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sent"
                  name="送信数"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradSent)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#6366f1" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* クリック数推移 */}
        <ChartCard title="クリック数推移" icon="click">
          {chartData.clickStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData.clickStats} barSize={20}>
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
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="clicks" name="総クリック" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uniqueClicks" name="ユニーク" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* フォロワー推移 */}
        <ChartCard title="フォロワー推移" icon="follower">
          {chartData.followerTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData.followerTrend}>
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
                  domain={["dataMin - 10", "dataMax + 10"]}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="followers"
                  name="フォロワー数"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* 配信別パフォーマンステーブル */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-800">配信別パフォーマンス</h2>
            <span className="text-xs text-gray-400 ml-1">直近{broadcastStats.length}件</span>
          </div>

          {broadcastStats.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-400">配信データがありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* テーブルヘッダー（PC） */}
              <div className="hidden md:grid grid-cols-[1fr_100px_80px_80px_80px_70px] gap-2 px-5 py-2.5 bg-gray-50/50 text-xs text-gray-500 font-medium">
                <div>配信名</div>
                <div className="text-right">送信数</div>
                <div className="text-right">到達率</div>
                <div className="text-right">クリック</div>
                <div className="text-right">CTR</div>
                <div className="text-right">CVR</div>
              </div>

              {broadcastStats.map((b) => (
                <div key={b.id}>
                  {/* メイン行 */}
                  <button
                    className="w-full text-left hover:bg-gray-50/80 transition-colors"
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  >
                    {/* PC表示 */}
                    <div className="hidden md:grid grid-cols-[1fr_100px_80px_80px_80px_70px] gap-2 px-5 py-3 items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${expandedId === b.id ? "rotate-90" : ""}`}
                          fill="currentColor" viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate block">{b.name || "無題"}</span>
                          <span className="text-[10px] text-gray-400">{fmtDateTime(b.sentAt)}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-700 font-medium">{b.sentCount.toLocaleString()}</div>
                      <div className="text-right">
                        <RateBadge value={b.deliveryRate} thresholds={[90, 80]} />
                      </div>
                      <div className="text-right text-sm text-gray-700">{b.uniqueClicks.toLocaleString()}</div>
                      <div className="text-right">
                        <RateBadge value={b.clickRate} thresholds={[10, 5]} />
                      </div>
                      <div className="text-right">
                        <RateBadge value={b.cvr} thresholds={[5, 2]} />
                      </div>
                    </div>

                    {/* モバイル表示 */}
                    <div className="md:hidden px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg
                            className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${expandedId === b.id ? "rotate-90" : ""}`}
                            fill="currentColor" viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900 truncate">{b.name || "無題"}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{fmtDateTime(b.sentAt)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <MiniStat label="送信" value={b.sentCount.toLocaleString()} />
                        <MiniStat label="到達率" value={`${b.deliveryRate}%`} />
                        <MiniStat label="CTR" value={`${b.clickRate}%`} />
                        <MiniStat label="CVR" value={`${b.cvr}%`} />
                      </div>
                    </div>
                  </button>

                  {/* アコーディオン詳細 */}
                  {expandedId === b.id && (
                    <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DetailItem label="対象者数" value={b.totalTargets.toLocaleString()} unit="人" />
                        <DetailItem label="送信成功" value={b.sentCount.toLocaleString()} unit="通" />
                        <DetailItem label="送信失敗" value={b.failedCount.toLocaleString()} unit="通" />
                        <DetailItem label="UID不明" value={b.noUidCount.toLocaleString()} unit="人" />
                        <DetailItem label="到達率" value={`${b.deliveryRate}%`} />
                        <DetailItem label="総クリック" value={b.totalClicks.toLocaleString()} unit="回" />
                        <DetailItem label="ユニーククリック" value={b.uniqueClicks.toLocaleString()} unit="人" />
                        <DetailItem label="クリック率(CTR)" value={`${b.clickRate}%`} />
                        <DetailItem label="推定注文数" value={b.orders.toLocaleString()} unit="件" />
                        <DetailItem label="推定CVR" value={`${b.cvr}%`} />
                      </div>

                      {/* 送信結果バー */}
                      {b.totalTargets > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">送信結果</span>
                            <span className="font-medium text-gray-600">{b.deliveryRate}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                            {b.sentCount > 0 && (
                              <div
                                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full"
                                style={{ width: `${(b.sentCount / b.totalTargets) * 100}%` }}
                              />
                            )}
                            {b.failedCount > 0 && (
                              <div
                                className="bg-gradient-to-r from-red-400 to-red-500 h-full"
                                style={{ width: `${(b.failedCount / b.totalTargets) * 100}%` }}
                              />
                            )}
                            {b.noUidCount > 0 && (
                              <div
                                className="bg-gray-300 h-full"
                                style={{ width: `${(b.noUidCount / b.totalTargets) * 100}%` }}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-gray-500">成功 {b.sentCount}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-gray-500">失敗 {b.failedCount}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-gray-300" />
                              <span className="text-gray-500">UID無 {b.noUidCount}</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 注意書き */}
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <h3 className="text-xs font-bold text-violet-700 mb-2">CVRについて</h3>
          <ul className="text-xs text-violet-600 space-y-1">
            <li>- CVR（転換率）は配信後7日間の決済数 / ユニーククリック数で推定しています</li>
            <li>- 同期間に複数配信がある場合、決済が重複カウントされる可能性があります</li>
            <li>- クリック計測リンクを使用していない配信ではCTR・CVRが0%になります</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- サブコンポーネント ---

function KPICard({
  label, value, sub, gradient, border, valueColor, subColor,
}: {
  label: string; value: string; sub: string;
  gradient: string; border: string; valueColor: string; subColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 border ${border} text-center`}>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className={`text-[10px] ${subColor} mt-0.5`}>{sub}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const iconConfig: Record<string, { from: string; to: string; svg: string }> = {
    delivery: {
      from: "from-indigo-400", to: "to-violet-500",
      svg: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    },
    click: {
      from: "from-blue-400", to: "to-cyan-500",
      svg: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122",
    },
    follower: {
      from: "from-emerald-400", to: "to-teal-500",
      svg: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    },
  };
  const ic = iconConfig[icon] || iconConfig.delivery;

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
      <div className="px-4 py-4">
        {children}
      </div>
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

function RateBadge({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  const color = value >= thresholds[0]
    ? "text-emerald-700 bg-emerald-50"
    : value >= thresholds[1]
      ? "text-amber-700 bg-amber-50"
      : "text-red-700 bg-red-50";
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-md ${color}`}>
      {value}%
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xs font-bold text-gray-700">{value}</div>
      <div className="text-[9px] text-gray-400">{label}</div>
    </div>
  );
}

function DetailItem({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
      <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-bold text-gray-800">
        {value}
        {unit && <span className="text-xs text-gray-400 font-normal ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
