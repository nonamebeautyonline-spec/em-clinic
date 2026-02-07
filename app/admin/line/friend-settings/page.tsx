"use client";

import { useState, useEffect } from "react";
import {
  ConditionToggle,
  ConditionSummary,
  ConditionBuilderModal,
  type StepCondition,
  type TagDef,
  type MarkDef,
} from "../_components/ConditionBuilder";

// ── 型定義 ──────────────────────────────────────────────

interface ActionStep {
  type: "send_text" | "send_template" | "tag_add" | "tag_remove" | "mark_change" | "menu_change";
  content?: string;
  template_id?: number;
  template_name?: string;
  tag_id?: number;
  tag_name?: string;
  mark?: string;
  menu_id?: string;
  menu_name?: string;
  condition?: StepCondition;
}

interface FriendSetting {
  id: number;
  setting_key: string;
  setting_value: {
    greeting_message?: string;
    assign_tags?: string[];
    assign_mark?: string;
    actions?: ActionStep[];
    menu_change?: string;
    steps?: ActionStep[];
  };
  enabled: boolean;
  updated_at: string;
}

interface RichMenu {
  id: number;
  name: string;
  line_rich_menu_id: string | null;
}

interface Template {
  id: number;
  name: string;
  content: string;
}

const STEP_TYPES = [
  { type: "send_text", label: "テキスト送信" },
  { type: "send_template", label: "テンプレート送信" },
  { type: "tag_add", label: "タグ追加" },
  { type: "tag_remove", label: "タグ削除" },
  { type: "mark_change", label: "対応マーク変更" },
  { type: "menu_change", label: "メニュー操作" },
] as const;

const SETTING_LABELS: Record<string, { title: string; description: string }> = {
  new_friend: {
    title: "新規友だち",
    description: "システム導入後に新しくアカウントをフォローした人についての設定",
  },
  returning_blocked: {
    title: "システム導入前からの友だち・アカウントへのブロック解除した友だち",
    description: "システム導入前からの友だちとアカウントへのブロック解除した友だちについての設定",
  },
};

// ── 旧データ → 新ステップ形式へ変換 ────────────────────

function convertLegacyToSteps(sv: FriendSetting["setting_value"]): ActionStep[] {
  if (sv.steps && sv.steps.length > 0) return sv.steps;

  const steps: ActionStep[] = [];
  if (sv.greeting_message) {
    steps.push({ type: "send_text", content: sv.greeting_message, condition: { enabled: false, rules: [] } });
  }
  if (sv.menu_change) {
    steps.push({ type: "menu_change", menu_id: sv.menu_change, condition: { enabled: false, rules: [] } });
  }
  if (sv.assign_mark && sv.assign_mark !== "none") {
    steps.push({ type: "mark_change", mark: sv.assign_mark, condition: { enabled: false, rules: [] } });
  }
  if (sv.assign_tags && sv.assign_tags.length > 0) {
    for (const tagName of sv.assign_tags) {
      steps.push({ type: "tag_add", tag_name: tagName, condition: { enabled: false, rules: [] } });
    }
  }
  return steps;
}

// ── メインコンポーネント ────────────────────────────────

