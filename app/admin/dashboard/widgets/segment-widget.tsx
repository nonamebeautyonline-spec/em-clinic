"use client";

// セグメント分布ウィジェット
// recharts の PieChart で患者セグメント分布（VIP/アクティブ/離脱リスク/休眠/新規）を表示

import { useMemo } from "react";
import useSWR, { mutate } from "swr";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// セグメント定義（lib/patient-segments.ts と同じ定義）
type SegmentType = "vip" | "active" | "churn_risk" | "dormant" | "new";

const SEGMENT_CONFIG: Record<
  SegmentType,
  { label: string; color: string }
> = {
  vip: { label: "VIP", color: "#FFD700" },
  active: { label: "アクティブ", color: "#22C55E" },
  churn_risk: { label: "離脱リスク", color: "#F97316" },
  dormant: { label: "休眠", color: "#94A3B8" },
  new: { label: "新規", color: "#3B82F6" },
};

const SEGMENT_ORDER: SegmentType[] = [
  "vip",
  "active",
  "churn_risk",
  "dormant",
  "new",
];

interface SegmentData {
  name: string;
  value: number;
  segment: SegmentType;
  color: string;
}

/**
 * カスタムツールチップ
 */
function SegmentTooltip({ active, payload }: { active?: boolean; payload?: { payload: SegmentData }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as SegmentData;

  return (
    <div className="bg-claude-ivory border border-claude-border-warm rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-bold text-claude-near-black">{data.name}</span>
      </div>
      <p className="text-claude-olive">{data.value}人</p>
    </div>
  );
}

/**
 * カスタムラベル（パーセンテージ表示）
 */
function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number }) {
  // 5%未満はラベルを省略
  if (!percent || percent < 0.05) return null;
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function SegmentWidget() {
  const SWR_KEY = "/api/admin/segments";
  const { data: swrData, isLoading: loading, error: swrError } = useSWR<{ summary?: Record<string, number>; total?: number }>(SWR_KEY);

  const summary = swrData?.summary || null;
  const total = swrData?.total || 0;
  const error = swrError ? (swrError instanceof Error ? swrError.message : "エラーが発生しました") : "";

  // PieChart用のデータを生成
  const chartData: SegmentData[] = useMemo(() => {
    if (!summary) return [];
    return SEGMENT_ORDER.filter((seg) => (summary[seg] || 0) > 0).map(
      (seg) => ({
        name: SEGMENT_CONFIG[seg].label,
        value: summary[seg] || 0,
        segment: seg,
        color: SEGMENT_CONFIG[seg].color,
      }),
    );
  }, [summary]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="text-md font-bold text-claude-near-black mb-4">
          セグメント分布
        </h3>
        <div className="flex items-center justify-center h-48">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-slate-900 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="text-md font-bold text-claude-near-black mb-4">
          セグメント分布
        </h3>
        <div className="flex items-center justify-center h-48 text-red-500 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (total === 0 || chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="text-md font-bold text-claude-near-black mb-4">
          セグメント分布
        </h3>
        <div className="flex flex-col items-center justify-center h-48 text-claude-stone text-sm gap-2">
          <span>セグメントデータがありません</span>
          <button
            onClick={async () => {
              try {
                await fetch("/api/admin/segments/recalculate", {
                  method: "POST",
                  credentials: "include",
                });
                mutate(SWR_KEY);
              } catch {
                // 無視
              }
            }}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition-colors"
          >
            セグメントを計算する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-bold text-claude-near-black">セグメント分布</h3>
        <span className="text-xs text-claude-olive">合計 {total}人</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {chartData.map((entry) => (
                <Cell key={entry.segment} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<SegmentTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
              formatter={(value: string) => (
                <span className="text-claude-charcoal">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* セグメント別の件数一覧 */}
      <div className="mt-4 space-y-2">
        {SEGMENT_ORDER.map((seg) => {
          const count = summary?.[seg] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={seg} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SEGMENT_CONFIG[seg].color }}
                />
                <span className="text-sm text-claude-charcoal">
                  {SEGMENT_CONFIG[seg].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-claude-near-black">
                  {count}人
                </span>
                <span className="text-xs text-claude-stone w-10 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
