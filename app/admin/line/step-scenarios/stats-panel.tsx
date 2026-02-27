"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ---------- 型定義 ---------- */
interface ScenarioSummary {
  id: number;
  name: string;
  is_enabled: boolean;
  created_at: string;
}

interface StatsSummary {
  total_enrolled: number;
  active: number;
  completed: number;
  exited: number;
  paused: number;
  completion_rate: number;
  exit_rate: number;
}

interface FunnelStep {
  sort_order: number;
  step_type: string;
  label: string;
  reached: number;
}

interface MonthlyPoint {
  month: string;
  enrolled: number;
  completed: number;
  exited: number;
}

interface ScenarioDetailStats {
  scenario: ScenarioSummary;
  summary: StatsSummary;
  funnel: FunnelStep[];
  exit_reasons: Record<string, number>;
  monthly_trend: MonthlyPoint[];
  error?: string;
}

/* ---------- 離脱理由のラベル ---------- */
const EXIT_REASON_LABELS: Record<string, string> = {
  blocked: "ブロック",
  tag_removed: "タグ削除",
  manual: "手動除外",
  condition_failed: "条件不一致",
  scenario_disabled: "シナリオ停止",
};

/* ---------- 月表示フォーマット ---------- */
function formatMonth(ym: string): string {
  const [, m] = ym.split("-");
  return `${parseInt(m)}月`;
}

/* ---------- props ---------- */
interface StatsPanelProps {
  scenario_id: number;
  onClose?: () => void;
}

/* ---------- メインコンポーネント ---------- */
export default function StatsPanel({ scenario_id, onClose }: StatsPanelProps) {
  const [data, setData] = useState<ScenarioDetailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/line/step-scenarios/stats?scenario_id=${scenario_id}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (e: any) {
      setError(e.message || "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [scenario_id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* --- ローディング --- */
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">統計データを読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  /* --- エラー --- */
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">エラー: {error}</span>
        </div>
        <button
          onClick={loadStats}
          className="mt-3 px-4 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (!data || !data.summary) return null;

  const { summary, funnel, exit_reasons, monthly_trend } = data;

  /* --- 離脱理由リスト --- */
  const exitReasonEntries = Object.entries(exit_reasons || {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900">効果測定</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard
            label="登録者数"
            value={summary.total_enrolled}
            color="blue"
          />
          <SummaryCard
            label="進行中"
            value={summary.active}
            color="emerald"
          />
          <SummaryCard
            label="完了"
            value={summary.completed}
            suffix={`(${summary.completion_rate}%)`}
            color="violet"
          />
          <SummaryCard
            label="離脱"
            value={summary.exited}
            suffix={`(${summary.exit_rate}%)`}
            color="red"
          />
          <SummaryCard
            label="一時停止"
            value={summary.paused}
            color="amber"
          />
        </div>

        {/* 完了率・離脱率のプログレスバー */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">完了率</span>
              <span className="text-xs font-bold text-violet-700">{summary.completion_rate}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-500"
                style={{ width: `${summary.completion_rate}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">離脱率</span>
              <span className="text-xs font-bold text-red-600">{summary.exit_rate}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-300 to-red-500 rounded-full transition-all duration-500"
                style={{ width: `${summary.exit_rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* ファネルチャート: 各ステップの到達人数 */}
        {funnel.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              ステップ到達ファネル
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnel.map((f) => ({
                    name: `Step ${f.sort_order + 1}`,
                    label: f.label,
                    reached: f.reached,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                    formatter={(value: unknown, _name: unknown, props: unknown) => {
                      const p = props as { payload?: { label?: string } };
                      return [`${Number(value)}人`, p?.payload?.label ?? ""];
                    }}
                  />
                  <Bar
                    dataKey="reached"
                    fill="url(#funnelGradient)"
                    radius={[4, 4, 0, 0]}
                    name="到達人数"
                  />
                  <defs>
                    <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ステップ詳細リスト */}
            <div className="mt-3 space-y-1">
              {funnel.map((f) => (
                <div
                  key={f.sort_order}
                  className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {f.sort_order + 1}
                    </span>
                    <span className="text-[11px] text-gray-600 truncate max-w-[240px]">
                      {f.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-700">{f.reached}人</span>
                    {summary.total_enrolled > 0 && (
                      <span className="text-[10px] text-gray-400">
                        ({Math.round((f.reached / summary.total_enrolled) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 離脱理由の内訳 */}
        {exitReasonEntries.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              離脱理由の内訳
            </h4>
            <div className="space-y-2">
              {exitReasonEntries.map(([reason, count]) => {
                const pct = summary.exited > 0 ? Math.round((count / summary.exited) * 100) : 0;
                return (
                  <div key={reason} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-600 w-24 flex-shrink-0">
                      {EXIT_REASON_LABELS[reason] || reason}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-gray-700 w-16 text-right">
                      {count}人 ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* エンロール数の月別推移 */}
        {monthly_trend.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              月別推移（直近12ヶ月）
            </h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthly_trend.map((p) => ({
                    ...p,
                    label: formatMonth(p.month),
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      const labels: Record<string, string> = {
                        enrolled: "登録",
                        completed: "完了",
                        exited: "離脱",
                      };
                      const n = String(name ?? "");
                      return [`${Number(value)}人`, labels[n] || n];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        enrolled: "登録",
                        completed: "完了",
                        exited: "離脱",
                      };
                      return labels[value] || value;
                    }}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enrolled"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#8b5cf6" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="exited"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#ef4444" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- サマリーカードコンポーネント ---------- */
function SummaryCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: "blue" | "emerald" | "violet" | "red" | "amber";
}) {
  const colorMap = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-sky-50",
      border: "border-blue-100/50",
      text: "text-blue-700",
      sub: "text-blue-500",
    },
    emerald: {
      bg: "bg-gradient-to-br from-emerald-50 to-green-50",
      border: "border-emerald-100/50",
      text: "text-emerald-700",
      sub: "text-emerald-500",
    },
    violet: {
      bg: "bg-gradient-to-br from-violet-50 to-purple-50",
      border: "border-violet-100/50",
      text: "text-violet-700",
      sub: "text-violet-500",
    },
    red: {
      bg: "bg-gradient-to-br from-red-50 to-rose-50",
      border: "border-red-100/50",
      text: "text-red-700",
      sub: "text-red-500",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
      border: "border-amber-100/50",
      text: "text-amber-700",
      sub: "text-amber-500",
    },
  };

  const c = colorMap[color];

  return (
    <div className={`${c.bg} rounded-xl p-3 border ${c.border}`}>
      <div className={`text-xl font-bold ${c.text}`}>
        {value.toLocaleString()}
        {suffix && (
          <span className={`text-[10px] font-normal ${c.sub} ml-1`}>
            {suffix}
          </span>
        )}
      </div>
      <div className={`text-[10px] ${c.sub} mt-0.5`}>{label}</div>
    </div>
  );
}