export default function FriendAddSettingsPage() {
  const [settings, setSettings] = useState<FriendSetting[]>([]);
  const [marks, setMarks] = useState<MarkDef[]>([]);
  const [tags, setTags] = useState<TagDef[]>([]);
  const [richMenus, setRichMenus] = useState<RichMenu[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // モーダル用ステート
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editSteps, setEditSteps] = useState<ActionStep[]>([]);
  const [repeatEnabled, setRepeatEnabled] = useState(true);

  // 条件ビルダーモーダル
  const [conditionEditingIndex, setConditionEditingIndex] = useState<number | null>(null);

  const fetchData = async () => {
    const [sRes, mRes, tRes, rmRes, tmplRes] = await Promise.all([
      fetch("/api/admin/line/friend-settings", { credentials: "include" }),
      fetch("/api/admin/line/marks", { credentials: "include" }),
      fetch("/api/admin/tags", { credentials: "include" }),
      fetch("/api/admin/line/rich-menus", { credentials: "include" }),
      fetch("/api/admin/line/templates", { credentials: "include" }),
    ]);
    const sData = await sRes.json();
    const mData = await mRes.json();
    const tData = await tRes.json();
    const rmData = await rmRes.json();
    const tmplData = await tmplRes.json();

    if (sData.settings) setSettings(sData.settings);
    if (mData.marks) setMarks(mData.marks);
    if (tData.tags) setTags(tData.tags);
    if (rmData.menus) setRichMenus(rmData.menus);
    if (tmplData.templates) setTemplates(tmplData.templates);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (setting: FriendSetting) => {
    setEditingKey(setting.setting_key);
    setEditSteps(convertLegacyToSteps(setting.setting_value));
  };

  const handleSave = async () => {
    if (!editingKey || saving) return;
    setSaving(true);

    const res = await fetch("/api/admin/line/friend-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        setting_key: editingKey,
        setting_value: {
          steps: editSteps,
          greeting_message: editSteps.find(s => s.type === "send_text")?.content || "",
          assign_tags: editSteps.filter(s => s.type === "tag_add").map(s => s.tag_name || "").filter(Boolean),
          assign_mark: editSteps.find(s => s.type === "mark_change")?.mark || "none",
          menu_change: editSteps.find(s => s.type === "menu_change")?.menu_id || "",
          actions: [],
        },
        enabled: editSteps.length > 0,
      }),
    });

    if (res.ok) {
      await fetchData();
      setEditingKey(null);
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleClearSetting = async (key: string) => {
    setSaving(true);
    await fetch("/api/admin/line/friend-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        setting_key: key,
        setting_value: { greeting_message: "", assign_tags: [], assign_mark: "none", actions: [], steps: [] },
        enabled: false,
      }),
    });
    await fetchData();
    setSaving(false);
  };

  // ── ステップ操作 ──
  const addStep = (type: ActionStep["type"]) => {
    const step: ActionStep = { type, condition: { enabled: false, rules: [] } };
    if (type === "send_text") step.content = "";
    if (type === "mark_change") step.mark = "none";
    if (type === "menu_change") step.menu_id = "";
    setEditSteps(prev => [...prev, step]);
  };

  const updateStep = (index: number, updates: Partial<ActionStep>) => {
    setEditSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const removeStep = (index: number) => {
    setEditSteps(prev => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    setEditSteps(prev => {
      const arr = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return arr;
      [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
      return arr;
    });
  };

  const formatStepLabel = (step: ActionStep): string => {
    const typeLabel = STEP_TYPES.find(s => s.type === step.type)?.label || step.type;
    switch (step.type) {
      case "send_text": return `${typeLabel}`;
      case "send_template": return `${typeLabel}`;
      case "tag_add": return `${typeLabel} ${step.tag_name || ""}`;
      case "tag_remove": return `${typeLabel} ${step.tag_name || ""}`;
      case "mark_change": {
        const label = marks.find(m => m.value === step.mark)?.label || step.mark;
        return `${typeLabel} ${label}`;
      }
      case "menu_change": {
        const name = step.menu_name || richMenus.find(rm => String(rm.id) === step.menu_id)?.name || "";
        return `${typeLabel} ${name}`;
      }
      default: return typeLabel;
    }
  };

  // ── カードのアクションサマリ ──
  const renderActionSummary = (sv: FriendSetting["setting_value"]) => {
    const steps = sv.steps && sv.steps.length > 0 ? sv.steps : convertLegacyToSteps(sv);
    if (steps.length === 0) {
      return <p className="text-xs text-gray-300 py-2">アクション未設定</p>;
    }
    return (
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const typeInfo = STEP_TYPES.find(s => s.type === step.type);
          const colors: Record<string, string> = {
            send_text: "bg-blue-50 text-blue-600",
            send_template: "bg-blue-50 text-blue-600",
            tag_add: "bg-violet-50 text-violet-600",
            tag_remove: "bg-red-50 text-red-600",
            mark_change: "bg-orange-50 text-orange-600",
            menu_change: "bg-purple-50 text-purple-600",
          };
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`flex-shrink-0 px-2 py-0.5 rounded font-medium ${colors[step.type] || "bg-gray-50 text-gray-600"}`}>
                {typeInfo?.label}
              </span>
              {step.type === "send_text" && <span className="text-gray-500 line-clamp-1">{step.content}</span>}
              {step.type === "menu_change" && <span className="text-gray-500">{step.menu_name || richMenus.find(rm => String(rm.id) === step.menu_id)?.name}</span>}
              {step.type === "mark_change" && <span className="text-gray-500">{marks.find(m => m.value === step.mark)?.label}</span>}
              {(step.type === "tag_add" || step.type === "tag_remove") && <span className="text-gray-500">{step.tag_name}</span>}
              {step.condition?.enabled && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">条件ON</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            友だち追加時設定
          </h1>
          <p className="text-sm text-gray-400 mt-1">友だち追加時に自動実行するアクションを設定</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {settings.map((setting) => {
              const labels = SETTING_LABELS[setting.setting_key] || { title: setting.setting_key, description: "" };

              return (
                <div key={setting.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 text-sm">{labels.title}</h2>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{labels.description}</p>
                  </div>

                  <div className="px-6 py-4">
                    <div className="mb-4">
                      {renderActionSummary(setting.setting_value)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(setting)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl text-xs font-medium hover:from-amber-500 hover:to-yellow-600 transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        アクションを設定する
                      </button>
                      <button
                        onClick={() => handleClearSetting(setting.setting_key)}
                        className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        設定解除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── アクション設定モーダル ── */}
      {editingKey && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingKey(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* モーダルヘッダー */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">アクション設定</h2>
              <button onClick={() => setEditingKey(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* ステップ一覧 */}
              {editSteps.map((step, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* ステップヘッダー */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 cursor-grab">
                        ≡
                      </span>
                      <span className="text-xs font-bold text-gray-700">
                        {i + 1}. {formatStepLabel(step)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ConditionToggle
                        condition={step.condition || { enabled: false, rules: [] }}
                        onChange={(cond) => updateStep(i, { condition: cond })}
                        onEditClick={() => setConditionEditingIndex(i)}
                      />
                      {i > 0 && (
                        <button onClick={() => moveStep(i, "up")} className="p-1 text-gray-300 hover:text-gray-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                      )}
                      {i < editSteps.length - 1 && (
                        <button onClick={() => moveStep(i, "down")} className="p-1 text-gray-300 hover:text-gray-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      )}
                      <button onClick={() => removeStep(i)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* 条件サマリー */}
                  {step.condition?.enabled && step.condition.rules.length > 0 && (
                    <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-200">
                      <ConditionSummary
                        condition={step.condition}
                        tags={tags}
                        marks={marks}
                        onEditClick={() => setConditionEditingIndex(i)}
                        onRemoveClick={() => updateStep(i, { condition: { enabled: false, rules: [] } })}
                      />
                    </div>
                  )}

                  {/* ステップ内容 */}
                  <div className="px-4 py-3">
                    {step.type === "send_text" && (
                      <>
                        <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-t-lg border-b-0 text-xs text-gray-400">
                          <button type="button" onClick={() => updateStep(i, { content: (step.content || "") + "{name}" })} className="px-2 py-0.5 bg-white rounded hover:bg-gray-100 text-gray-600 border border-gray-200">名前</button>
                          <button type="button" onClick={() => updateStep(i, { content: (step.content || "") + "{patient_id}" })} className="px-2 py-0.5 bg-white rounded hover:bg-gray-100 text-gray-600 border border-gray-200">患者ID</button>
                        </div>
                        <textarea
                          value={step.content || ""}
                          onChange={(e) => updateStep(i, { content: e.target.value })}
                          placeholder="送信テキストを入力..."
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-200 rounded-b-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-none"
                        />
                      </>
                    )}

                    {step.type === "send_template" && (
                      <select
                        value={step.template_id || ""}
                        onChange={e => {
                          const tmpl = templates.find(t => t.id === Number(e.target.value));
                          updateStep(i, { template_id: Number(e.target.value), template_name: tmpl?.name });
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                      >
                        <option value="">テンプレートを選択</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}

                    {step.type === "menu_change" && (
                      <select
                        value={step.menu_id || ""}
                        onChange={(e) => {
                          const rm = richMenus.find(r => String(r.id) === e.target.value);
                          updateStep(i, { menu_id: e.target.value, menu_name: rm?.name });
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                      >
                        <option value="">メニュー変更なし</option>
                        {richMenus.map(rm => (
                          <option key={rm.id} value={String(rm.id)}>{rm.name}</option>
                        ))}
                      </select>
                    )}

                    {step.type === "mark_change" && (
                      <div className="flex flex-wrap gap-2">
                        {marks.map(m => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => updateStep(i, { mark: m.value })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              step.mark === m.value
                                ? "bg-white shadow-sm ring-2 ring-green-400"
                                : "bg-white/50 hover:bg-white border border-gray-200"
                            }`}
                          >
                            {m.value !== "none" ? (
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                            ) : (
                              <span className="w-3 h-3 rounded-full border-2 border-gray-300" />
                            )}
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {(step.type === "tag_add" || step.type === "tag_remove") && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => updateStep(i, { tag_id: t.id, tag_name: t.name })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              step.tag_id === t.id
                                ? "text-white shadow-sm"
                                : "bg-white/50 hover:bg-white border border-gray-200 text-gray-600"
                            }`}
                            style={step.tag_id === t.id ? { backgroundColor: t.color } : {}}
                          >
                            {t.name}
                          </button>
                        ))}
                        {tags.length === 0 && (
                          <p className="text-xs text-gray-400">タグがまだ作成されていません</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 動作追加ボタン */}
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-3 text-center">動作を更に追加できます</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STEP_TYPES.map(st => (
                    <button
                      key={st.type}
                      type="button"
                      onClick={() => addStep(st.type)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 繰り返し設定 */}
              <label className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                <input
                  type="checkbox"
                  checked={repeatEnabled}
                  onChange={e => setRepeatEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#06C755] focus:ring-[#06C755]"
                />
                発動2回目以降も各動作を実行する
              </label>
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-bold hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all disabled:opacity-40"
              >
                {saving ? "保存中..." : "この条件で決定する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 条件ビルダーモーダル */}
      {conditionEditingIndex !== null && (
        <ConditionBuilderModal
          condition={editSteps[conditionEditingIndex]?.condition || { enabled: false, rules: [] }}
          tags={tags}
          marks={marks}
          onSave={(cond) => {
            updateStep(conditionEditingIndex, { condition: cond });
            setConditionEditingIndex(null);
          }}
          onClose={() => setConditionEditingIndex(null)}
        />
      )}
    </div>
  );
}
