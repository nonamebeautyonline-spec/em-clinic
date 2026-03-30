"use client";

import useSWR from "swr";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// --- 型定義 ---
interface TodayKpi {
  total: number;
  approvalRate: number;
  cost: number;
}

interface ApprovalRatePoint {
  date: string;
  rate: number;
  movingAvg7d: number;
}

interface CostPoint {
  date: string;
  cost: number;
  movingAvg7d: number;
}

interface Alert {
  type: string;
  message: string;
  severity: "warning" | "critical";
}

interface ModelComparison {
  model: string;
  approvalRate: number;
  avgCost: number;
  count: number;
}

interface SupervisorData {
  todayKpi: TodayKpi;
  approvalRateTrend: ApprovalRatePoint[];
  costTrend: CostPoint[];
  alerts: Alert[];
  modelComparison: ModelComparison[];
}

// モデル表示名
const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
  "claude-opus-4-6": "Opus 4.6",
};

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

export default function AiSupervisorPage() {
  const { data, error, isLoading } = useSWR<SupervisorData>("/api/admin/line/ai-supervisor", fetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
        データの取得に失敗しました
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
        データがありません
      </div>
    );
  }

  const { todayKpi, approvalRateTrend, costTrend, alerts, modelComparison } = data;

  return (
    <div className="space-y-6">
      {/* タイトル */}
      <h1 className="text-2xl font-bold">AI Supervisor</h1>

      {/* アラートセクション */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 ${
                alert.severity === "critical"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-yellow-300 bg-yellow-50 text-yellow-800"
              }`}
            >
              <span className="font-semibold">
                {alert.severity === "critical" ? "⚠ 重大" : "⚠ 注意"}:
              </span>{" "}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* 今日のKPIカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">今日の件数</p>
          <p className="mt-1 text-3xl font-bold">{todayKpi.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">今日の承認率</p>
          <p className="mt-1 text-3xl font-bold">{todayKpi.approvalRate}%</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">今日のコスト</p>
          <p className="mt-1 text-3xl font-bold">${todayKpi.cost.toFixed(4)}</p>
        </div>
      </div>

      {/* 承認率チャート */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">承認率（7日移動平均）</h2>
        {approvalRateTrend.length === 0 ? (
          <p className="py-8 text-center text-gray-500">データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={approvalRateTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="rate"
                name="承認率"
                stroke="#c4b5fd"
                fill="#c4b5fd"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="movingAvg7d"
                name="7日移動平均"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* コストチャート */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">日次コスト（7日移動平均）</h2>
        {costTrend.length === 0 ? (
          <p className="py-8 text-center text-gray-500">データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={costTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="$" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="cost"
                name="日次コスト"
                stroke="#86efac"
                fill="#86efac"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="movingAvg7d"
                name="7日移動平均"
                stroke="#16a34a"
                fill="#16a34a"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* モデル別比較テーブル */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">モデル別比較</h2>
        {modelComparison.length === 0 ? (
          <p className="py-8 text-center text-gray-500">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-3 pr-4 font-medium">モデル</th>
                  <th className="py-3 pr-4 text-right font-medium">件数</th>
                  <th className="py-3 pr-4 text-right font-medium">承認率</th>
                  <th className="py-3 text-right font-medium">平均コスト/件</th>
                </tr>
              </thead>
              <tbody>
                {modelComparison.map((m) => (
                  <tr key={m.model} className="border-b border-gray-100">
                    <td className="py-3 pr-4">{MODEL_LABELS[m.model] || m.model}</td>
                    <td className="py-3 pr-4 text-right">{m.count}</td>
                    <td className="py-3 pr-4 text-right">{m.approvalRate}%</td>
                    <td className="py-3 text-right">${m.avgCost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
