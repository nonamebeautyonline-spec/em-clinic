"use client";

// AI Supervisor ダッシュボード
// 品質監視・異常検知・SLA・Failure Review

import { useState, useCallback } from "react";
import useSWR from "swr";

// --- 型定義 ---

interface OutcomeMetrics {
  approvalRate: number;
  rejectionRate: number;
  editRate: number;
  escalationRate: number;
  resolutionRate: number;
  humanInterventionRate: number;
  avgCompletionTimeSec: number | null;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgConfidence: number | null;
}

interface AnomalyResult {
  isAnomaly: boolean;
  metricName: string;
  currentValue: number;
  baselineValue: number;
  deviation: number;
  severity: "warning" | "critical";
}

interface SLABreach {
  taskId: string;
  workflowType: string;
  status: string;
  handoffStatus: string;
  createdAt: string;
  staleDurationMin: number;
  severity: "warning" | "critical";
}

interface SupervisorResponse {
  ok: boolean;
  period: { since: string; days: number };
  outcomeMetrics: OutcomeMetrics;
  workflowOutcomes: Record<string, OutcomeMetrics>;
  anomalies: AnomalyResult[];
  slaBreaches: SLABreach[];
  qaLabels: Record<string, number>;
  workflowQA: Record<string, { avgScore: number; totalFeedback: number; approveRate: number; rejectRate: number; editRate: number; topFailureCategories: { category: string; count: number }[] }>;
  unackedAlerts: Array<{ id: number; alert_type: string; severity: string; metric_name: string; current_value: number; baseline_value: number; created_at: string }>;
  summary: { totalTasks: number; totalFeedback: number; anomalyCount: number; slaBreachCount: number };
}

interface FailureReviewResponse {
  ok: boolean;
  items: Array<{
    feedback: { id: string; task_id: string; feedback_type: string; comment: string; reject_category: string; failure_category: string; improvement_note: string; created_at: string };
    task: { id: string; workflow_type: string; status: string; output: unknown; created_at: string } | null;
  }>;
  total: number;
  categoryCounts: Record<string, number>;
}

