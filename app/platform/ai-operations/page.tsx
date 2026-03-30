"use client";

// app/platform/ai-operations/page.tsx
// プラットフォーム管理: AI Operations（タスク監視・フィードバック・メトリクス・ポリシー管理）

import { useState, useCallback } from "react";
import useSWR from "swr";

// --- 型定義 ---

interface AiTask {
  id: string;
  tenant_id: string;
  workflow_type: string;
  status: string;
  subject_id: string | null;
  subject_type: string | null;
  handoff_status: string | null;
  handoff_summary: string | null;
  model_name: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
  completed_at: string | null;
}

interface Workflow {
  id: string;
  label: string;
  description: string;
}

interface TaskListResponse {
  ok: boolean;
  tasks: AiTask[];
  total: number;
  workflows: Workflow[];
}

interface TaskFeedback {
  id: string;
  feedback_type: string;
  comment: string;
  created_at: string;
}

interface HandoffSummary {
  targetType?: string;
  targetId?: string;
  summary?: string;
  urgency?: string;
  actionItems?: string[];
  context?: Record<string, unknown>;
}

interface TaskRunTrace {
  filterResult?: Record<string, unknown>;
  classifyResult?: Record<string, unknown>;
  policyResult?: Record<string, unknown>;
  sourcesResult?: Record<string, unknown>;
  generateResult?: Record<string, unknown>;
  warnings?: string[];
  error?: string;
}

interface TaskDetailResponse {
  ok: boolean;
  task: AiTask & {
    input: unknown;
    output: unknown;
    output_evidence: unknown[];
    handoff_summary: HandoffSummary | null;
    trace: TaskRunTrace | null;
    prompt_hash: string | null;
  };
  feedback: TaskFeedback[];
}

// --- メトリクス型 ---

interface WorkflowMetrics {
  totalTasks: number;
  completed: number;
  failed: number;
  skipped: number;
  escalated: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  approveCount: number;
  rejectCount: number;
  editCount: number;
  escalateCount: number;
  totalFeedback: number;
  avgRating: number | null;
  approvalRate: number | null;
  handoffAccepted: number;
  handoffResolved: number;
}

interface DailyTrend {
  date: string;
  total: number;
  completed: number;
  failed: number;
  tokens: number;
}

interface MetricsResponse {
  ok: boolean;
  period: { since: string; days: number };
  workflowMetrics: Record<string, WorkflowMetrics>;
  dailyTrend: DailyTrend[];
  summary: { totalTasks: number; totalFeedback: number; totalTokens: number };
}

// --- ポリシールール型 ---

