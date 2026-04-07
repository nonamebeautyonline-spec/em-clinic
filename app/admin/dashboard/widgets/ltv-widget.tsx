"use client";

// LTV分析ウィジェット
// 患者あたり累計売上の分布ヒストグラムとセグメント別LTVを表示

import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DistributionData {
  range: string;
  count: number;
}

interface SegmentLTVData {
  segment: string;
  label: string;
  avgLTV: number;
  totalRevenue: number;
  patientCount: number;
  avgOrders: number;
}

interface LTVData {
  overview: {
    totalPatients: number;
    totalRevenue: number;
    avgLTV: number;
    medianLTV: number;
    top10AvgLTV: number;
  };
  distribution: DistributionData[];
  segments: SegmentLTVData[];
}

const SEGMENT_COLORS: Record<string, string> = {
  vip: "#FFD700",
  active: "#22C55E",
  churn_risk: "#F97316",
  dormant: "#94A3B8",
  new: "#3B82F6",
  unknown: "#CBD5E1",
};

function DistributionTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-claude-ivory border border-claude-border-warm rounded-lg shadow-lg p-3 text-sm">
      <p className="font-bold text-claude-near-black mb-1">{label}</p>
      <p className="text-claude-olive">{payload[0].value}人</p>
    </div>
  );
}

export default function LTVWidget() {
  const { data, error, isLoading } = useSWR<LTVData>("/api/admin/dashboard-ltv");

  if (isLoading) {
    return (
      <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6 animate-pulse">
        <div className="h-4 w-32 bg-claude-parchment rounded mb-4" />
        <div className="h-64 bg-claude-parchment rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6">
        <h3 className="text-md font-bold text-claude-near-black mb-4">LTV分析</h3>
        <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error instanceof Error ? error.message : "エラーが発生しました"}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6">
        <h3 className="text-md font-bold text-claude-near-black mb-4">LTV分析</h3>
        <div className="flex items-center justify-center h-48 text-claude-stone text-sm">
          データがありません
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* LTV概要 */}
      <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6">
        <h3 className="text-md font-bold text-claude-near-black mb-4">LTV分析</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-claude-ivory rounded-2xl p-3 border border-claude-border-cream">
            <div className="text-xs text-claude-stone mb-1">平均LTV</div>
            <div className="text-lg font-bold text-claude-near-black">
              ¥{data.overview.avgLTV.toLocaleString()}
            </div>
          </div>
          <div className="bg-claude-ivory rounded-2xl p-3 border border-claude-border-cream">
            <div className="text-xs text-claude-olive mb-1">中央値LTV</div>
            <div className="text-lg font-bold text-claude-near-black">
              ¥{data.overview.medianLTV.toLocaleString()}
            </div>
          </div>
          <div className="bg-claude-ivory rounded-2xl p-3 border border-claude-border-cream">
            <div className="text-xs text-claude-stone mb-1">上位10% 平均</div>
            <div className="text-lg font-bold text-claude-near-black">
              ¥{data.overview.top10AvgLTV.toLocaleString()}
            </div>
          </div>
          <div className="bg-claude-ivory rounded-2xl p-3 border border-claude-border-cream">
            <div className="text-xs text-claude-olive mb-1">対象患者数</div>
            <div className="text-lg font-bold text-claude-near-black">
              {data.overview.totalPatients}人
            </div>
          </div>
        </div>

        {/* LTV分布ヒストグラム */}
        {data.distribution.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-claude-charcoal mb-3">LTV分布</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.distribution}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 11, fill: "#64748B" }}
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
                  <Tooltip content={<DistributionTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* セグメント別LTV */}
      {data.segments.length > 0 && (
        <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6">
          <h3 className="text-md font-bold text-claude-near-black mb-4">セグメント別LTV</h3>
          <div className="space-y-3">
            {data.segments.map((seg) => (
              <div key={seg.segment} className="flex items-center justify-between p-3 border-b border-claude-border-cream last:border-b-0">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: SEGMENT_COLORS[seg.segment] || "#94A3B8" }}
                  />
                  <div>
                    <div className="text-sm font-medium text-claude-near-black">{seg.label}</div>
                    <div className="text-xs text-claude-olive">
                      {seg.patientCount}人 / 平均{seg.avgOrders}回
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-claude-near-black">
                    ¥{seg.avgLTV.toLocaleString()}
                  </div>
                  <div className="text-xs text-claude-olive">
                    合計 ¥{seg.totalRevenue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
