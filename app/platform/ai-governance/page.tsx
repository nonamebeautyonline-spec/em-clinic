"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";

// ---------- 型定義 ----------

interface ChangeRequest {
  id: number;
  tenant_id: string | null;
  config_type: string;
  change_description: string;
  diff: Record<string, unknown>;
  status: string;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  created_at: string;
}

interface ConfigVersion {
  id: number;
  tenant_id: string | null;
  config_type: string;
  config_snapshot: Record<string, unknown>;
  version_number: number;
  created_by: string | null;
  created_at: string;
}

// ---------- ステータスバッジ ----------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    applied: "bg-blue-100 text-blue-800",
  };
  const labels: Record<string, string> = {
    pending: "審査中",
    approved: "承認済",
    rejected: "却下",
    applied: "適用済",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

// ---------- メインページ ----------

export default function AIGovernancePage() {
  const [activeTab, setActiveTab] = useState<"changes" | "versions">("changes");
  const [statusFilter, setStatusFilter] = useState("");
  const [configTypeInput, setConfigTypeInput] = useState("ai_reply_settings");
  const [processing, setProcessing] = useState<number | null>(null);

  // 変更リクエスト一覧
  const changesUrl = `/api/platform/ai-governance?view=changes${statusFilter ? `&status=${statusFilter}` : ""}`;
  const { data: changesData, isLoading: changesLoading } = useSWR<{ ok: boolean; changes: ChangeRequest[] }>(
    activeTab === "changes" ? changesUrl : null
  );

  // バージョン履歴
  const versionsUrl = `/api/platform/ai-governance?view=versions&config_type=${configTypeInput}`;
  const { data: versionsData, isLoading: versionsLoading } = useSWR<{ ok: boolean; versions: ConfigVersion[] }>(
    activeTab === "versions" ? versionsUrl : null
  );

  const changes = useMemo(() => changesData?.changes || [], [changesData]);
  const versions = useMemo(() => versionsData?.versions || [], [versionsData]);

  // 変更リクエストアクション
  async function handleAction(action: string, requestId: number) {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/platform/ai-governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, request_id: requestId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "操作に失敗しました");
        return;
      }
      mutate(changesUrl);
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setProcessing(null);
    }
  }

  // ロールバック
  async function handleRollback(configType: string, targetVersion: number) {
    if (!confirm(`バージョン ${targetVersion} にロールバックしますか？`)) return;
    setProcessing(targetVersion);
    try {
      const res = await fetch("/api/platform/ai-governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "rollback",
          config_type: configType,
          target_version: targetVersion,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "ロールバックに失敗しました");
        return;
      }
      mutate(versionsUrl);
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">AI Governance</h1>

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("changes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "changes"
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          変更管理
        </button>
        <button
          onClick={() => setActiveTab("versions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "versions"
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          バージョン履歴
        </button>
      </div>

      {/* 変更管理タブ */}
      {activeTab === "changes" && (
        <div>
          {/* フィルター */}
          <div className="flex gap-2 mb-4">
            {["", "pending", "approved", "rejected", "applied"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter === s
                    ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {s === "" ? "全て" : s === "pending" ? "審査中" : s === "approved" ? "承認済" : s === "rejected" ? "却下" : "適用済"}
              </button>
            ))}
          </div>

          {changesLoading ? (
            <div className="text-center py-12 text-zinc-400">読み込み中...</div>
          ) : changes.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">変更リクエストはありません</div>
          ) : (
            <div className="space-y-4">
              {changes.map((cr) => (
                <div key={cr.id} className="bg-white rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-zinc-900">#{cr.id}</span>
                        <StatusBadge status={cr.status} />
                        <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">{cr.config_type}</span>
                      </div>
                      <p className="text-sm text-zinc-700">{cr.change_description}</p>
                    </div>
                    <div className="text-xs text-zinc-400 text-right">
                      <div>{new Date(cr.created_at).toLocaleString("ja-JP")}</div>
                      <div>by {cr.requested_by}</div>
                    </div>
                  </div>

                  {/* Diff表示 */}
                  <details className="mt-2">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-700">差分を表示</summary>
                    <pre className="mt-2 p-3 bg-zinc-50 rounded text-xs text-zinc-700 overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(cr.diff, null, 2)}
                    </pre>
                  </details>

                  {/* レビュー情報 */}
                  {cr.reviewed_by && (
                    <div className="mt-2 text-xs text-zinc-500">
                      レビュー: {cr.reviewed_by} ({cr.reviewed_at ? new Date(cr.reviewed_at).toLocaleString("ja-JP") : "-"})
                    </div>
                  )}

                  {/* アクションボタン */}
                  {cr.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAction("approve", cr.id)}
                        disabled={processing === cr.id}
                        className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => handleAction("reject", cr.id)}
                        disabled={processing === cr.id}
                        className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        却下
                      </button>
                    </div>
                  )}
                  {cr.status === "approved" && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAction("apply", cr.id)}
                        disabled={processing === cr.id}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        適用する
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* バージョン履歴タブ */}
      {activeTab === "versions" && (
        <div>
          {/* config_type選択 */}
          <div className="flex gap-2 mb-4">
            <label className="text-sm text-zinc-600 flex items-center gap-2">
              設定タイプ:
              <select
                value={configTypeInput}
                onChange={(e) => setConfigTypeInput(e.target.value)}
                className="border border-zinc-300 rounded px-2 py-1 text-sm"
              >
                <option value="ai_reply_settings">AI返信設定</option>
                <option value="ai_policy_rules">ポリシールール</option>
                <option value="ai_model_config">モデル設定</option>
                <option value="ai_cost_guard">コストガード</option>
              </select>
            </label>
          </div>

          {versionsLoading ? (
            <div className="text-center py-12 text-zinc-400">読み込み中...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">バージョン履歴はありません</div>
          ) : (
            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="text-left px-4 py-2 font-medium text-zinc-600">Ver.</th>
                    <th className="text-left px-4 py-2 font-medium text-zinc-600">設定タイプ</th>
                    <th className="text-left px-4 py-2 font-medium text-zinc-600">作成者</th>
                    <th className="text-left px-4 py-2 font-medium text-zinc-600">作成日時</th>
                    <th className="text-left px-4 py-2 font-medium text-zinc-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v, idx) => (
                    <tr key={v.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold">
                          v{v.version_number}
                        </span>
                        {idx === 0 && (
                          <span className="ml-2 text-xs text-green-600 font-medium">最新</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{v.config_type}</td>
                      <td className="px-4 py-3 text-zinc-600">{v.created_by || "-"}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(v.created_at).toLocaleString("ja-JP")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <details>
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">詳細</summary>
                            <div className="absolute z-10 mt-1 p-3 bg-white border border-zinc-200 rounded-lg shadow-lg max-w-lg">
                              <pre className="text-xs text-zinc-700 overflow-auto max-h-48">
                                {JSON.stringify(v.config_snapshot, null, 2)}
                              </pre>
                            </div>
                          </details>
                          {idx > 0 && (
                            <button
                              onClick={() => handleRollback(v.config_type, v.version_number)}
                              disabled={processing === v.version_number}
                              className="text-xs text-amber-600 hover:text-amber-800 font-medium disabled:opacity-50"
                            >
                              ロールバック
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