interface PolicyRule {
  id: number;
  tenant_id: string | null;
  workflow_type: string;
  rule_name: string;
  rule_type: string;
  priority: number;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

interface PolicyRulesResponse {
  ok: boolean;
  rules: PolicyRule[];
}

type TabType = "monitor" | "metrics" | "policy";

// --- ステータスバッジ ---

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-600",
  escalated: "bg-amber-100 text-amber-700",
  running: "bg-blue-100 text-blue-700",
  pending: "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}

// --- KPIカード ---

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// --- 詳細モーダル ---

function TaskDetailModal({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const { data, error, mutate } = useSWR<TaskDetailResponse>(
    `/api/platform/ai-tasks/${taskId}`
  );
  const [feedbackType, setFeedbackType] = useState("approve");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feedbackComment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/platform/ai-tasks/${taskId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          feedback_type: feedbackType,
          comment: feedbackComment.trim(),
        }),
      });
      setFeedbackComment("");
      mutate();
    } catch {
      // エラーは無視
    } finally {
      setSubmitting(false);
    }
  }, [taskId, feedbackType, feedbackComment, mutate]);

  const task = data?.task;
  const feedback = data?.feedback ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto m-4">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-sm font-bold text-gray-900">タスク詳細</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {error && (
            <p className="text-sm text-red-600">読み込みエラーが発生しました</p>
          )}
          {!data && !error && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {task && (
            <>
              {/* 基本情報 */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">基本情報</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Workflow:</span>{" "}
                    <span className="font-medium">{task.workflow_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>{" "}
                    <StatusBadge status={task.status} />
                  </div>
                  <div>
                    <span className="text-gray-500">Subject:</span>{" "}
                    <span className="font-medium">{task.subject_type ? `${task.subject_type}:${task.subject_id}` : "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Model:</span>{" "}
                    <span className="font-medium">{task.model_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tokens:</span>{" "}
                    <span className="font-medium">
                      {task.input_tokens != null ? `${task.input_tokens.toLocaleString()} in / ${(task.output_tokens ?? 0).toLocaleString()} out` : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>{" "}
                    <span className="font-medium">{new Date(task.created_at).toLocaleString("ja-JP")}</span>
                  </div>
                  {task.completed_at && (
                    <div>
                      <span className="text-gray-500">Completed:</span>{" "}
                      <span className="font-medium">{new Date(task.completed_at).toLocaleString("ja-JP")}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Output */}
              {task.output && (
                <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Output</h3>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {typeof task.output === "string" ? task.output : JSON.stringify(task.output, null, 2)}
                  </pre>
                </section>
              )}

              {/* Handoff */}
              {task.handoff_summary && task.handoff_summary.targetType !== "none" && (
                <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Handoff</h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Urgency:</span>{" "}
                        <span className={`font-medium ${
                          task.handoff_summary.urgency === "critical" ? "text-red-700" :
                          task.handoff_summary.urgency === "high" ? "text-amber-700" :
                          task.handoff_summary.urgency === "medium" ? "text-yellow-600" :
                          "text-gray-600"
                        }`}>{task.handoff_summary.urgency || "-"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>{" "}
                        <span className="font-medium">{task.handoff_status || "pending"}</span>
                      </div>
                    </div>
                    {task.handoff_summary.summary && (
                      <p className="text-sm text-gray-700">{task.handoff_summary.summary}</p>
                    )}
                    {task.handoff_summary.actionItems && task.handoff_summary.actionItems.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Action Items:</p>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                          {task.handoff_summary.actionItems.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Trace */}
              {task.trace && Object.keys(task.trace).length > 0 && (
                <section>
                  <button
                    onClick={() => setTraceOpen(!traceOpen)}
                    className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 hover:text-gray-700"
                  >
                    <span className={`transition-transform ${traceOpen ? "rotate-90" : ""}`}>&#9654;</span>
                    Trace
                  </button>
                  {traceOpen && (
                    <div className="space-y-2">
                      {task.trace.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-red-600 mb-1">Error</p>
                          <p className="text-xs text-red-700">{task.trace.error}</p>
                        </div>
                      )}
                      {task.trace.warnings && task.trace.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-yellow-600 mb-1">Warnings</p>
                          <ul className="text-xs text-yellow-700 list-disc list-inside">
                            {task.trace.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      )}
                      {(["filterResult", "classifyResult", "policyResult", "sourcesResult", "generateResult"] as const).map((step) => {
                        const stepData = task.trace?.[step];
                        if (!stepData) return null;
                        const labels: Record<string, string> = {
                          filterResult: "Filter",
                          classifyResult: "Classify",
                          policyResult: "Policy",
                          sourcesResult: "Sources",
                          generateResult: "Generate",
                        };
                        return (
                          <div key={step} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-600 mb-1">{labels[step]}</p>
                            <pre className="text-xs overflow-x-auto max-h-32 whitespace-pre-wrap text-gray-500">
                              {JSON.stringify(stepData, null, 2)}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Feedback */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Feedback</h3>
                {feedback.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {feedback.map((fb) => (
                      <div key={fb.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            fb.feedback_type === "approve" ? "bg-green-100 text-green-700" :
                            fb.feedback_type === "reject" ? "bg-red-100 text-red-700" :
                            fb.feedback_type === "escalate" ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-600"
                          }`}>
                            {fb.feedback_type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(fb.created_at).toLocaleString("ja-JP")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{fb.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* フィードバック入力フォーム */}
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="approve">承認</option>
                      <option value="reject">却下</option>
                      <option value="edit">修正</option>
                      <option value="escalate">エスカレーション</option>
                    </select>
                  </div>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="フィードバックコメントを入力..."
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitFeedback}
                      disabled={submitting || !feedbackComment.trim()}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {submitting ? "送信中..." : "送信"}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- メトリクスタブ ---

function MetricsTab() {
  const [days, setDays] = useState(30);
  const [workflowFilter, setWorkflowFilter] = useState("");

  const params = new URLSearchParams();
  params.set("days", String(days));
  if (workflowFilter) params.set("workflow_type", workflowFilter);

  const { data, error, isLoading } = useSWR<MetricsResponse>(
    `/api/platform/ai-metrics?${params.toString()}`
  );

  const metrics = data?.workflowMetrics ?? {};
  const dailyTrend = data?.dailyTrend ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="flex items-center gap-3">
        <select
          value={workflowFilter}
          onChange={(e) => setWorkflowFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        >
          <option value="">全てのWorkflow</option>
          {Object.keys(metrics).map((wt) => (
            <option key={wt} value={wt}>{wt}</option>
          ))}
        </select>
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

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          メトリクスの取得に失敗しました
        </div>
      )}

      {summary && (
        <>
          {/* 全体サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="総タスク数" value={summary.totalTasks} sub={`過去${days}日`} />
            <KpiCard label="総フィードバック数" value={summary.totalFeedback} />
            <KpiCard label="総トークン消費" value={summary.totalTokens.toLocaleString()} />
          </div>

          {/* Workflow別メトリクス */}
          {Object.entries(metrics).map(([wt, m]) => (
            <div key={wt} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">{wt}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <MiniKpi label="タスク数" value={m.totalTasks} />
                <MiniKpi label="完了" value={m.completed} color="green" />
                <MiniKpi label="失敗" value={m.failed} color="red" />
                <MiniKpi label="エスカレーション" value={m.escalated} color="amber" />
                <MiniKpi label="完了率" value={m.totalTasks > 0 ? `${Math.round((m.completed / m.totalTasks) * 100)}%` : "-"} color="green" />
                <MiniKpi label="トークン" value={(m.totalInputTokens + m.totalOutputTokens).toLocaleString()} />
              </div>

              {/* フィードバック指標 */}
              {m.totalFeedback > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">フィードバック分析</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <MiniKpi label="承認率" value={m.approvalRate != null ? `${m.approvalRate}%` : "-"} color="green" />
                    <MiniKpi label="承認" value={m.approveCount} color="green" />
                    <MiniKpi label="却下" value={m.rejectCount} color="red" />
                    <MiniKpi label="修正" value={m.editCount} color="blue" />
                    <MiniKpi label="平均評価" value={m.avgRating != null ? `${m.avgRating}/5` : "-"} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 日別トレンド */}
          {dailyTrend.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">日別トレンド</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-2 py-1.5 text-gray-500">日付</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">タスク数</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">完了</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">失敗</th>
                      <th className="text-right px-2 py-1.5 text-gray-500">トークン</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTrend.slice(-14).map((d) => (
                      <tr key={d.date} className="border-b border-gray-50">
                        <td className="px-2 py-1.5 text-gray-700">{d.date}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{d.total}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-green-600">{d.completed}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-red-600">{d.failed}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{d.tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorClass = color === "green" ? "text-green-700" : color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : color === "blue" ? "text-blue-700" : "text-gray-900";
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

// --- ポリシールール管理タブ ---

function PolicyRulesTab() {
  const { data, error, isLoading, mutate } = useSWR<PolicyRulesResponse>("/api/platform/ai-policy-rules");
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
  const [formData, setFormData] = useState({
    workflow_type: "",
    rule_name: "",
    rule_type: "keyword",
    priority: 100,
    conditions: "{}",
    action: '{"decision": "auto_reply_ok"}',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({
      workflow_type: "", rule_name: "", rule_type: "keyword", priority: 100,
      conditions: "{}", action: '{"decision": "auto_reply_ok"}', is_active: true,
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const handleEdit = (rule: PolicyRule) => {
    setFormData({
      workflow_type: rule.workflow_type,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      priority: rule.priority,
      conditions: JSON.stringify(rule.conditions, null, 2),
      action: JSON.stringify(rule.action, null, 2),
      is_active: rule.is_active,
    });
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      let conditions: Record<string, unknown>;
      let action: Record<string, unknown>;
      try {
        conditions = JSON.parse(formData.conditions);
        action = JSON.parse(formData.action);
      } catch {
        alert("conditions または action のJSON形式が不正です");
        setSaving(false);
        return;
      }

      const payload = {
        workflow_type: formData.workflow_type,
        rule_name: formData.rule_name,
        rule_type: formData.rule_type,
        priority: formData.priority,
        conditions,
        action,
        is_active: formData.is_active,
      };

      if (editingRule) {
        await fetch(`/api/platform/ai-policy-rules/${editingRule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/platform/ai-policy-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }
      mutate();
      resetForm();
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [formData, editingRule, mutate]);

  const handleDelete = useCallback(async (ruleId: number) => {
    if (!confirm("このルールを削除しますか？")) return;
    try {
      await fetch(`/api/platform/ai-policy-rules/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      mutate();
    } catch {
      alert("削除に失敗しました");
    }
  }, [mutate]);

  const handleToggleActive = useCallback(async (rule: PolicyRule) => {
    try {
      await fetch(`/api/platform/ai-policy-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      mutate();
    } catch {
      // エラー無視
    }
  }, [mutate]);

  const rules = data?.rules ?? [];

  return (
    <div className="space-y-4">
      {/* ヘッダー + 追加ボタン */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">ポリシールールでworkflowの動作制御（ブロック・エスカレーション等）を管理</p>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
        >
          ルール追加
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          ルール一覧の取得に失敗しました
        </div>
      )}

      {/* ルール作成/編集フォーム */}
      {showForm && (
        <div className="bg-white rounded-lg border border-amber-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">{editingRule ? "ルール編集" : "新規ルール"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Workflow Type</label>
              <input
                value={formData.workflow_type}
                onChange={(e) => setFormData(p => ({ ...p, workflow_type: e.target.value }))}
                placeholder="support-intake"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ルール名</label>
              <input
                value={formData.rule_name}
                onChange={(e) => setFormData(p => ({ ...p, rule_name: e.target.value }))}
                placeholder="障害時エスカレーション"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ルール種別</label>
              <select
                value={formData.rule_type}
                onChange={(e) => setFormData(p => ({ ...p, rule_type: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="keyword">keyword</option>
                <option value="category">category</option>
                <option value="confidence">confidence</option>
                <option value="escalation">escalation</option>
                <option value="custom">custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">優先度（小さいほど高優先）</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(p => ({ ...p, priority: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Conditions (JSON)</label>
            <textarea
              value={formData.conditions}
              onChange={(e) => setFormData(p => ({ ...p, conditions: e.target.value }))}
              rows={3}
              className="w-full text-xs font-mono border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              placeholder='{"category": ["bug", "incident_suspected"]}'
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Action (JSON)</label>
            <textarea
              value={formData.action}
              onChange={(e) => setFormData(p => ({ ...p, action: e.target.value }))}
              rows={3}
              className="w-full text-xs font-mono border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              placeholder='{"decision": "escalate_to_staff", "message": "障害対応が必要"}'
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-xs text-gray-600">有効</label>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.workflow_type || !formData.rule_name}
              className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}

      {/* ルール一覧テーブル */}
      {rules.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Workflow</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">ルール名</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">種別</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">優先度</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Decision</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">有効</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-gray-100">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{rule.workflow_type}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{rule.rule_name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{rule.rule_type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-center tabular-nums">{rule.priority}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${
                        (rule.action as { decision?: string }).decision === "block" ? "bg-red-100 text-red-700" :
                        (rule.action as { decision?: string }).decision === "escalate_to_staff" ? "bg-amber-100 text-amber-700" :
                        (rule.action as { decision?: string }).decision === "approval_required" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {(rule.action as { decision?: string }).decision || "auto_reply_ok"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${rule.is_active ? "bg-amber-400" : "bg-gray-300"}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${rule.is_active ? "left-4" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && rules.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400 text-sm">
          ポリシールールがまだ登録されていません
        </div>
      )}
    </div>
  );
}

// --- メインページ ---

const LIMIT = 50;
const TABS: { id: TabType; label: string }[] = [
  { id: "monitor", label: "タスク監視" },
  { id: "metrics", label: "メトリクス" },
  { id: "policy", label: "ポリシールール" },
];

export default function AiOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("monitor");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // タスク一覧取得（監視タブ用）
  const params = new URLSearchParams();
  if (workflowFilter) params.set("workflow_type", workflowFilter);
  if (statusFilter) params.set("status", statusFilter);
  params.set("limit", String(LIMIT));
  params.set("offset", String(offset));

  const { data, error, isLoading } = useSWR<TaskListResponse>(
    activeTab === "monitor" ? `/api/platform/ai-tasks?${params.toString()}` : null
  );

  const tasks = data?.tasks ?? [];
  const total = data?.total ?? 0;
  const workflows = data?.workflows ?? [];

  // KPI算出
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const escalatedCount = tasks.filter((t) => t.status === "escalated").length;
  const totalTokens = tasks.reduce(
    (sum, t) => sum + (t.input_tokens ?? 0) + (t.output_tokens ?? 0),
    0
  );

  const handleWorkflowChange = (v: string) => {
    setWorkflowFilter(v);
    setOffset(0);
  };
  const handleStatusChange = (v: string) => {
    setStatusFilter(v);
    setOffset(0);
  };

  return (
    <div className="p-6 space-y-4">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">AI Operations</h1>
        <p className="text-sm text-gray-500 mt-0.5">AIタスクの監視・分析・フィードバック・ポリシー管理</p>
      </div>

      {/* タブ */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ: メトリクス */}
      {activeTab === "metrics" && <MetricsTab />}

      {/* タブコンテンツ: ポリシールール */}
      {activeTab === "policy" && <PolicyRulesTab />}

      {/* タブコンテンツ: タスク監視 */}
      {activeTab === "monitor" && (
        <>
          {/* フィルタ行 */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={workflowFilter}
              onChange={(e) => handleWorkflowChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">全てのWorkflow</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">全てのStatus</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="skipped">skipped</option>
              <option value="escalated">escalated</option>
              <option value="running">running</option>
              <option value="pending">pending</option>
            </select>
          </div>

          {/* KPIカード行 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="総タスク数" value={total} />
            <KpiCard label="完了数" value={completedCount} sub={`このページ内 (${tasks.length}件中)`} />
            <KpiCard label="エスカレーション数" value={escalatedCount} />
            <KpiCard label="合計トークン" value={totalTokens} sub="このページ内" />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              データの取得に失敗しました。再読み込みしてください。
            </div>
          )}

          {/* タスク一覧テーブル */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Workflow</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Urgency</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Tokens</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          読み込み中...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading && tasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        タスクが見つかりません
                      </td>
                    </tr>
                  )}
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="border-b border-gray-100 hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{task.workflow_type}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {task.subject_type ? `${task.subject_type}:${task.subject_id}` : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {(() => {
                          const hs = task.handoff_summary as HandoffSummary | null;
                          const urgency = hs?.urgency;
                          if (!urgency) return "-";
                          const colors: Record<string, string> = {
                            critical: "text-red-700 font-medium",
                            high: "text-amber-700 font-medium",
                            medium: "text-yellow-600",
                            low: "text-gray-500",
                          };
                          return <span className={colors[urgency] || ""}>{urgency}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 text-right tabular-nums">
                        {task.input_tokens != null
                          ? ((task.input_tokens ?? 0) + (task.output_tokens ?? 0)).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {new Date(task.created_at).toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページング */}
            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  {offset + 1} - {Math.min(offset + LIMIT, total)} / {total}件
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                    disabled={offset === 0}
                    className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setOffset(offset + LIMIT)}
                    disabled={offset + LIMIT >= total}
                    className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 詳細モーダル */}
          {selectedTaskId && (
            <TaskDetailModal
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