// --- コンポーネント ---

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const c = color === "red" ? "text-red-700" : color === "green" ? "text-green-700" : color === "amber" ? "text-amber-700" : "text-gray-900";
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${c}`}>{typeof value === "number" ? (Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)) : value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const style = severity === "critical" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>{severity}</span>;
}

type TabType = "overview" | "anomalies" | "sla" | "qa" | "failure-review";

const TABS: { id: TabType; label: string }[] = [
  { id: "overview", label: "概要" },
  { id: "anomalies", label: "異常検知" },
  { id: "sla", label: "SLA" },
  { id: "qa", label: "QA分類" },
  { id: "failure-review", label: "Failure Review" },
];

// --- Failure Review タブ ---

function FailureReviewTab() {
  const [failureCategory, setFailureCategory] = useState("");
  const params = new URLSearchParams();
  if (failureCategory) params.set("failure_category", failureCategory);

  const { data, mutate } = useSWR<FailureReviewResponse>(
    `/api/platform/ai-supervisor/failure-review?${params.toString()}`
  );

  const handleClassify = useCallback(async (feedbackId: string, category: string) => {
    await fetch("/api/platform/ai-supervisor/failure-review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ feedback_id: feedbackId, failure_category: category }),
    });
    mutate();
  }, [mutate]);

  const items = data?.items ?? [];
  const categoryCounts = data?.categoryCounts ?? {};
  const QA_CATEGORIES = ["wrong_tone", "wrong_routing", "hallucination", "outdated", "no_evidence", "other"];

  return (
    <div className="space-y-4">
      {/* カテゴリフィルタ */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFailureCategory("")}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${!failureCategory ? "bg-amber-100 border-amber-300 text-amber-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          全て ({data?.total ?? 0})
        </button>
        {Object.entries(categoryCounts).map(([cat, cnt]) => (
          <button
            key={cat}
            onClick={() => setFailureCategory(cat)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${failureCategory === cat ? "bg-amber-100 border-amber-300 text-amber-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {cat} ({cnt})
          </button>
        ))}
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.feedback.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${item.feedback.feedback_type === "reject" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                    {item.feedback.feedback_type}
                  </span>
                  <span className="text-xs text-gray-500">{item.task?.workflow_type || "-"}</span>
                  <span className="text-xs text-gray-400">{new Date(item.feedback.created_at).toLocaleString("ja-JP")}</span>
                </div>
                {item.feedback.comment && (
                  <p className="text-sm text-gray-700 mb-2">{item.feedback.comment}</p>
                )}
                {item.feedback.reject_category && (
                  <p className="text-xs text-gray-500">却下理由: {item.feedback.reject_category}</p>
                )}
              </div>
              {/* 分類セレクト */}
              <select
                value={item.feedback.failure_category || ""}
                onChange={(e) => handleClassify(item.feedback.id, e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">未分類</option>
                {QA_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">該当する項目がありません</div>
        )}
      </div>
    </div>
  );
}

// --- メインページ ---

export default function AiSupervisorPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [days, setDays] = useState(30);

  const { data, error, isLoading } = useSWR<SupervisorResponse>(
    `/api/platform/ai-supervisor?days=${days}`
  );

  const metrics = data?.outcomeMetrics;
  const anomalies = data?.anomalies ?? [];
  const slaBreaches = data?.slaBreaches ?? [];
  const qaLabels = data?.qaLabels ?? {};
  const workflowOutcomes = data?.workflowOutcomes ?? {};
  const workflowQA = data?.workflowQA ?? {};
  const summary = data?.summary;
  const unackedAlerts = data?.unackedAlerts ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Supervisor</h1>
          <p className="text-sm text-gray-500 mt-0.5">品質監視・異常検知・SLA・Failure Review</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        >
          <option value={7}>過去7日</option>
          <option value={30}>過去30日</option>
          <option value={90}>過去90日</option>
        </select>
      </div>

      {/* アラートバナー */}
      {unackedAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-bold text-red-700 mb-1">未確認アラート ({unackedAlerts.length}件)</p>
          {unackedAlerts.slice(0, 3).map((alert) => (
            <p key={alert.id} className="text-xs text-red-600">
              [{alert.severity}] {alert.metric_name}: {alert.current_value?.toFixed(1)} (基準値: {alert.baseline_value?.toFixed(1)})
            </p>
          ))}
        </div>
      )}

      {/* タブ */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.id === "anomalies" && anomalies.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">{anomalies.length}</span>
            )}
            {tab.id === "sla" && slaBreaches.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">{slaBreaches.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          データの取得に失敗しました
        </div>
      )}

      {/* 概要タブ */}
      {activeTab === "overview" && metrics && (
        <div className="space-y-4">
          {/* サマリーKPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard label="タスク数" value={summary?.totalTasks ?? 0} sub={`過去${days}日`} />
            <MetricCard label="承認率" value={`${metrics.approvalRate.toFixed(1)}%`} color={metrics.approvalRate >= 80 ? "green" : metrics.approvalRate >= 60 ? "amber" : "red"} />
            <MetricCard label="人手介入率" value={`${metrics.humanInterventionRate.toFixed(1)}%`} color={metrics.humanInterventionRate <= 20 ? "green" : "amber"} />
            <MetricCard label="解決率" value={`${metrics.resolutionRate.toFixed(1)}%`} color="green" />
            <MetricCard label="異常/SLA" value={`${anomalies.length} / ${slaBreaches.length}`} color={anomalies.length > 0 || slaBreaches.length > 0 ? "red" : "green"} />
          </div>

          {/* Outcome詳細 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Outcome指標</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="却下率" value={`${metrics.rejectionRate.toFixed(1)}%`} color={metrics.rejectionRate > 20 ? "red" : undefined} />
              <MetricCard label="修正率" value={`${metrics.editRate.toFixed(1)}%`} />
              <MetricCard label="エスカレーション率" value={`${metrics.escalationRate.toFixed(1)}%`} />
              <MetricCard label="平均完了時間" value={metrics.avgCompletionTimeSec != null ? `${(metrics.avgCompletionTimeSec / 60).toFixed(1)}分` : "-"} />
              <MetricCard label="平均入力トークン" value={metrics.avgInputTokens} />
              <MetricCard label="平均出力トークン" value={metrics.avgOutputTokens} />
              <MetricCard label="平均信頼度" value={metrics.avgConfidence != null ? `${(metrics.avgConfidence * 100).toFixed(1)}%` : "-"} />
              <MetricCard label="フィードバック数" value={summary?.totalFeedback ?? 0} />
            </div>
          </div>

          {/* Workflow別 */}
          {Object.keys(workflowOutcomes).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Workflow別</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-2 py-1.5 text-gray-500">Workflow</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">承認率</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">却下率</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">介入率</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">解決率</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">信頼度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(workflowOutcomes).map(([wt, m]) => (
                      <tr key={wt} className="border-b border-gray-50">
                        <td className="px-2 py-1.5 font-medium text-gray-700">{wt}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{m.approvalRate.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{m.rejectionRate.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{m.humanInterventionRate.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{m.resolutionRate.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{m.avgConfidence != null ? `${(m.avgConfidence * 100).toFixed(0)}%` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 異常検知タブ */}
      {activeTab === "anomalies" && (
        <div className="space-y-3">
          {anomalies.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">異常は検知されていません</div>
          )}
          {anomalies.map((a, i) => (
            <div key={i} className={`rounded-lg border p-4 ${a.severity === "critical" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={a.severity} />
                <span className="text-sm font-medium text-gray-900">{a.metricName}</span>
              </div>
              <p className="text-sm text-gray-700">
                現在値: <strong>{a.currentValue.toFixed(1)}</strong> / 基準値: {a.baselineValue.toFixed(1)} / 偏差: {a.deviation.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      )}

      {/* SLAタブ */}
      {activeTab === "sla" && (
        <div className="space-y-3">
          {slaBreaches.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">SLA違反はありません</div>
          )}
          {slaBreaches.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Workflow</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Status</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">Handoff</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500">滞留時間</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">深刻度</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500">作成日時</th>
                  </tr>
                </thead>
                <tbody>
                  {slaBreaches.map((b) => (
                    <tr key={b.taskId} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-xs font-medium">{b.workflowType}</td>
                      <td className="px-4 py-2 text-xs">{b.status}</td>
                      <td className="px-4 py-2 text-xs">{b.handoffStatus}</td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums font-medium">{b.staleDurationMin}分</td>
                      <td className="px-4 py-2"><SeverityBadge severity={b.severity} /></td>
                      <td className="px-4 py-2 text-xs text-gray-500">{new Date(b.createdAt).toLocaleString("ja-JP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QA分類タブ */}
      {activeTab === "qa" && (
        <div className="space-y-4">
          {/* QAラベル分布 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">QA分類分布</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(qaLabels).map(([label, count]) => (
                <MetricCard key={label} label={label} value={count} color={count > 0 ? "amber" : undefined} />
              ))}
            </div>
          </div>

          {/* Workflow別QA */}
          {Object.keys(workflowQA).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Workflow別QA</h3>
              {Object.entries(workflowQA).map(([wt, qa]) => (
                <div key={wt} className="mb-3 last:mb-0">
                  <p className="text-xs font-medium text-gray-700 mb-1">{wt} (スコア: {qa.avgScore.toFixed(0)}/100)</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-gray-500">承認:</span> {qa.approveRate.toFixed(0)}%</div>
                    <div><span className="text-gray-500">却下:</span> {qa.rejectRate.toFixed(0)}%</div>
                    <div><span className="text-gray-500">修正:</span> {qa.editRate.toFixed(0)}%</div>
                    <div><span className="text-gray-500">FB数:</span> {qa.totalFeedback}</div>
                  </div>
                  {qa.topFailureCategories.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      主な原因: {qa.topFailureCategories.map(c => `${c.category}(${c.count})`).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Failure Review タブ */}
      {activeTab === "failure-review" && <FailureReviewTab />}
    </div>
  );
}
