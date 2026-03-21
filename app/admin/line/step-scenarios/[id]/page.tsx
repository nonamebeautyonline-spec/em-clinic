"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import {
  ConditionBuilderModal,
  type ConditionRule,
  type TagDef,
  type MarkDef as CBMarkDef,
} from "../../_components/ConditionBuilder";
import { TemplatePicker } from "../../templates/_components/TemplatePicker";

/* ---------- 型定義 ---------- */
interface BranchDef {
  label: string;
  condition_rules: ConditionRule[];
  next_step: number | null;
}

interface ABVariant {
  label: string;
  weight: number; // パーセンテージ（全バリアントの合計 = 100）
  next_step: number | null;
}

interface StepItem {
  id?: number;
  sort_order: number;
  delay_type: "minutes" | "hours" | "days";
  delay_value: number;
  send_time: string | null;
  step_type: string;
  content: string | null;
  template_id: number | null;
  tag_id: number | null;
  mark: string | null;
  menu_id: number | null;
  // 条件分岐
  condition_rules: ConditionRule[];
  branch_true_step: number | null;
  branch_false_step: number | null;
  // N分岐（新方式）
  branches: BranchDef[];
  // A/Bテスト
  ab_variants: ABVariant[];
  // 離脱条件
  exit_condition_rules: ConditionRule[];
  exit_action: string;
  exit_jump_to: number | null;
}

interface Scenario {
  id: number;
  name: string;
  trigger_type: string;
  trigger_tag_id: number | null;
  trigger_keyword: string | null;
  trigger_keyword_match: string | null;
  condition_rules: ConditionRule[];
  is_enabled: boolean;
}

interface Enrollment {
  id: number;
  patient_id: string;
  patient_name: string;
  status: string;
  current_step_order: number;
  next_send_at: string | null;
  enrolled_at: string;
}

interface ExecutionLog {
  id: number;
  enrollment_id: number;
  step_order: number;
  step_type: string;
  status: string;
  detail: Record<string, unknown>;
  executed_at: string;
}

interface Tag { id: number; name: string; color: string; }
interface Template { id: number; name: string; }
interface MarkDef { mark: string; label: string; color: string; }

const TRIGGER_TYPES = [
  { value: "follow", label: "友だち追加時" },
  { value: "tag_add", label: "タグ追加時" },
  { value: "keyword", label: "キーワード受信時" },
  { value: "reservation_made", label: "予約時" },
  { value: "checkout_completed", label: "決済完了時" },
  { value: "reorder_approved", label: "再処方承認時" },
  { value: "manual", label: "手動登録のみ" },
];

const STEP_TYPES = [
  { value: "send_text", label: "テキスト送信" },
  { value: "send_template", label: "テンプレート送信" },
  { value: "tag_add", label: "タグ追加" },
  { value: "tag_remove", label: "タグ除去" },
  { value: "mark_change", label: "対応マーク変更" },
  { value: "menu_change", label: "リッチメニュー変更" },
  { value: "condition", label: "条件分岐" },
  { value: "ab_test", label: "A/Bテスト" },
];

const DELAY_TYPES = [
  { value: "minutes", label: "分後" },
  { value: "hours", label: "時間後" },
  { value: "days", label: "日後" },
];

const MATCH_TYPES = [
  { value: "partial", label: "部分一致" },
  { value: "exact", label: "完全一致" },
  { value: "regex", label: "正規表現" },
];

const EXIT_ACTIONS = [
  { value: "exit", label: "シナリオ離脱" },
  { value: "skip", label: "このステップをスキップ" },
  { value: "jump", label: "指定ステップへジャンプ" },
];

const EMPTY_STEP: StepItem = {
  sort_order: 0,
  delay_type: "days",
  delay_value: 1,
  send_time: "10:00",
  step_type: "send_text",
  content: "",
  template_id: null,
  tag_id: null,
  mark: null,
  menu_id: null,
  condition_rules: [],
  branch_true_step: null,
  branch_false_step: null,
  branches: [],
  ab_variants: [],
  exit_condition_rules: [],
  exit_action: "exit",
  exit_jump_to: null,
};

