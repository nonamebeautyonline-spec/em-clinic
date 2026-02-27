"use client";

// 売上推移グラフウィジェット
// recharts の AreaChart（積み上げ売上）と BarChart（新規 vs 再処方）を表示
// 日別/月別/年別の切替と前期比較バッジに対応

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 日別売上データの型
export interface DailyBreakdown {
  date: string;
  square: number;
  bankTransfer: number;
  firstOrders: number;
  reorders: number;
}

// トレンドAPIのレスポンス型
interface TrendData {
  period: string;
  label: string;
  square: number;
  bankTransfer: number;
  total: number;
  gross: number;
  refunded: number;
  orderCount: number;
  uniquePatients: number;
}

interface TrendComparison {
  amount: number;
  rate: number;
}

interface TrendResponse {
  granularity: string;
  trends: TrendData[];
  comparison: {
    mom?: TrendComparison | null;
    yoy?: TrendComparison | null;
  };
  currentPeriod: TrendData | null;
}

type Granularity = "daily" | "monthly" | "yearly";

interface ChartWidgetProps {
  dailyBreakdown: DailyBreakdown[];
  showRevenueChart?: boolean;
  showOrderChart?: boolean;
}

/**
 * 日付を「M/D」形式に変換（例: "2026-02-22" → "2/22"）
 */
function formatDateShort(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}/${day}`;
}

/**
 * 金額をフォーマット（例: 150000 → "15万"）
 */
function formatYenShort(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万`;
  }
  return `¥${value.toLocaleString()}`;
}

/**
 * ツールチップの内容をカスタマイズ
 */
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce(
    (sum: number, entry: any) => sum + (entry.value || 0),
    0,
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-900 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-medium text-slate-900">
            ¥{(entry.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
      <div className="border-t border-slate-200 mt-2 pt-2">
        <span className="text-slate-600">合計: </span>
        <span className="font-bold text-slate-900">
          ¥{total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function OrderTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-900 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-medium text-slate-900">
            {entry.value || 0}件
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 前期比バッジ
 */
function ComparisonBadge({ label, comparison }: { label: string; comparison: TrendComparison | null | undefined }) {
  if (!comparison) return null;
  const isPositive = comparison.rate > 0;
  const isZero = comparison.rate === 0;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isZero
          ? "bg-slate-100 text-slate-600"
          : isPositive
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
      }`}
    >
      {!isZero && (isPositive ? "+" : "")}
      {comparison.rate}% {label}
    </span>
  );
}

export default function ChartWidget({
  dailyBreakdown,
  showRevenueChart = true,
  showOrderChart = true,
}: ChartWidgetProps) {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  // 月別/年別データの取得
  const loadTrendData = useCallback(async (g: Granularity) => {
    if (g === "daily") {
      setTrendData(null);
      return;
    }
    setTrendLoading(true);
    try {
      const params = new URLSearchParams({
        granularity: g === "monthly" ? "monthly" : "yearly",
        months: "12",
      });
      const res = await fetch(`/api/admin/dashboard-trends?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTrendData(data);
      }
    } catch {
      // エラー時は日別にフォールバック
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrendData(granularity);
  }, [granularity, loadTrendData]);

  // 日別データをフォーマット
  const dailyChartData = useMemo(
    () =>
      dailyBreakdown.map((d) => ({
        ...d,
        dateLabel: formatDateShort(d.date),
      })),
    [dailyBreakdown],
  );

  // トレンドデータをチャート用に整形
  const trendChartData = useMemo(() => {
    if (!trendData) return [];
    return trendData.trends.map((t) => ({
      dateLabel: t.label,
      square: t.square,
      bankTransfer: t.bankTransfer,
    }));
  }, [trendData]);

  const chartData = granularity === "daily" ? dailyChartData : trendChartData;
  const hasData = chartData.length > 0;

  // データがない場合の表示
  if (!hasData && !trendLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-md font-bold text-slate-900 mb-4">売上推移</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          表示期間のデータがありません
        </div>
      </div>
    );
  }

  const granularityLabel = { daily: "日別", monthly: "月別", yearly: "年別" }[granularity];

  return (
    <div className="space-y-6">
      {/* 売上推移エリアチャート */}
      {showRevenueChart && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-md font-bold text-slate-900">
                {granularityLabel}売上推移
              </h3>
              {/* 前期比バッジ */}
              {granularity === "monthly" && trendData?.comparison && (
                <div className="flex items-center gap-2">
                  <ComparisonBadge label="前月比" comparison={trendData.comparison.mom} />
                  <ComparisonBadge label="前年同月比" comparison={trendData.comparison.yoy} />
                </div>
              )}
              {granularity === "yearly" && trendData?.comparison && (
                <ComparisonBadge label="前年比" comparison={trendData.comparison.yoy} />
              )}
            </div>

            {/* 期間切替ボタン */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(["daily", "monthly", "yearly"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    granularity === g
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {{ daily: "日別", monthly: "月別", yearly: "年別" }[g]}
                </button>
              ))}
            </div>
          </div>

          {trendLoading ? (
            <div className="flex items-center justify-center h-72">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* 月別/年別の場合: 純売上サマリー */}
              {granularity !== "daily" && trendData?.currentPeriod && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-blue-600 mb-1">純売上</div>
                    <div className="text-lg font-bold text-blue-900">
                      ¥{trendData.currentPeriod.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">注文数</div>
                    <div className="text-lg font-bold text-slate-900">
                      {trendData.currentPeriod.orderCount}件
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">顧客数</div>
                    <div className="text-lg font-bold text-slate-900">
                      {trendData.currentPeriod.uniquePatients}人
                    </div>
                  </div>
                </div>
              )}

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                    />
                    <YAxis
                      tickFormatter={formatYenShort}
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      width={50}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      iconType="square"
                    />
                    <Area
                      type="monotone"
                      dataKey="square"
                      name="カード決済"
                      stackId="revenue"
                      stroke="#2563EB"
                      fill="#2563EB"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="bankTransfer"
                      name="銀行振込"
                      stackId="revenue"
                      stroke="#16A34A"
                      fill="#16A34A"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* 新規 vs 再処方 バーチャート（日別のみ表示） */}
      {showOrderChart && granularity === "daily" && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-md font-bold text-slate-900 mb-4">
            新規処方 vs 再処方（日別件数）
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyChartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip content={<OrderTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="square"
                />
                <Bar
                  dataKey="firstOrders"
                  name="新規処方"
                  fill="#9333EA"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="reorders"
                  name="再処方"
                  fill="#EA580C"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
