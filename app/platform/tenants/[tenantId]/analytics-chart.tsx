"use client";

// app/platform/tenants/[tenantId]/analytics-chart.tsx
// テナント分析タブ用のRechartsグラフコンポーネント

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyAnalytics {
  month: string;
  patients: number;
  revenue: number;
  reservations: number;
  lineFriends: number;
}

const COLORS = {
  patients: "#3b82f6",    // blue-500
  revenue: "#f59e0b",     // amber-500
  reservations: "#10b981", // emerald-500
  lineFriends: "#22c55e", // green-500
};

// 金額のフォーマット
function formatRevenue(value: number): string {
  if (value >= 10000) return `¥${(value / 10000).toFixed(0)}万`;
  return `¥${value.toLocaleString()}`;
}

export default function AnalyticsChart({ data }: { data: MonthlyAnalytics[] }) {
  // 月ラベルを短縮表示
  const chartData = data.map((d) => ({
    ...d,
    label: d.month.replace(/^\d{4}-/, "").replace(/^0/, "") + "月",
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#71717a" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: "#71717a" }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatRevenue}
            tick={{ fontSize: 12, fill: "#71717a" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e4e4e7",
              fontSize: "12px",
            }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                patients: "患者数",
                revenue: "売上",
                reservations: "予約数",
                lineFriends: "LINE友だち",
              };
              const n = String(name ?? "");
              const v = Number(value ?? 0);
              const formatted = n === "revenue" ? `¥${v.toLocaleString()}` : `${v}`;
              return [formatted, labels[n] || n];
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                patients: "患者数",
                revenue: "売上",
                reservations: "予約数",
                lineFriends: "LINE友だち",
              };
              return labels[value] || value;
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="patients"
            stroke={COLORS.patients}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            stroke={COLORS.revenue}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="reservations"
            stroke={COLORS.reservations}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="lineFriends"
            stroke={COLORS.lineFriends}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