/* ---------- メインページ ---------- */
export default function StepScenarioEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const scenarioId = parseInt(id);

  // シナリオ詳細データ
  const detailKey = `/api/admin/line/step-scenarios/${scenarioId}`;
  const { data: detailData, isLoading: detailLoading } = useSWR<{ scenario: Scenario; steps: Partial<StepItem>[]; stats: { active: number; completed: number } }>(detailKey);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [stats, setStats] = useState({ active: 0, completed: 0 });

  // detailDataが変わったらローカルstateに反映（編集用）
  useEffect(() => {
    if (detailData?.scenario) {
      setScenario(detailData.scenario);
      const enrichedSteps = (detailData.steps || []).map((s: Partial<StepItem>) => ({
        ...EMPTY_STEP,
        ...s,
        condition_rules: s.condition_rules || [],
        exit_condition_rules: s.exit_condition_rules || [],
        exit_action: s.exit_action || "exit",
      }));
      setSteps(enrichedSteps);
      setStats(detailData.stats || { active: 0, completed: 0 });
    }
  }, [detailData]);

  // マスタデータ
  const { data: tagData, isLoading: tagLoading } = useSWR<{ tags: Tag[] }>("/api/admin/line/tags");
  const { data: tplData, isLoading: tplLoading } = useSWR<{ templates: Template[] }>("/api/admin/line/templates");
  const { data: markData, isLoading: markLoading } = useSWR<{ marks: MarkDef[] }>("/api/admin/line/marks");
  const { data: productsData } = useSWR<{ products: { code: string; title: string }[] }>("/api/admin/products");

  const tags = tagData?.tags || [];
  const templates = tplData?.templates || [];
  const marks = markData?.marks || [];
  const cbProducts = (productsData?.products || []).map(p => ({ code: p.code, title: p.title }));

  const loading = detailLoading || tagLoading || tplLoading || markLoading;

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "enrollments" | "logs">("steps");

  // 登録者一覧（タブ選択時のみ取得）
  const enrollmentsKey = activeTab === "enrollments" ? `/api/admin/line/step-scenarios/${scenarioId}/enrollments` : null;
  const { data: enrollmentsData } = useSWR<{ enrollments: Enrollment[] }>(enrollmentsKey);
  const enrollments = enrollmentsData?.enrollments || [];

  // 実行ログ（タブ選択時のみ取得）
  const logsKey = activeTab === "logs" ? `/api/admin/line/step-scenarios/${scenarioId}/logs` : null;
  const { data: logsData } = useSWR<{ logs: ExecutionLog[] }>(logsKey);
  const executionLogs = logsData?.logs || [];

  // 条件ビルダーモーダル
  const [condModalTarget, setCondModalTarget] = useState<{
    stepIndex: number;
    field: "condition_rules" | "exit_condition_rules";
  } | null>(null);
  const [branchCondTarget, setBranchCondTarget] = useState<{
    stepIndex: number;
    branchIndex: number;
  } | null>(null);

  // 手動登録モーダル
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollPatientIds, setEnrollPatientIds] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // 保存
  const handleSave = async () => {
    if (!scenario) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/line/step-scenarios", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scenario.id,
          name: scenario.name,
          trigger_type: scenario.trigger_type,
          trigger_tag_id: scenario.trigger_tag_id,
          trigger_keyword: scenario.trigger_keyword,
          trigger_keyword_match: scenario.trigger_keyword_match,
          condition_rules: scenario.condition_rules,
          is_enabled: scenario.is_enabled,
          steps: steps.map((s, i) => ({ ...s, sort_order: i })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
        return;
      }
      alert("保存しました");
      mutate(detailKey);
    } finally {
      setSaving(false);
    }
  };

  // ステップ追加
  const addStep = (type?: string) => {
    setSteps([...steps, {
      ...EMPTY_STEP,
      sort_order: steps.length,
      step_type: type || "send_text",
      delay_value: type === "condition" ? 0 : 1,
      delay_type: type === "condition" ? "minutes" : "days",
    }]);
  };

  // ステップ削除
  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // ステップ更新
  const updateStep = (index: number, patch: Partial<StepItem>) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  // ステップ移動
  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const next = [...steps];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setSteps(next);
  };

  // 登録者除外
  const handleExitEnrollment = async (patientId: string) => {
    if (!confirm("この登録者をシナリオから除外しますか？")) return;
    await fetch(`/api/admin/line/step-scenarios/${scenarioId}/enrollments?patient_id=${patientId}`, {
      method: "DELETE",
      credentials: "include",
    });
    mutate(enrollmentsKey);
  };

  // 手動登録
  const handleManualEnroll = async () => {
    const ids = enrollPatientIds
      .split(/[,\n\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/admin/line/step-scenarios/${scenarioId}/enrollments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_ids: ids }),
      });
      if (res.ok) {
        const d = await res.json();
        alert(`${d.enrolled}名を登録しました`);
        setShowEnrollModal(false);
        setEnrollPatientIds("");
        mutate(enrollmentsKey);
      }
    } catch (e) {
      console.error("登録エラー:", e);
    } finally {
      setEnrolling(false);
    }
  };

  // ConditionBuilder用のmarks変換
  const cbMarks: CBMarkDef[] = marks.map((m, i) => ({
    id: i,
    value: m.mark,
    label: m.label,
    color: m.color,
  }));

  const cbTags: TagDef[] = tags;

  if (loading || !scenario) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/line/step-scenarios")}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 一覧
          </button>
          <h1 className="text-xl font-bold text-gray-900">シナリオ編集</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScenario({ ...scenario, is_enabled: !scenario.is_enabled })}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              scenario.is_enabled
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            {scenario.is_enabled ? "配信中" : "停止中"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-4">基本設定</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">シナリオ名</label>
            <input
              type="text"
              value={scenario.name}
              onChange={(e) => setScenario({ ...scenario, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">トリガー</label>
            <select
              value={scenario.trigger_type}
              onChange={(e) => setScenario({ ...scenario, trigger_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {scenario.trigger_type === "tag_add" && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">トリガータグ</label>
              <select
                value={scenario.trigger_tag_id || ""}
                onChange={(e) => setScenario({ ...scenario, trigger_tag_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                <option value="">タグを選択...</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {scenario.trigger_type === "keyword" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">キーワード</label>
                <input
                  type="text"
                  value={scenario.trigger_keyword || ""}
                  onChange={(e) => setScenario({ ...scenario, trigger_keyword: e.target.value })}
                  placeholder="例: 予約"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">マッチ方法</label>
                <select
                  value={scenario.trigger_keyword_match || "partial"}
                  onChange={(e) => setScenario({ ...scenario, trigger_keyword_match: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                >
                  {MATCH_TYPES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[
          { key: "steps" as const, label: "ステップ設定", count: steps.length },
          { key: "enrollments" as const, label: "登録者", count: stats.active },
          { key: "logs" as const, label: "実行ログ", count: null },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#06C755] text-[#06C755]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ステップ設定 */}
      {activeTab === "steps" && (
        <div>
          {steps.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              ステップはまだありません
            </div>
          ) : (
            <div className="space-y-1">
              {steps.map((step, index) => (
                <div key={index}>
                  <StepCard
                    step={step}
                    index={index}
                    total={steps.length}
                    allSteps={steps}
                    tags={tags}
                    templates={templates}
                    marks={marks}
                    onUpdate={(patch) => updateStep(index, patch)}
                    onRemove={() => removeStep(index)}
                    onMove={(dir) => moveStep(index, dir)}
                    onEditCondition={(field) => setCondModalTarget({ stepIndex: index, field })}
                    onEditBranchCondition={(branchIndex) => setBranchCondTarget({ stepIndex: index, branchIndex })}
                  />
                  {/* ステップ間の接続線 */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="w-0.5 h-4 bg-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => addStep()}
              className="flex-1 py-3 border-2 border-dashed border-gray-300 text-gray-400 text-sm rounded-lg hover:border-[#06C755] hover:text-[#06C755] transition-colors"
            >
              + ステップを追加
            </button>
            <button
              onClick={() => addStep("condition")}
              className="py-3 px-4 border-2 border-dashed border-purple-200 text-purple-400 text-sm rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              + 条件分岐
            </button>
          </div>
        </div>
      )}

      {/* 登録者タブ */}
      {activeTab === "enrollments" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>アクティブ: <span className="font-medium text-green-600">{stats.active}</span></span>
              <span>完了: <span className="font-medium text-blue-600">{stats.completed}</span></span>
            </div>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + 手動登録
            </button>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              登録者はまだいません
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="px-4 py-2 text-left">患者ID</th>
                    <th className="px-4 py-2 text-left">氏名</th>
                    <th className="px-4 py-2 text-center">状態</th>
                    <th className="px-4 py-2 text-center">ステップ</th>
                    <th className="px-4 py-2 text-left">次回送信</th>
                    <th className="px-4 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs">{e.patient_id}</td>
                      <td className="px-4 py-2 text-gray-900">{e.patient_name || "-"}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full ${
                          e.status === "active" ? "bg-green-50 text-green-700" :
                          e.status === "completed" ? "bg-blue-50 text-blue-700" :
                          e.status === "paused" ? "bg-yellow-50 text-yellow-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {e.status === "active" ? "配信中" :
                           e.status === "completed" ? "完了" :
                           e.status === "paused" ? "一時停止" : "離脱"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-gray-500 text-xs">
                        {e.current_step_order + 1} / {steps.length}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {e.next_send_at ? formatDate(e.next_send_at) : "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {e.status === "active" && (
                          <button
                            onClick={() => handleExitEnrollment(e.patient_id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            除外
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 実行ログ */}
      {activeTab === "logs" && (
        <div>
          {executionLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              実行ログはまだありません
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="px-4 py-2 text-left">実行日時</th>
                    <th className="px-4 py-2 text-center">ステップ</th>
                    <th className="px-4 py-2 text-center">タイプ</th>
                    <th className="px-4 py-2 text-center">ステータス</th>
                    <th className="px-4 py-2 text-left">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {executionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {formatDate(log.executed_at)}
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-gray-600">
                        {log.step_order + 1}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {STEP_TYPES.find((t) => t.value === log.step_type)?.label || log.step_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full ${
                          log.status === "success" ? "bg-green-50 text-green-700" :
                          log.status === "failed" ? "bg-red-50 text-red-700" :
                          log.status === "skipped" ? "bg-yellow-50 text-yellow-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {log.status === "success" ? "成功" :
                           log.status === "failed" ? "失敗" :
                           log.status === "skipped" ? "スキップ" :
                           log.status === "condition_false" ? "条件不一致" : log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                        {log.detail && Object.keys(log.detail).length > 0
                          ? JSON.stringify(log.detail)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 条件ビルダーモーダル（旧2分岐 & 離脱条件用） */}
      {condModalTarget && (
        <ConditionBuilderModal
          condition={{
            enabled: true,
            rules: steps[condModalTarget.stepIndex]?.[condModalTarget.field] || [],
          }}
          tags={cbTags}
          marks={cbMarks}
          products={cbProducts}
          onSave={(cond) => {
            updateStep(condModalTarget.stepIndex, { [condModalTarget.field]: cond.rules });
            setCondModalTarget(null);
          }}
          onClose={() => setCondModalTarget(null)}
        />
      )}

      {/* 条件ビルダーモーダル（N分岐用） */}
      {branchCondTarget && (
        <ConditionBuilderModal
          condition={{
            enabled: true,
            rules: steps[branchCondTarget.stepIndex]?.branches?.[branchCondTarget.branchIndex]?.condition_rules || [],
          }}
          tags={cbTags}
          marks={cbMarks}
          products={cbProducts}
          onSave={(cond) => {
            const step = steps[branchCondTarget.stepIndex];
            if (step?.branches) {
              const updated = [...step.branches];
              updated[branchCondTarget.branchIndex] = {
                ...updated[branchCondTarget.branchIndex],
                condition_rules: cond.rules,
              };
              updateStep(branchCondTarget.stepIndex, { branches: updated });
            }
            setBranchCondTarget(null);
          }}
          onClose={() => setBranchCondTarget(null)}
        />
      )}

      {/* 手動登録モーダル */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-sm font-bold text-gray-700 mb-3">手動登録</h3>
            <p className="text-xs text-gray-500 mb-3">
              患者IDをカンマ区切りまたは改行区切りで入力してください
            </p>
            <textarea
              value={enrollPatientIds}
              onChange={(e) => setEnrollPatientIds(e.target.value)}
              rows={5}
              placeholder="例: P001, P002, P003"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowEnrollModal(false); setEnrollPatientIds(""); }}
                className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleManualEnroll}
                disabled={enrolling || !enrollPatientIds.trim()}
                className="px-4 py-2 text-xs bg-[#06C755] text-white rounded-lg hover:bg-[#05b34c] disabled:opacity-50"
              >
                {enrolling ? "登録中..." : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- ステップカード ---------- */
function StepCard({
  step, index, total, allSteps, tags, templates, marks,
  onUpdate, onRemove, onMove, onEditCondition, onEditBranchCondition,
}: {
  step: StepItem;
  index: number;
  total: number;
  allSteps: StepItem[];
  tags: Tag[];
  templates: Template[];
  marks: MarkDef[];
  onUpdate: (patch: Partial<StepItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onEditCondition: (field: "condition_rules" | "exit_condition_rules") => void;
  onEditBranchCondition: (branchIndex: number) => void;
}) {
  const [showExitCondition, setShowExitCondition] = useState(
    (step.exit_condition_rules?.length || 0) > 0
  );

  const isConditionStep = step.step_type === "condition";
  const isABTestStep = step.step_type === "ab_test";

  // ステップ番号ラベルの色
  const badgeColor = isConditionStep ? "bg-purple-500" : isABTestStep ? "bg-amber-500" : "bg-[#06C755]";

  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${
      isConditionStep ? "border-purple-200" : isABTestStep ? "border-amber-200" : "border-gray-200"
    }`}>
      {/* ステップヘッダー */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isConditionStep ? "bg-purple-50 border-purple-100" : isABTestStep ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 flex items-center justify-center ${badgeColor} text-white text-xs font-bold rounded-full`}>
            {index + 1}
          </span>
          <span className="text-xs text-gray-500">
            {isConditionStep ? "条件分岐" : isABTestStep ? "A/Bテスト" : `ステップ ${index + 1}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="上に移動">
            ▲
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="下に移動">
            ▼
          </button>
          <button onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600 ml-2" title="削除">
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 遅延設定（条件分岐では非表示） */}
        {!isConditionStep && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">配信タイミング:</span>
            <input
              type="number" min={0} value={step.delay_value}
              onChange={(e) => onUpdate({ delay_value: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <select value={step.delay_type}
              onChange={(e) => onUpdate({ delay_type: e.target.value as StepItem["delay_type"] })}
              className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]">
              {DELAY_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            {step.delay_type === "days" && (
              <>
                <span className="text-xs text-gray-400 ml-2">送信時刻:</span>
                <input type="time" value={step.send_time || "10:00"}
                  onChange={(e) => onUpdate({ send_time: e.target.value })}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
              </>
            )}
          </div>
        )}

        {/* アクション種別 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">アクション</label>
          <select value={step.step_type}
            onChange={(e) => onUpdate({ step_type: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]">
            {STEP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* ===== 条件分岐ステップ ===== */}
        {isConditionStep && (
          <div className="space-y-3">
            {/* 分岐モード切替 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">分岐方式:</span>
              <button
                onClick={() => {
                  if ((step.branches?.length || 0) === 0) {
                    // 旧2分岐 → N分岐に移行
                    const newBranches: BranchDef[] = [
                      { label: "条件1", condition_rules: step.condition_rules || [], next_step: step.branch_true_step },
                      { label: "デフォルト", condition_rules: [], next_step: step.branch_false_step },
                    ];
                    onUpdate({ branches: newBranches });
                  } else {
                    // N分岐 → 旧2分岐に戻す
                    onUpdate({ branches: [] });
                  }
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  (step.branches?.length || 0) > 0
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {(step.branches?.length || 0) > 0 ? `N分岐（${step.branches.length}）` : "2分岐（True/False）"}
              </button>
            </div>

            {(step.branches?.length || 0) > 0 ? (
              /* ===== N分岐モード ===== */
              <div className="space-y-2">
                {step.branches.map((branch, bi) => {
                  const isDefault = !branch.condition_rules || branch.condition_rules.length === 0;
                  const branchColors = [
                    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", btn: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
                    { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", btn: "bg-green-100 text-green-700 hover:bg-green-200" },
                    { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", btn: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
                    { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", btn: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
                    { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", btn: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200" },
                  ];
                  const color = isDefault
                    ? { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", btn: "bg-gray-100 text-gray-700 hover:bg-gray-200" }
                    : branchColors[bi % branchColors.length];

                  return (
                    <div key={bi} className={`${color.bg} border ${color.border} rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={branch.label}
                            onChange={(e) => {
                              const updated = [...step.branches];
                              updated[bi] = { ...updated[bi], label: e.target.value };
                              onUpdate({ branches: updated });
                            }}
                            className={`px-2 py-0.5 text-xs font-medium rounded border-none bg-transparent ${color.text} focus:outline-none focus:ring-1 focus:ring-purple-300 w-24`}
                          />
                          {isDefault && (
                            <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                              デフォルト
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!isDefault && (
                            <button
                              onClick={() => onEditBranchCondition(bi)}
                              className={`px-2 py-0.5 text-[10px] rounded ${color.btn} transition-colors`}
                            >
                              {branch.condition_rules.length > 0 ? "条件編集" : "条件設定"}
                            </button>
                          )}
                          {step.branches.length > 2 && (
                            <button
                              onClick={() => {
                                const updated = step.branches.filter((_, i) => i !== bi);
                                onUpdate({ branches: updated });
                              }}
                              className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 条件表示 */}
                      {!isDefault && branch.condition_rules.length > 0 && (
                        <div className="space-y-0.5 mb-2">
                          {branch.condition_rules.map((r, ri) => (
                            <div key={ri} className="text-[10px] text-gray-600 bg-white px-2 py-0.5 rounded">
                              {formatConditionSummary(r)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ジャンプ先 */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${color.text}`}>→</span>
                        <select
                          value={branch.next_step ?? ""}
                          onChange={(e) => {
                            const updated = [...step.branches];
                            updated[bi] = { ...updated[bi], next_step: e.target.value ? parseInt(e.target.value) : null };
                            onUpdate({ branches: updated });
                          }}
                          className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-300"
                        >
                          <option value="">次のステップへ</option>
                          {allSteps.map((_, si) => (
                            <option key={si} value={si}>ステップ {si + 1}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}

                {/* 分岐追加ボタン */}
                <button
                  onClick={() => {
                    // デフォルト分岐の前に挿入
                    const updated = [...step.branches];
                    const defaultIdx = updated.findIndex((b) => !b.condition_rules || b.condition_rules.length === 0);
                    const newBranch: BranchDef = {
                      label: `条件${updated.length}`,
                      condition_rules: [],
                      next_step: null,
                    };
                    if (defaultIdx >= 0) {
                      updated.splice(defaultIdx, 0, newBranch);
                    } else {
                      updated.push(newBranch);
                    }
                    onUpdate({ branches: updated });
                  }}
                  className="w-full py-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-dashed border-purple-200"
                >
                  + 分岐を追加
                </button>
              </div>
            ) : (
              /* ===== 旧2分岐モード ===== */
              <>
                {/* 条件ルール */}
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-700">分岐条件（AND結合）</span>
                    <button
                      onClick={() => onEditCondition("condition_rules")}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      {(step.condition_rules?.length || 0) > 0 ? "条件を編集" : "条件を設定"}
                    </button>
                  </div>
                  {(step.condition_rules?.length || 0) > 0 ? (
                    <div className="space-y-1">
                      {step.condition_rules.map((r, i) => (
                        <div key={i} className="text-xs text-purple-600 bg-white px-2 py-1 rounded">
                          {formatConditionSummary(r)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-purple-400">条件が未設定です</p>
                  )}
                </div>

                {/* 分岐先 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <label className="block text-xs font-medium text-green-700 mb-1">
                      True（条件一致）→
                    </label>
                    <select
                      value={step.branch_true_step ?? ""}
                      onChange={(e) => onUpdate({ branch_true_step: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-2 py-1.5 text-xs border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="">次のステップへ</option>
                      {allSteps.map((_, si) => (
                        <option key={si} value={si}>ステップ {si + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <label className="block text-xs font-medium text-red-700 mb-1">
                      False（条件不一致）→
                    </label>
                    <select
                      value={step.branch_false_step ?? ""}
                      onChange={(e) => onUpdate({ branch_false_step: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-2 py-1.5 text-xs border border-red-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">次のステップへ</option>
                      {allSteps.map((_, si) => (
                        <option key={si} value={si}>ステップ {si + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== A/Bテストステップ ===== */}
        {step.step_type === "ab_test" && (
          <div className="space-y-3">
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-amber-700">🧪 A/Bテスト バリアント</span>
                <span className="text-[10px] text-amber-500">
                  合計: {(step.ab_variants || []).reduce((s, v) => s + (v.weight || 0), 0)}%
                </span>
              </div>

              <div className="space-y-2">
                {(step.ab_variants || []).map((variant, vi) => {
                  const variantLabels = ["A", "B", "C", "D", "E"];
                  const variantColors = ["bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700"];
                  return (
                    <div key={vi} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-amber-100">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${variantColors[vi % variantColors.length]}`}>
                        {variantLabels[vi] || vi + 1}
                      </span>
                      <input
                        type="text"
                        value={variant.label}
                        onChange={(e) => {
                          const updated = [...(step.ab_variants || [])];
                          updated[vi] = { ...updated[vi], label: e.target.value };
                          onUpdate({ ab_variants: updated });
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                        placeholder="バリアント名"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={variant.weight}
                          onChange={(e) => {
                            const updated = [...(step.ab_variants || [])];
                            updated[vi] = { ...updated[vi], weight: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) };
                            onUpdate({ ab_variants: updated });
                          }}
                          className="w-14 px-1.5 py-1 text-xs text-center border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <span className="text-[10px] text-gray-400">→</span>
                      <select
                        value={variant.next_step ?? ""}
                        onChange={(e) => {
                          const updated = [...(step.ab_variants || [])];
                          updated[vi] = { ...updated[vi], next_step: e.target.value ? parseInt(e.target.value) : null };
                          onUpdate({ ab_variants: updated });
                        }}
                        className="w-28 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                      >
                        <option value="">次のステップ</option>
                        {allSteps.map((_, si) => (
                          <option key={si} value={si}>ステップ {si + 1}</option>
                        ))}
                      </select>
                      {(step.ab_variants || []).length > 2 && (
                        <button
                          onClick={() => {
                            const updated = (step.ab_variants || []).filter((_, i) => i !== vi);
                            onUpdate({ ab_variants: updated });
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-2">
                {(step.ab_variants || []).length === 0 && (
                  <button
                    onClick={() => onUpdate({
                      ab_variants: [
                        { label: "バリアントA", weight: 50, next_step: null },
                        { label: "バリアントB", weight: 50, next_step: null },
                      ],
                    })}
                    className="flex-1 py-1.5 text-xs text-amber-600 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                  >
                    A/Bテストを設定
                  </button>
                )}
                {(step.ab_variants || []).length >= 2 && (step.ab_variants || []).length < 5 && (
                  <button
                    onClick={() => {
                      const updated = [...(step.ab_variants || [])];
                      updated.push({ label: `バリアント${["A","B","C","D","E"][updated.length] || updated.length + 1}`, weight: 0, next_step: null });
                      onUpdate({ ab_variants: updated });
                    }}
                    className="flex-1 py-1.5 text-xs text-amber-600 bg-white hover:bg-amber-50 rounded-lg transition-colors border border-dashed border-amber-200"
                  >
                    + バリアント追加
                  </button>
                )}
                {(step.ab_variants || []).length >= 2 && (
                  <button
                    onClick={() => {
                      const total = (step.ab_variants || []).reduce((s, v) => s + v.weight, 0);
                      if (total === 0) return;
                      const even = Math.floor(100 / (step.ab_variants || []).length);
                      const remainder = 100 - even * (step.ab_variants || []).length;
                      const updated = (step.ab_variants || []).map((v, i) => ({
                        ...v,
                        weight: even + (i === 0 ? remainder : 0),
                      }));
                      onUpdate({ ab_variants: updated });
                    }}
                    className="px-3 py-1.5 text-xs text-gray-500 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                  >
                    均等配分
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== 通常ステップのアクション詳細 ===== */}
        {step.step_type === "send_text" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              メッセージ
              <span className="text-gray-300 ml-1">（{"{name}"} {"{patient_id}"} {"{send_date}"} 使用可）</span>
            </label>
            <textarea value={step.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={3} placeholder="配信メッセージを入力..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
          </div>
        )}

        {step.step_type === "send_template" && (
          <div>
            <TemplatePicker
              value={step.template_id}
              templates={templates}
              onSelect={(id) => onUpdate({ template_id: id })}
              onClear={() => onUpdate({ template_id: null })}
              label="テンプレート"
              compact
            />
          </div>
        )}

        {(step.step_type === "tag_add" || step.step_type === "tag_remove") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {step.step_type === "tag_add" ? "追加するタグ" : "除去するタグ"}
            </label>
            <select value={step.tag_id || ""}
              onChange={(e) => onUpdate({ tag_id: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]">
              <option value="">タグを選択...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {step.step_type === "mark_change" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">対応マーク</label>
            <select value={step.mark || ""}
              onChange={(e) => onUpdate({ mark: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]">
              <option value="">マークを選択...</option>
              {marks.map((m) => (
                <option key={m.mark} value={m.mark}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {step.step_type === "menu_change" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">リッチメニューID</label>
            <input type="number" value={step.menu_id || ""}
              onChange={(e) => onUpdate({ menu_id: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="メニューIDを入力"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]" />
          </div>
        )}

        {/* ===== 離脱条件（条件分岐ステップ以外） ===== */}
        {!isConditionStep && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <button
              onClick={() => setShowExitCondition(!showExitCondition)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className={`transition-transform ${showExitCondition ? "rotate-90" : ""}`}>▶</span>
              離脱条件
              {(step.exit_condition_rules?.length || 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded-full">
                  {step.exit_condition_rules.length}件
                </span>
              )}
            </button>
            {showExitCondition && (
              <div className="mt-2 bg-orange-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-700">
                    ステップ実行前に条件をチェックし、一致した場合のアクション:
                  </span>
                  <button
                    onClick={() => onEditCondition("exit_condition_rules")}
                    className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    {(step.exit_condition_rules?.length || 0) > 0 ? "条件を編集" : "条件を設定"}
                  </button>
                </div>

                {(step.exit_condition_rules?.length || 0) > 0 && (
                  <div className="space-y-1">
                    {step.exit_condition_rules.map((r, i) => (
                      <div key={i} className="text-xs text-orange-600 bg-white px-2 py-1 rounded">
                        {formatConditionSummary(r)}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-xs text-orange-600">アクション:</label>
                  <select
                    value={step.exit_action || "exit"}
                    onChange={(e) => onUpdate({ exit_action: e.target.value })}
                    className="px-2 py-1 text-xs border border-orange-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {EXIT_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>

                  {step.exit_action === "jump" && (
                    <select
                      value={step.exit_jump_to ?? ""}
                      onChange={(e) => onUpdate({ exit_jump_to: e.target.value ? parseInt(e.target.value) : null })}
                      className="px-2 py-1 text-xs border border-orange-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="">ジャンプ先を選択</option>
                      {allSteps.map((_, si) => (
                        <option key={si} value={si}>ステップ {si + 1}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 条件サマリー表示 ---------- */
function formatConditionSummary(rule: ConditionRule): string {
  switch (rule.type) {
    case "tag":
      return `タグ: ${rule.tag_ids?.length || 0}件 (${rule.tag_match || "any_include"})`;
    case "mark":
      return `マーク: ${rule.mark_values?.join(", ") || "未設定"}`;
    case "last_payment_date": {
      const from = rule.payment_date_from || "";
      const to = rule.payment_date_to || "";
      if (from && to) return `最終決済日 ${from}〜${to}`;
      if (from) return `最終決済日 ${from}以降`;
      if (to) return `最終決済日 ${to}以前`;
      return "最終決済日";
    }
    case "product_purchase": {
      const count = rule.product_codes?.length || 0;
      const action = rule.product_match === "not_purchased" ? "未購入" : "購入済み";
      return `商品 ${count}件 ${action}`;
    }
    case "reorder_count":
      return `再処方回数 ${rule.behavior_operator || ">="} ${rule.behavior_value || "0"}`;
    default:
      return `${rule.type}`;
  }
}

/* ---------- ユーティリティ ---------- */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${mo}/${da} ${h}:${mi}`;
}
