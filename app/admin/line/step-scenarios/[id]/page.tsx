"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

/* ---------- 型定義 ---------- */
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
}

interface Scenario {
  id: number;
  name: string;
  trigger_type: string;
  trigger_tag_id: number | null;
  trigger_keyword: string | null;
  trigger_keyword_match: string | null;
  condition_rules: any[];
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

interface Tag { id: number; name: string; color: string; }
interface Template { id: number; name: string; }
interface MarkDef { mark: string; label: string; color: string; }

const TRIGGER_TYPES = [
  { value: "follow", label: "友だち追加時" },
  { value: "tag_add", label: "タグ追加時" },
  { value: "keyword", label: "キーワード受信時" },
  { value: "manual", label: "手動登録のみ" },
];

const STEP_TYPES = [
  { value: "send_text", label: "テキスト送信" },
  { value: "send_template", label: "テンプレート送信" },
  { value: "tag_add", label: "タグ追加" },
  { value: "tag_remove", label: "タグ除去" },
  { value: "mark_change", label: "対応マーク変更" },
  { value: "menu_change", label: "リッチメニュー変更" },
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
};

/* ---------- メインページ ---------- */
export default function StepScenarioEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const scenarioId = parseInt(id);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [stats, setStats] = useState({ active: 0, completed: 0 });
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "enrollments">("steps");

  // マスタデータ
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [marks, setMarks] = useState<MarkDef[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, tagRes, tplRes, markRes] = await Promise.all([
        fetch(`/api/admin/line/step-scenarios/${scenarioId}`, { credentials: "include" }),
        fetch("/api/admin/line/tags", { credentials: "include" }),
        fetch("/api/admin/line/templates", { credentials: "include" }),
        fetch("/api/admin/line/marks", { credentials: "include" }),
      ]);

      if (detailRes.ok) {
        const d = await detailRes.json();
        setScenario(d.scenario);
        setSteps(d.steps || []);
        setStats(d.stats || { active: 0, completed: 0 });
      }
      if (tagRes.ok) {
        const d = await tagRes.json();
        setTags(d.tags || []);
      }
      if (tplRes.ok) {
        const d = await tplRes.json();
        setTemplates(d.templates || []);
      }
      if (markRes.ok) {
        const d = await markRes.json();
        setMarks(d.marks || []);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  // 登録者一覧取得
  const loadEnrollments = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/line/step-scenarios/${scenarioId}/enrollments`, {
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        setEnrollments(d.enrollments || []);
      }
    } catch (e) {
      console.error("登録者取得エラー:", e);
    }
  }, [scenarioId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (activeTab === "enrollments") loadEnrollments();
  }, [activeTab, loadEnrollments]);

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
      loadData();
    } finally {
      setSaving(false);
    }
  };

  // ステップ追加
  const addStep = () => {
    setSteps([...steps, { ...EMPTY_STEP, sort_order: steps.length }]);
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
    loadEnrollments();
  };

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
          {/* シナリオ名 */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">シナリオ名</label>
            <input
              type="text"
              value={scenario.name}
              onChange={(e) => setScenario({ ...scenario, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>

          {/* トリガー */}
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

          {/* タグ選択（tag_add時） */}
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

          {/* キーワード（keyword時） */}
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
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full">
              {tab.count}
            </span>
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
            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepCard
                  key={index}
                  step={step}
                  index={index}
                  total={steps.length}
                  tags={tags}
                  templates={templates}
                  marks={marks}
                  onUpdate={(patch) => updateStep(index, patch)}
                  onRemove={() => removeStep(index)}
                  onMove={(dir) => moveStep(index, dir)}
                />
              ))}
            </div>
          )}
          <button
            onClick={addStep}
            className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 text-gray-400 text-sm rounded-lg hover:border-[#06C755] hover:text-[#06C755] transition-colors"
          >
            + ステップを追加
          </button>
        </div>
      )}

      {/* 登録者タブ */}
      {activeTab === "enrollments" && (
        <div>
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <span>アクティブ: <span className="font-medium text-green-600">{stats.active}</span></span>
            <span>完了: <span className="font-medium text-blue-600">{stats.completed}</span></span>
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
    </div>
  );
}

/* ---------- ステップカード ---------- */
function StepCard({
  step, index, total, tags, templates, marks,
  onUpdate, onRemove, onMove,
}: {
  step: StepItem;
  index: number;
  total: number;
  tags: Tag[];
  templates: Template[];
  marks: MarkDef[];
  onUpdate: (patch: Partial<StepItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* ステップヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 flex items-center justify-center bg-[#06C755] text-white text-xs font-bold rounded-full">
            {index + 1}
          </span>
          <span className="text-xs text-gray-500">ステップ {index + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="上に移動"
          >
            ▲
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="下に移動"
          >
            ▼
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600 ml-2"
            title="削除"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 遅延設定 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">配信タイミング:</span>
          <input
            type="number"
            min={0}
            value={step.delay_value}
            onChange={(e) => onUpdate({ delay_value: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          />
          <select
            value={step.delay_type}
            onChange={(e) => onUpdate({ delay_type: e.target.value as StepItem["delay_type"] })}
            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            {DELAY_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          {step.delay_type === "days" && (
            <>
              <span className="text-xs text-gray-400 ml-2">送信時刻:</span>
              <input
                type="time"
                value={step.send_time || "10:00"}
                onChange={(e) => onUpdate({ send_time: e.target.value })}
                className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
            </>
          )}
        </div>

        {/* アクション種別 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">アクション</label>
          <select
            value={step.step_type}
            onChange={(e) => onUpdate({ step_type: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            {STEP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* アクション詳細 */}
        {step.step_type === "send_text" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              メッセージ
              <span className="text-gray-300 ml-1">（{"{name}"} {"{patient_id}"} {"{send_date}"} 使用可）</span>
            </label>
            <textarea
              value={step.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={3}
              placeholder="配信メッセージを入力..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
        )}

        {step.step_type === "send_template" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">テンプレート</label>
            <select
              value={step.template_id || ""}
              onChange={(e) => onUpdate({ template_id: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            >
              <option value="">選択してください</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {(step.step_type === "tag_add" || step.step_type === "tag_remove") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {step.step_type === "tag_add" ? "追加するタグ" : "除去するタグ"}
            </label>
            <select
              value={step.tag_id || ""}
              onChange={(e) => onUpdate({ tag_id: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            >
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
            <select
              value={step.mark || ""}
              onChange={(e) => onUpdate({ mark: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            >
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
            <input
              type="number"
              value={step.menu_id || ""}
              onChange={(e) => onUpdate({ menu_id: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="メニューIDを入力"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
        )}
      </div>
    </div>
  );
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
