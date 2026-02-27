"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- 型定義 ---------- */

interface WorkflowStep {
  id?: string;
  sort_order: number;
  step_type: string;
  config: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  step_count: number;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

/* ---------- 定数 ---------- */

const TRIGGER_LABELS: Record<string, string> = {
  reservation_completed: "予約完了",
  payment_completed: "決済完了",
  tag_added: "タグ追加",
  form_submitted: "フォーム送信",
  scheduled: "スケジュール",
  manual: "手動実行",
};

const TRIGGER_ICONS: Record<string, string> = {
  reservation_completed:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  payment_completed:
    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  tag_added:
    "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  form_submitted:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  scheduled:
    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  manual:
    "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5",
};

const STEP_TYPE_LABELS: Record<string, string> = {
  send_message: "メッセージ送信",
  add_tag: "タグ追加",
  remove_tag: "タグ削除",
  switch_richmenu: "リッチメニュー切替",
  wait: "待機",
  condition: "条件分岐",
  webhook: "Webhook",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  active: "有効",
  paused: "一時停止",
  archived: "アーカイブ",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
};

/* ---------- メインページ ---------- */

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [detailWorkflow, setDetailWorkflow] = useState<any>(null);
  const [detailSteps, setDetailSteps] = useState<WorkflowStep[]>([]);
  const [detailExecutions, setDetailExecutions] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/line/workflows", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setWorkflows(d.workflows || []);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("このワークフローを削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/line/workflows/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        loadData();
      } else {
        const d = await res.json();
        alert(d.error || "削除に失敗しました");
      }
    } catch (e) {
      console.error("削除エラー:", e);
    }
  };

  const handleStatusChange = async (workflow: Workflow, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/line/workflows/${workflow.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadData();
      } else {
        const d = await res.json();
        alert(d.error || "ステータス変更に失敗しました");
      }
    } catch (e) {
      console.error("ステータス変更エラー:", e);
    }
  };

  const handleViewDetail = async (workflow: Workflow) => {
    try {
      const res = await fetch(`/api/admin/line/workflows/${workflow.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        setDetailWorkflow(d.workflow);
        setDetailSteps(d.steps || []);
        setDetailExecutions(d.executions || []);
      }
    } catch (e) {
      console.error("詳細取得エラー:", e);
    }
  };

  const closeDetail = () => {
    setDetailWorkflow(null);
    setDetailSteps([]);
    setDetailExecutions([]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ワークフロー</h1>
          <p className="text-sm text-gray-500 mt-1">
            トリガーに応じた自動アクションを設定
          </p>
        </div>
        <button
          onClick={() => {
            setEditingWorkflow(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </button>
      </div>

      {/* 一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-gray-500 mb-2">ワークフローがありません</p>
          <button
            onClick={() => {
              setEditingWorkflow(null);
              setShowModal(true);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            最初のワークフローを作成
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {wf.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[wf.status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {STATUS_LABELS[wf.status] || wf.status}
                    </span>
                  </div>
                  {wf.description && (
                    <p className="text-sm text-gray-500 mb-2">{wf.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={TRIGGER_ICONS[wf.trigger_type] || TRIGGER_ICONS.manual}
                        />
                      </svg>
                      {TRIGGER_LABELS[wf.trigger_type] || wf.trigger_type}
                    </span>
                    <span>{wf.step_count} ステップ</span>
                    <span>{wf.execution_count} 回実行</span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-2 ml-4">
                  {wf.status === "draft" && (
                    <button
                      onClick={() => handleStatusChange(wf, "active")}
                      className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition"
                    >
                      有効化
                    </button>
                  )}
                  {wf.status === "active" && (
                    <button
                      onClick={() => handleStatusChange(wf, "paused")}
                      className="px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition"
                    >
                      一時停止
                    </button>
                  )}
                  {wf.status === "paused" && (
                    <button
                      onClick={() => handleStatusChange(wf, "active")}
                      className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition"
                    >
                      再開
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDetail(wf)}
                    className="px-3 py-1.5 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition"
                  >
                    詳細
                  </button>
                  <button
                    onClick={() => {
                      setEditingWorkflow(wf);
                      setShowModal(true);
                    }}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 作成・編集モーダル */}
      {showModal && (
        <WorkflowModal
          workflow={editingWorkflow}
          onClose={() => {
            setShowModal(false);
            setEditingWorkflow(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingWorkflow(null);
            loadData();
          }}
        />
      )}

      {/* 詳細モーダル */}
      {detailWorkflow && (
        <DetailModal
          workflow={detailWorkflow}
          steps={detailSteps}
          executions={detailExecutions}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}

/* ---------- 作成・編集モーダル ---------- */

function WorkflowModal({
  workflow,
  onClose,
  onSaved,
}: {
  workflow: Workflow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!workflow;
  const [name, setName] = useState(workflow?.name || "");
  const [description, setDescription] = useState(workflow?.description || "");
  const [triggerType, setTriggerType] = useState(workflow?.trigger_type || "manual");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(
    workflow?.trigger_config || {},
  );
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState(false);

  // 編集時: 既存ステップを取得
  useEffect(() => {
    if (isEdit && workflow?.id) {
      setLoadingSteps(true);
      fetch(`/api/admin/line/workflows/${workflow.id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          setSteps(
            (d.steps || []).map((s: any) => ({
              id: s.id,
              sort_order: s.sort_order,
              step_type: s.step_type,
              config: s.config || {},
            })),
          );
        })
        .catch(console.error)
        .finally(() => setLoadingSteps(false));
    }
  }, [isEdit, workflow?.id]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { sort_order: prev.length, step_type: "send_message", config: {} },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sort_order: i })));
  };

  const updateStep = (idx: number, field: string, value: any) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        if (field === "step_type") {
          return { ...s, step_type: value, config: {} };
        }
        return { ...s, config: { ...s.config, [field]: value } };
      }),
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("ワークフロー名は必須です");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        steps,
      };

      const url = isEdit
        ? `/api/admin/line/workflows/${workflow!.id}`
        : "/api/admin/line/workflows";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      } else {
        const d = await res.json();
        alert(d.error || "保存に失敗しました");
      }
    } catch (e) {
      console.error("保存エラー:", e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit ? "ワークフロー編集" : "ワークフロー新規作成"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本情報 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ワークフロー名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例: 予約完了後のフォローメッセージ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="ワークフローの説明（任意）"
            />
          </div>

          {/* トリガー設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              トリガー <span className="text-red-500">*</span>
            </label>
            <select
              value={triggerType}
              onChange={(e) => {
                setTriggerType(e.target.value);
                setTriggerConfig({});
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* トリガー条件の追加設定 */}
          {triggerType === "tag_added" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象タグID
              </label>
              <input
                type="number"
                value={triggerConfig.tag_id || ""}
                onChange={(e) =>
                  setTriggerConfig({ ...triggerConfig, tag_id: Number(e.target.value) || undefined })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="特定のタグIDを指定（空欄で全タグ）"
              />
            </div>
          )}
          {triggerType === "form_submitted" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象フォームID
              </label>
              <input
                type="number"
                value={triggerConfig.form_id || ""}
                onChange={(e) =>
                  setTriggerConfig({ ...triggerConfig, form_id: Number(e.target.value) || undefined })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="特定のフォームIDを指定（空欄で全フォーム）"
              />
            </div>
          )}

          {/* ステップ設定 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">ステップ</h3>
              <button
                onClick={addStep}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                ステップ追加
              </button>
            </div>

            {loadingSteps ? (
              <div className="text-sm text-gray-500 text-center py-4">読み込み中...</div>
            ) : steps.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                ステップがありません。「ステップ追加」から追加してください。
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <StepEditor
                    key={idx}
                    index={idx}
                    step={step}
                    onUpdate={updateStep}
                    onRemove={removeStep}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : isEdit ? "更新" : "作成"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ステップ編集コンポーネント ---------- */

function StepEditor({
  index,
  step,
  onUpdate,
  onRemove,
}: {
  index: number;
  step: WorkflowStep;
  onUpdate: (idx: number, field: string, value: any) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">
          ステップ {index + 1}
        </span>
        <button
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* ステップタイプ選択 */}
        <select
          value={step.step_type}
          onChange={(e) => onUpdate(index, "step_type", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          {Object.entries(STEP_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* ステップタイプに応じた設定フォーム */}
        {step.step_type === "send_message" && (
          <div className="space-y-2">
            <select
              value={step.config.message_type || "text"}
              onChange={(e) => onUpdate(index, "message_type", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="text">テキスト直接入力</option>
              <option value="template">テンプレートから選択</option>
            </select>
            {step.config.message_type === "template" ? (
              <input
                type="number"
                value={step.config.template_id || ""}
                onChange={(e) => onUpdate(index, "template_id", Number(e.target.value) || undefined)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="テンプレートID"
              />
            ) : (
              <textarea
                value={step.config.text || ""}
                onChange={(e) => onUpdate(index, "text", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
                placeholder="メッセージ内容（{name}で患者名に置換）"
              />
            )}
          </div>
        )}

        {(step.step_type === "add_tag" || step.step_type === "remove_tag") && (
          <input
            type="number"
            value={step.config.tag_id || ""}
            onChange={(e) => onUpdate(index, "tag_id", Number(e.target.value) || undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="タグID"
          />
        )}

        {step.step_type === "switch_richmenu" && (
          <input
            type="number"
            value={step.config.menu_id || ""}
            onChange={(e) => onUpdate(index, "menu_id", Number(e.target.value) || undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="リッチメニューID"
          />
        )}

        {step.step_type === "wait" && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={step.config.duration_minutes || ""}
              onChange={(e) => onUpdate(index, "duration_minutes", Number(e.target.value) || 0)}
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="待機時間"
              min={1}
            />
            <span className="text-sm text-gray-500">分</span>
          </div>
        )}

        {step.step_type === "condition" && (
          <div className="space-y-2">
            <select
              value={step.config.condition_type || "has_tag"}
              onChange={(e) => onUpdate(index, "condition_type", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="has_tag">タグを持っている</option>
              <option value="in_segment">セグメントに含まれる</option>
              <option value="custom_field">カスタムフィールド</option>
            </select>
            {step.config.condition_type === "has_tag" && (
              <input
                type="number"
                value={step.config.tag_id || ""}
                onChange={(e) => onUpdate(index, "tag_id", Number(e.target.value) || undefined)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="タグID"
              />
            )}
            {step.config.condition_type === "in_segment" && (
              <input
                type="number"
                value={step.config.segment_id || ""}
                onChange={(e) => onUpdate(index, "segment_id", Number(e.target.value) || undefined)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="セグメントID"
              />
            )}
            {step.config.condition_type === "custom_field" && (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={step.config.field_name || ""}
                  onChange={(e) => onUpdate(index, "field_name", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="フィールド名"
                />
                <select
                  value={step.config.operator || "eq"}
                  onChange={(e) => onUpdate(index, "operator", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="eq">等しい</option>
                  <option value="neq">等しくない</option>
                  <option value="contains">含む</option>
                  <option value="gt">より大きい</option>
                  <option value="lt">より小さい</option>
                </select>
                <input
                  type="text"
                  value={step.config.field_value || ""}
                  onChange={(e) => onUpdate(index, "field_value", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="値"
                />
              </div>
            )}
          </div>
        )}

        {step.step_type === "webhook" && (
          <input
            type="url"
            value={step.config.url || ""}
            onChange={(e) => onUpdate(index, "url", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="https://example.com/webhook"
          />
        )}
      </div>
    </div>
  );
}

/* ---------- 詳細モーダル ---------- */

function DetailModal({
  workflow,
  steps,
  executions,
  onClose,
}: {
  workflow: any;
  steps: WorkflowStep[];
  executions: any[];
  onClose: () => void;
}) {
  const EXEC_STATUS_LABELS: Record<string, string> = {
    running: "実行中",
    completed: "完了",
    failed: "失敗",
    skipped: "スキップ",
    waiting: "待機中",
  };

  const EXEC_STATUS_COLORS: Record<string, string> = {
    running: "text-blue-600",
    completed: "text-green-600",
    failed: "text-red-600",
    skipped: "text-gray-600",
    waiting: "text-yellow-600",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{workflow.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ステータス:</span>{" "}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[workflow.status] || "bg-gray-100 text-gray-800"}`}
              >
                {STATUS_LABELS[workflow.status] || workflow.status}
              </span>
            </div>
            <div>
              <span className="text-gray-500">トリガー:</span>{" "}
              {TRIGGER_LABELS[workflow.trigger_type] || workflow.trigger_type}
            </div>
            {workflow.description && (
              <div className="col-span-2">
                <span className="text-gray-500">説明:</span> {workflow.description}
              </div>
            )}
          </div>

          {/* ステップ一覧 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              ステップ ({steps.length})
            </h3>
            {steps.length === 0 ? (
              <p className="text-sm text-gray-400">ステップが設定されていません</p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatStepConfig(step)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 実行ログ */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              最近の実行ログ ({executions.length})
            </h3>
            {executions.length === 0 ? (
              <p className="text-sm text-gray-400">実行履歴がありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">実行日時</th>
                      <th className="pb-2 font-medium">ステータス</th>
                      <th className="pb-2 font-medium">進捗</th>
                      <th className="pb-2 font-medium">エラー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((exec) => (
                      <tr key={exec.id} className="border-b border-gray-100">
                        <td className="py-2">
                          {new Date(exec.started_at).toLocaleString("ja-JP")}
                        </td>
                        <td className="py-2">
                          <span className={EXEC_STATUS_COLORS[exec.status] || ""}>
                            {EXEC_STATUS_LABELS[exec.status] || exec.status}
                          </span>
                        </td>
                        <td className="py-2">
                          ステップ {exec.current_step}
                        </td>
                        <td className="py-2 text-red-500 text-xs truncate max-w-[200px]">
                          {exec.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ユーティリティ ---------- */

function formatStepConfig(step: WorkflowStep): string {
  const c = step.config;
  switch (step.step_type) {
    case "send_message":
      if (c.message_type === "template") return `テンプレート #${c.template_id}`;
      return c.text ? `"${c.text.substring(0, 30)}${c.text.length > 30 ? "..." : ""}"` : "";
    case "add_tag":
    case "remove_tag":
      return `タグID: ${c.tag_id || "未設定"}`;
    case "switch_richmenu":
      return `メニューID: ${c.menu_id || "未設定"}`;
    case "wait":
      return `${c.duration_minutes || 0}分待機`;
    case "condition":
      return c.condition_type === "has_tag"
        ? `タグ #${c.tag_id}`
        : c.condition_type === "in_segment"
          ? `セグメント #${c.segment_id}`
          : `${c.field_name} ${c.operator} ${c.field_value}`;
    case "webhook":
      return c.url || "URL未設定";
    default:
      return "";
  }
}
