"use client";

// app/platform/analytics/analytics-charts.tsx
// 分析ダッシュボード用のRechartsグラフコンポーネント

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
} from "recharts";

// プラン別カラーパレット
const PLAN_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#6366f1"];

// カテゴリの日本語名
const CATEGORY_LABELS: Record<string, string> = {
  admin: "管理画面",
  line: "LINE連携",
  platform: "プラットフォーム",
  reservation: "予約",
  intake: "問診",
  patient: "患者",
  order: "決済",
  shipping: "発送",
  reorder: "再処方",
  doctor: "Dr",
};

interface FinancialProps {
  type: "financial";
  monthlyTrend: { month: string; amount: number }[];
  planDistribution?: { planName: string; count: number; monthlyTotal: number }[];
}

interface PlanPieProps {
  type: "planPie";
  planDistribution: { planName: string; count: number; monthlyTotal: number }[];
  monthlyTrend?: never;
}

interface FeatureBarProps {
  type: "featureBar";
  features: { category: string; count: number }[];
  monthlyTrend?: never;
  planDistribution?: never;
}

type AnalyticsChartsProps = FinancialProps | PlanPieProps | FeatureBarProps;

// 金額フォーマット
function formatCurrency(value: number): string {
  if (value >= 10000) return `¥${(value / 10000).toFixed(0)}万`;
  return `¥${value.toLocaleString()}`;
}

export default function AnalyticsCharts(props: AnalyticsChartsProps) {
  if (props.type === "financial") {
    const data = props.monthlyTrend.map((d) => ({
      ...d,
      label: d.month.replace(/^\d{4}-/, "").replace(/^0/, "") + "月",
    }));

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#71717a" }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12, fill: "#71717a" }}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value ?? 0)), "請求額"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e4e4e7",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4 }}
              fill="#fef3c7"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (props.type === "planPie") {
    const data = props.planDistribution.map((p) => ({
      name: p.planName,
      value: p.count,
    }));

    if (data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-sm text-zinc-400">
          プランデータなし
        </div>
      );
    }

    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={70}
              dataKey="value"
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value ?? 0}件`, name ?? ""]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e4e4e7",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (props.type === "featureBar") {
    const data = props.features.slice(0, 15).map((f) => ({
      category: CATEGORY_LABELS[f.category] || f.category,
      count: f.count,
    }));

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: "#71717a" }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 12, fill: "#71717a" }}
              width={80}
            />
            <Tooltip
              formatter={(value) => [`${Number(value ?? 0).toLocaleString()}回`, "利用回数"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e4e4e7",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
