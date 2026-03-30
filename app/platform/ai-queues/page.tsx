"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";

// キュー定義
const QUEUES = [
  { key: "all", label: "全て" },
  { key: "support", label: "サポート" },
  { key: "sales", label: "セールス" },
  { key: "onboarding", label: "オンボーディング" },
  { key: "incident", label: "インシデント" },
] as const;

// 優先度バッジ
function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 90) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">critical</span>;
  }
  if (priority >= 70) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">high</span>;
  }
  if (priority >= 50) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">medium</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600">low</span>;
}

// ステータスバッジ
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-blue-100 text-blue-800",
    running: "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    skipped: "bg-zinc-100 text-zinc-600",
    escalated: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}

// 経過時間表示
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

// アサインモーダル
function AssignModal({
  taskId,
  onClose,
  onAssigned,
}: {
  taskId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [assigneeId, setAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!assigneeId.trim()) {
      setError("担当者IDを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/ai-queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ task_id: taskId, assignee_id: assigneeId.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "アサインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">タスクアサイン</h3>
        <p className="text-sm text-zinc-500 mb-3">タスクID: {taskId.slice(0, 8)}...</p>
        <input
          type="text"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          placeholder="担当者ID（メールアドレス等）"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "処理中..." : "アサイン"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface QueueTask {
  id: string;
  workflow_type: string;
  status: string;
  priority: number;
  queue_name: string;
  assignee_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  escalation_level: number;
  missing_info: unknown[];
  handoff_summary: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

interface QueueStat {
  queueName: string;
  pending: number;
  assigned: number;
  completed: number;
}

interface QueuesResponse {
  tasks: QueueTask[];
  total: number;
  stats: QueueStat[];
  oldestPending: Record<string, string>;
}

export default function AIQueuesPage() {
  const [activeQueue, setActiveQueue] = useState<string>("all");
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (activeQueue !== "all") params.set("queue_name", activeQueue);
    params.set("limit", "100");
    return `/api/platform/ai-queues?${params.toString()}`;
  }, [activeQueue]);

  const { data, error, isLoading } = useSWR<QueuesResponse>(apiUrl);

  const handleAssigned = () => {
    setAssignTaskId(null);
    mutate(apiUrl);
  };

  // キュー統計マップ
  const statsMap = useMemo(() => {
    const map: Record<string, QueueStat> = {};
    for (const stat of data?.stats ?? []) {
      map[stat.queueName] = stat;
    }
    return map;
  }, [data?.stats]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">AI Queues</h1>

      {/* キュータブ */}
      <div className="flex gap-1 mb-6 bg-zinc-100 rounded-lg p-1 w-fit">
        {QUEUES.map((q) => (
          <button
            key={q.key}
            onClick={() => setActiveQueue(q.key)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeQueue === q.key
                ? "bg-white text-zinc-900 shadow-sm font-medium"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {q.label}
            {q.key !== "all" && statsMap[q.key] && (
              <span className="ml-1.5 text-xs text-zinc-400">
                ({statsMap[q.key].pending})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {QUEUES.filter((q) => q.key !== "all").map((q) => {
          const stat = statsMap[q.key];
          const oldest = data?.oldestPending?.[q.key];
          return (
            <div key={q.key} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="text-sm font-medium text-zinc-500 mb-1">{q.label}</div>
              <div className="flex items-end gap-3">
                <div>
                  <span className="text-2xl font-bold text-zinc-800">{stat?.pending ?? 0}</span>
                  <span className="text-xs text-zinc-400 ml-1">待機</span>
                </div>
                <div>
                  <span className="text-lg font-semibold text-amber-600">{stat?.assigned ?? 0}</span>
                  <span className="text-xs text-zinc-400 ml-1">対応中</span>
                </div>
                <div>
                  <span className="text-lg font-semibold text-green-600">{stat?.completed ?? 0}</span>
                  <span className="text-xs text-zinc-400 ml-1">完了</span>
                </div>
              </div>
              {oldest && (
                <div className="mt-2 text-xs text-zinc-400">
                  最古の滞留: {timeAgo(oldest)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* タスク一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">データの取得に失敗しました</div>
      ) : !data?.tasks?.length ? (
        <div className="text-center py-12 text-zinc-400">タスクがありません</div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Workflow</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">優先度</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">キュー</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">担当者</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">作成日時</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((task) => (
                  <tr key={task.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{task.workflow_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority ?? 50} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{task.queue_name}</td>
                    <td className="px-4 py-3">
                      {task.assignee_id ? (
                        <span className="text-xs text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                          {task.assignee_id}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">未割当</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {timeAgo(task.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {!task.assignee_id && task.status !== "completed" && (
                        <button
                          onClick={() => setAssignTaskId(task.id)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                        >
                          アサイン
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.total > 100 && (
            <div className="px-4 py-3 text-xs text-zinc-400 border-t border-zinc-100">
              {data.total}件中 100件を表示
            </div>
          )}
        </div>
      )}

      {/* アサインモーダル */}
      {assignTaskId && (
        <AssignModal
          taskId={assignTaskId}
          onClose={() => setAssignTaskId(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
