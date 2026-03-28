"use client";

// app/platform/ai-insights/ai-insights-charts.tsx
// AI Insights用Rechartsグラフコンポーネント

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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// 色定義
const COLORS = {
  sent: "#10B981",
  rejected: "#EF4444",
  expired: "#94A3B8",
  approvalRate: "#6366F1",
};

const PIE_COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#6366F1", "#94A3B8"];

// カテゴリの日本語名
const REJECT_LABELS: Record<string, string> = {
  tone: "トーン不適切",
  incorrect: "内容不正確",
  too_long: "長すぎる",
  too_short: "短すぎる",
  off_topic: "的外れ",
  sensitive: "要配慮",
  other: "その他",
  未分類: "未分類",
};

// --- 月別トレンドチャート ---
export function MonthlyTrendChart({ data }: {
  data: { month: string; total: number; sent: number; rejected: number; approvalRate: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis yAxisId="count" fontSize={12} />
        <YAxis yAxisId="rate" orientation="right" fontSize={12} domain={[0, 100]} unit="%" />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip
          formatter={(value: any, name: any) => {
            const labels: Record<string, string> = { sent: "採用数", rejected: "却下数", total: "総数", approvalRate: "採用率" };
            const suffix = name === "approvalRate" ? "%" : "件";
            return [`${Number(value).toLocaleString()}${suffix}`, labels[name] || name];
          }}
        />
        <Legend
          formatter={(value: string) => {
            const labels: Record<string, string> = { sent: "採用数", rejected: "却下数", total: "総数", approvalRate: "採用率" };
            return labels[value] || value;
          }}
        />
        <Line yAxisId="count" type="monotone" dataKey="total" stroke="#94A3B8" strokeWidth={1} dot={false} />
        <Line yAxisId="count" type="monotone" dataKey="sent" stroke={COLORS.sent} strokeWidth={2} dot={{ r: 3 }} />
        <Line yAxisId="count" type="monotone" dataKey="rejected" stroke={COLORS.rejected} strokeWidth={2} dot={{ r: 3 }} />
        <Line yAxisId="rate" type="monotone" dataKey="approvalRate" stroke={COLORS.approvalRate} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// --- 却下理由PieChart ---
export function RejectCategoryPie({ data }: {
  data: { category: string; count: number }[];
}) {
  const pieData = data.map((d, i) => ({
    name: REJECT_LABELS[d.category] || d.category,
    value: d.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            labelLine={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
              cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number;
            }) => {
              if (!percent || percent < 0.05 || cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null) return null;
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              return (
                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
                  {(percent * 100).toFixed(0)}%
                </text>
              );
            }}
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [`${Number(value).toLocaleString()}件 (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`, "件数"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs mt-2">
        {pieData.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-zinc-600">{item.name}</span>
            <span className="text-zinc-400">{item.value}件</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- テナント別採用率BarChart ---
export function TenantApprovalBar({ data }: {
  data: { tenantName: string; approvalRate: number; totalDrafts: number }[];
}) {
  const sorted = [...data].sort((a, b) => b.approvalRate - a.approvalRate);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40 + 40)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" fontSize={12} />
        <YAxis type="category" dataKey="tenantName" width={120} fontSize={12} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip
          formatter={(value: any, _: any, entry: any) =>
            [`${value}% (${entry?.payload?.totalDrafts ?? 0}件中)`, "採用率"]
          }
        />
        <Bar dataKey="approvalRate" radius={[0, 4, 4, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={COLORS.approvalRate} fillOpacity={1 - i * 0.08} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
