"use client";

// 売上推移グラフウィジェット
// recharts の AreaChart（積み上げ売上）と BarChart（新規 vs 再処方）を表示

import { useMemo } from "react";
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

interface ChartWidgetProps {
  dailyBreakdown: DailyBreakdown[];
  showRevenueChart?: boolean;  // 売上推移グラフの表示制御
  showOrderChart?: boolean;    // 新規vs再処方グラフの表示制御
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

export default function ChartWidget({
  dailyBreakdown,
  showRevenueChart = true,
  showOrderChart = true,
}: ChartWidgetProps) {
  // 日付表示をフォーマットしたデータに変換
  const chartData = useMemo(
    () =>
      dailyBreakdown.map((d) => ({
        ...d,
        dateLabel: formatDateShort(d.date),
      })),
    [dailyBreakdown],
  );

  // データがない場合の表示
  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-md font-bold text-slate-900 mb-4">売上推移</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          表示期間のデータがありません
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 売上推移エリアチャート（カード決済 + 銀行振込の積み上げ） */}
      {showRevenueChart && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-md font-bold text-slate-900 mb-4">
            日別売上推移
          </h3>
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
        </div>
      )}

      {/* 新規 vs 再処方 バーチャート */}
      {showOrderChart && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-md font-bold text-slate-900 mb-4">
            新規処方 vs 再処方（日別件数）
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
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
