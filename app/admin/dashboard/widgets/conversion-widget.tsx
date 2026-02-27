"use client";

// 初診→再診転換率ウィジェット
// 月別コホート分析グラフと全体転換率を表示

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

interface CohortData {
  period: string;
  label: string;
  newPatients: number;
  returnedPatients: number;
  conversionRate: number;
  avgDaysToReturn: number | null;
}

interface ConversionData {
  cohorts: CohortData[];
  overall: {
    totalNew: number;
    totalReturned: number;
    conversionRate: number;
  };
}

function ConversionTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as CohortData;
  if (!data) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-900 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">新規患者:</span>
          <span className="font-medium">{data.newPatients}人</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">再診患者:</span>
          <span className="font-medium">{data.returnedPatients}人</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">転換率:</span>
          <span className="font-bold text-blue-600">{data.conversionRate}%</span>
        </div>
        {data.avgDaysToReturn !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">平均再診日数:</span>
            <span className="font-medium">{data.avgDaysToReturn}日</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversionWidget() {
  const [data, setData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard-conversion", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("転換率データの取得に失敗しました");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-64 bg-slate-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-md font-bold text-slate-900 mb-4">初診→再診転換率</h3>
        <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  if (!data || data.cohorts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-md font-bold text-slate-900 mb-4">初診→再診転換率</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          データがありません
        </div>
      </div>
    );
  }

  const rateColor = data.overall.conversionRate >= 50
    ? "text-green-600" : data.overall.conversionRate >= 30
      ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-bold text-slate-900">初診→再診転換率</h3>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500">全体転換率</div>
            <div className={`text-2xl font-bold ${rateColor}`}>
              {data.overall.conversionRate}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">再診</div>
            <div className="text-sm font-medium text-slate-900">
              {data.overall.totalReturned} / {data.overall.totalNew}人
            </div>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data.cohorts}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#64748B" }}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
            />
            <YAxis
              yAxisId="count"
              tick={{ fontSize: 12, fill: "#64748B" }}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              allowDecimals={false}
              width={35}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              tick={{ fontSize: 12, fill: "#64748B" }}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              width={40}
            />
            <Tooltip content={<ConversionTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" />
            <Bar
              yAxisId="count"
              dataKey="newPatients"
              name="新規患者"
              fill="#93C5FD"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="count"
              dataKey="returnedPatients"
              name="再診患者"
              fill="#2563EB"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="conversionRate"
              name="転換率"
              stroke="#DC2626"
              strokeWidth={2}
              dot={{ r: 3, fill: "#DC2626" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
