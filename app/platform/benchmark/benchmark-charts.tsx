"use client";

// app/platform/benchmark/benchmark-charts.tsx
// ベンチマーク用Rechartsグラフコンポーネント

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

// KPIカテゴリ別カラー
const KPI_COLORS = {
  funnel: "#6366F1",    // インディゴ
  aiReply: "#8B5CF6",   // パープル
  line: "#EC4899",      // ピンク
  revenue: "#10B981",   // エメラルド
};

// カスタムツールチップ
function ChartTooltip({ active, payload, label, unit, format }: {
  active?: boolean;
  payload?: { value: number; payload: { name: string } }[];
  label?: string;
  unit?: string;
  format?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold text-zinc-900">{label}</div>
      <div className="mt-1 text-zinc-600">
        {format ? format(value) : value.toLocaleString()}{unit || ""}
      </div>
    </div>
  );
}

// --- エクスポート ---

// テナント別BarChart（KPIランキング）
export function TenantRankingChart({ data, dataKey, color, unit, avg, format }: {
  data: { name: string; value: number }[];
  dataKey?: string;
  color: string;
  unit?: string;
  avg?: number;
  format?: (v: number) => string;
}) {
  // 値降順ソート
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40 + 40)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => format ? format(v) : `${v}${unit || ""}`}
          fontSize={12}
        />
        <YAxis type="category" dataKey="name" width={120} fontSize={12} />
        <Tooltip content={<ChartTooltip unit={unit} format={format} />} />
        {avg !== undefined && (
          <ReferenceLine x={avg} stroke="#94A3B8" strokeDasharray="5 5" label={{ value: `平均 ${format ? format(avg) : avg}${unit || ""}`, position: "top", fontSize: 11, fill: "#64748B" }} />
        )}
        <Bar dataKey={dataKey || "value"} radius={[0, 4, 4, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={1 - i * 0.06} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// KPIカラーをエクスポート
export { KPI_COLORS };
