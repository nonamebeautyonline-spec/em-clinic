"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { nanoid } from "nanoid";
import type {
  IntakeFormField,
  IntakeFormSettings,
  IntakeFieldType,
  IntakeFieldOption,
} from "@/lib/intake-form-defaults";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";

// テンプレート一覧用の型
interface TemplateItem {
  id: string;
  name: string;
  is_active: boolean;
  field_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// 定数
// ============================================================

const FIELD_TYPES: { type: IntakeFieldType; label: string; icon: string }[] = [
  { type: "text", label: "テキスト", icon: "T" },
  { type: "textarea", label: "テキストエリア", icon: "¶" },
  { type: "radio", label: "ラジオボタン", icon: "◉" },
  { type: "dropdown", label: "プルダウン", icon: "▼" },
  { type: "checkbox", label: "チェックボックス", icon: "☑" },
  { type: "heading", label: "見出し", icon: "H" },
];

function createField(type: IntakeFieldType): IntakeFormField {
  const hasOpts = type === "radio" || type === "dropdown" || type === "checkbox";
  return {
    id: nanoid(8),
    type,
    label: "",
    required: false,
    sort_order: 0,
    ...(hasOpts ? { options: [{ label: "", value: "" }] } : {}),
  };
}

const TEMPLATES_KEY = "/api/admin/intake-form/templates";

// ============================================================
// スマホプレビュー
// ============================================================

function IntakePreview({
  fields,
  settings,
}: {
  fields: IntakeFormField[];
  settings: IntakeFormSettings;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [completed, setCompleted] = useState(false);

  // リセット（フィールドが変わったら）
  useEffect(() => {
    setAnswers({});
    setCurrentIndex(0);
    setBlocked(false);
    setCompleted(false);
  }, [fields]);

  const isVisible = (q: IntakeFormField) => {
    if (!q.conditional) return true;
    return answers[q.conditional.when] === q.conditional.value;
  };

  const visibleFields = useMemo(
    () => fields.filter((f) => f.type !== "heading" && isVisible(f)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, answers],
  );

  const total = visibleFields.length;
  const current = visibleFields[currentIndex];

  const validate = () => {
    if (!current?.required) return true;
    const v = answers[current.id]?.trim();
    return !!v;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (current?.ng_block && answers[current.id] === current.ng_block_value) {
      setBlocked(true);
      return;
    }
    if (currentIndex >= total - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => Math.min(i + 1, total - 1));
  };

  const handlePrev = () => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentIndex(0);
    setBlocked(false);
    setCompleted(false);
  };

  const progressPercent = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  // iPhone風フレーム
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleReset}
        className="mb-3 px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        プレビューをリセット
      </button>

      <div className="relative w-[375px] h-[667px] bg-black rounded-[40px] shadow-2xl p-3 overflow-hidden">
        {/* ノッチ */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-10" />

        {/* 画面 */}
        <div className="w-full h-full bg-gray-50 rounded-[28px] overflow-hidden flex flex-col">
          {/* ステータスバー */}
          <div className="h-11 bg-white flex items-end justify-center pb-1">
            <span className="text-[10px] text-gray-400">プレビューモード</span>
          </div>

          {blocked ? (
            <>
              <header className="bg-white border-b px-4 py-3">
                <h1 className="text-base font-semibold">
                  {settings.ng_block_title || "オンライン処方の対象外です"}
                </h1>
              </header>
              <main className="flex-1 px-4 py-6">
                <div className="bg-white rounded-xl shadow-sm p-4 text-xs text-gray-700 space-y-2">
                  <p>
                    {settings.ng_block_message ||
                      "恐れ入りますが、問診項目のいずれかに該当する場合はオンラインでの処方ができかねます。"}
                  </p>
                </div>
              </main>
            </>
          ) : completed ? (
            <>
              <header className="bg-white border-b px-4 py-3">
                <h1 className="text-base font-semibold">問診完了</h1>
              </header>
              <main className="flex-1 px-4 py-6">
                <div className="bg-white rounded-xl shadow-sm p-4 text-xs text-gray-700 space-y-2">
                  <p>問診が完了しました。（プレビュー表示）</p>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-400 mb-2">回答データ:</p>
                    {Object.entries(answers).map(([k, v]) => (
                      <div key={k} className="text-[10px] text-gray-600">
                        <span className="font-medium">{k}:</span> {v}
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            </>
          ) : !current ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
              フィールドがありません
            </div>
          ) : (
            <>
              {/* ヘッダー */}
              <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
                <h1 className="text-base font-semibold">
                  {settings.header_title || "問診"}
                </h1>
                <div className="text-right text-[10px] text-gray-500">
                  <span className="block">{settings.estimated_time}</span>
                  <span className="block mt-0.5">
                    質問 {currentIndex + 1} / {total}
                  </span>
                </div>
              </header>

              {/* プログレスバー */}
              <div className="h-1 bg-gray-200">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* 質問 */}
              <main className="flex-1 px-4 py-6 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <p className="text-sm font-medium text-gray-800 mb-1">
                    {current.label || "（未設定）"}
                    {current.required && (
                      <span className="text-red-500 text-xs ml-1">*</span>
                    )}
                  </p>
                  {current.description && (
                    <p className="text-[11px] text-gray-500 mb-3 whitespace-pre-wrap">
                      {current.description}
                    </p>
                  )}

                  {/* 入力フィールド */}
                  {current.type === "text" && (
                    <input
                      type="text"
                      value={answers[current.id] || ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [current.id]: e.target.value }))
                      }
                      placeholder={current.placeholder || ""}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  )}
                  {current.type === "textarea" && (
                    <textarea
                      value={answers[current.id] || ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [current.id]: e.target.value }))
                      }
                      placeholder={current.placeholder || ""}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                  )}
                  {(current.type === "radio" || current.type === "dropdown") &&
                    current.options?.map((opt, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2 py-1.5 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={current.id}
                          checked={answers[current.id] === opt.value}
                          onChange={() =>
                            setAnswers((a) => ({ ...a, [current.id]: opt.value }))
                          }
                          className="accent-blue-500"
                        />
                        {opt.label}
                      </label>
                    ))}
                  {current.type === "checkbox" &&
                    current.options?.map((opt, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2 py-1.5 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(answers[current.id] || "").split(",").includes(opt.value)}
                          onChange={(e) => {
                            const vals = (answers[current.id] || "")
                              .split(",")
                              .filter(Boolean);
                            const next = e.target.checked
                              ? [...vals, opt.value]
                              : vals.filter((v) => v !== opt.value);
                            setAnswers((a) => ({
                              ...a,
                              [current.id]: next.join(","),
                            }));
                          }}
                          className="accent-blue-500"
                        />
                        {opt.label}
                      </label>
                    ))}
                </div>
              </main>

              {/* フッター */}
              <footer className="px-4 py-3 bg-white border-t flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-30"
                >
                  戻る
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 text-xs text-white bg-blue-600 rounded-lg"
                >
                  {currentIndex >= total - 1 ? "完了" : "次へ"}
                </button>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// テンプレート一覧ビュー（初期画面）
// ============================================================

function TemplateListView({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { data: templatesData, isLoading } = useSWR<{ ok: boolean; templates: TemplateItem[] }>(TEMPLATES_KEY);
  const templates = templatesData?.templates ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // 新規作成
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/intake-form/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewName("");
        setShowCreate(false);
        await mutate(TEMPLATES_KEY);
      } else {
        alert("作成に失敗しました: " + (data.message || ""));
      }
    } catch {
      alert("作成に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  // 複製
  const handleDuplicate = async (sourceId: string) => {
    if (!newName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/intake-form/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim(), source_id: sourceId }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewName("");
        setShowDuplicate(null);
        await mutate(TEMPLATES_KEY);
      } else {
        alert("複製に失敗しました: " + (data.message || ""));
      }
    } catch {
      alert("複製に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  // 削除
  const handleDelete = async (id: string) => {
    if (!confirm("この問診フォームを削除しますか？\nこの操作は取り消せません。")) return;
    try {
      const res = await fetch("/api/admin/intake-form/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.ok) {
        await mutate(TEMPLATES_KEY);
      } else {
        alert("削除に失敗しました: " + (data.message || ""));
      }
    } catch {
      alert("削除に失敗しました");
    }
  };

  // 有効化
  const handleActivate = async (id: string) => {
    if (!confirm("この問診フォームを使用中に切り替えますか？\n現在使用中のフォームは非アクティブになります。")) return;
    try {
      const res = await fetch("/api/admin/intake-form/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.ok) {
        await mutate(TEMPLATES_KEY);
      } else {
        alert("切り替えに失敗しました: " + (data.message || ""));
      }
    } catch {
      alert("切り替えに失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">問診フォーム設定</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            患者が入力する問診フォームを管理できます
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setNewName(""); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </button>
      </div>

      {/* テンプレートカード一覧 */}
      {templates.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          問診フォームがありません。「新規作成」で追加してください。
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-xl border p-4 transition-colors hover:shadow-sm ${
                t.is_active ? "border-blue-200 bg-blue-50/30" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelect(t.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                    {t.is_active && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                        使用中
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-gray-400">
                      {t.field_count}項目
                    </span>
                    <span className="text-[11px] text-gray-400">
                      更新: {new Date(t.updated_at || t.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
                  <a
                    href={`/admin/intake-responses?template_id=${t.id}`}
                    className="px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    回答一覧
                  </a>
                  <button
                    onClick={() => onSelect(t.id)}
                    className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => { setShowDuplicate(t.id); setNewName(t.name + "（コピー）"); }}
                    className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    複製
                  </button>
                  {!t.is_active && (
                    <button
                      onClick={() => handleActivate(t.id)}
                      className="px-3 py-1.5 text-xs text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      使用する
                    </button>
                  )}
                  {!t.is_active && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 名前入力モーダル（新規作成） */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">新規問診フォーム作成</h2>
            <label className="text-xs font-medium text-gray-600 mb-1 block">フォーム名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: メディカルダイエット"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || actionLoading}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {actionLoading ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 名前入力モーダル（複製） */}
      {showDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">問診フォームを複製</h2>
            <label className="text-xs font-medium text-gray-600 mb-1 block">新しいフォーム名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="コピー先の名前を入力"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleDuplicate(showDuplicate); }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDuplicate(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDuplicate(showDuplicate)}
                disabled={!newName.trim() || actionLoading}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {actionLoading ? "複製中..." : "複製"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// フォーム編集ビュー
// ============================================================

function FormEditorView({
  templateId,
  onBack,
}: {
  templateId: string;
  onBack: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"fields" | "settings" | "preview">("fields");

  const [templateName, setTemplateName] = useState("");
  const [fields, setFields] = useState<IntakeFormField[]>([]);
  const [settings, setSettings] = useState<IntakeFormSettings>(DEFAULT_INTAKE_SETTINGS);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const DEFINITION_KEY = `/api/admin/intake-form?id=${templateId}`;

  const { data: defData, isLoading: loading } = useSWR<{ ok: boolean; definition: { id: string; name: string; fields: IntakeFormField[]; settings: IntakeFormSettings; is_active: boolean } }>(DEFINITION_KEY);
  const [defInitialized, setDefInitialized] = useState(false);

  useEffect(() => {
    if (defData && !defInitialized) {
      if (defData.ok && defData.definition) {
        setTemplateName(defData.definition.name || "");
        setFields(defData.definition.fields || DEFAULT_INTAKE_FIELDS);
        setSettings({
          ...DEFAULT_INTAKE_SETTINGS,
          ...(defData.definition.settings || {}),
        });
        setIsActive(defData.definition.is_active || false);
      } else {
        setFields(DEFAULT_INTAKE_FIELDS);
        setSettings(DEFAULT_INTAKE_SETTINGS);
      }
      setDefInitialized(true);
    }
  }, [defData, defInitialized]);

  // 保存
  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // sort_order を連番で振り直す
      const sorted = fields.map((f, i) => ({ ...f, sort_order: i }));
      const res = await fetch("/api/admin/intake-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: templateId, name: templateName, fields: sorted, settings }),
      });
      const data = await res.json();
      if (data.ok) {
        setFields(sorted);
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 2000);
        // テンプレート一覧のキャッシュも更新
        mutate(TEMPLATES_KEY);
      } else {
        alert("保存に失敗しました: " + ((data.message || data.error) || data.details?.join(", ")));
      }
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // リセット
  const handleReset = async () => {
    if (!confirm("問診フォームをデフォルト設定に戻しますか？")) return;
    setFields(DEFAULT_INTAKE_FIELDS);
    setSettings(DEFAULT_INTAKE_SETTINGS);
  };

  // フィールド操作
  const addField = (type: IntakeFieldType) => {
    const f = createField(type);
    f.sort_order = fields.length;
    setFields((prev) => [...prev, f]);
    setExpandedField(f.id);
  };

  const updateField = (fieldId: string, updates: Partial<IntakeFormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    );
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (expandedField === fieldId) setExpandedField(null);
  };

  const duplicateField = (fieldId: string) => {
    const src = fields.find((f) => f.id === fieldId);
    if (!src) return;
    const dup = { ...src, id: nanoid(8), label: src.label + "（コピー）" };
    if (dup.options) dup.options = [...dup.options];
    const idx = fields.findIndex((f) => f.id === fieldId);
    const next = [...fields];
    next.splice(idx + 1, 0, dup);
    setFields(next);
    setExpandedField(dup.id);
  };

  const moveField = (fieldId: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const next = [...fields];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setFields(next);
  };

  // 選択肢操作
  const addOption = (fieldId: string) => {
    const f = fields.find((x) => x.id === fieldId);
    if (!f?.options) return;
    updateField(fieldId, {
      options: [...f.options, { label: "", value: "" }],
    });
  };

  const updateOption = (
    fieldId: string,
    optIdx: number,
    key: keyof IntakeFieldOption,
    val: string,
  ) => {
    const f = fields.find((x) => x.id === fieldId);
    if (!f?.options) return;
    const opts = f.options.map((o, i) =>
      i === optIdx ? { ...o, [key]: val } : o,
    );
    updateField(fieldId, { options: opts });
  };

  const removeOption = (fieldId: string, optIdx: number) => {
    const f = fields.find((x) => x.id === fieldId);
    if (!f?.options) return;
    updateField(fieldId, {
      options: f.options.filter((_, i) => i !== optIdx),
    });
  };

  const hasChoices = (t: IntakeFieldType) =>
    ["checkbox", "radio", "dropdown"].includes(t);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="一覧に戻る"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            {editing ? (
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="text-xl font-bold text-gray-800 bg-transparent border-b-2 border-blue-400 focus:outline-none px-0 py-0"
                placeholder="フォーム名を入力"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-800">{templateName}</h1>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {isActive && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                  使用中
                </span>
              )}
              <p className="text-xs text-gray-400">
                {fields.length}項目
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setDefInitialized(false); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
              <button onClick={handleReset} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                デフォルトに戻す
              </button>
              <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 shadow-sm">
                {saving ? "保存中..." : "保存する"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              編集する
            </button>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
        {(
          [
            { key: "fields", label: `フィールド (${fields.length})` },
            { key: "settings", label: "表示設定" },
            { key: "preview", label: "スマホプレビュー" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.key
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className={!editing ? "pointer-events-none opacity-60" : ""}>
      {/* フィールドタブ */}
      {tab === "fields" && (
        <div>
          {/* フィールド追加ボタン */}
          <div className="flex flex-wrap gap-2 mb-5">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1.5"
              >
                <span className="text-[10px] w-4 text-center">{ft.icon}</span>
                {ft.label}
              </button>
            ))}
          </div>

          {/* フィールド一覧 */}
          {fields.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              上のボタンからフィールドを追加してください
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, idx) => {
                const expanded = expandedField === field.id;
                const ftInfo = FIELD_TYPES.find(
                  (ft) => ft.type === field.type,
                );
                return (
                  <div
                    key={field.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    {/* ヘッダー */}
                    <div
                      className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() =>
                        setExpandedField(expanded ? null : field.id)
                      }
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-gray-400 w-6 text-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 flex-shrink-0">
                          {ftInfo?.label}
                        </span>
                        <span className="text-sm text-gray-800 truncate">
                          {field.label || "（未設定）"}
                        </span>
                        {field.required && (
                          <span className="text-[9px] bg-red-50 text-red-500 px-1 py-0.5 rounded flex-shrink-0">
                            必須
                          </span>
                        )}
                        {field.conditional && (
                          <span className="text-[9px] bg-blue-50 text-blue-500 px-1 py-0.5 rounded flex-shrink-0">
                            条件付き
                          </span>
                        )}
                        {field.ng_block && (
                          <span className="text-[9px] bg-orange-50 text-orange-500 px-1 py-0.5 rounded flex-shrink-0">
                            NG判定
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveField(field.id, -1);
                          }}
                          disabled={idx === 0}
                          className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors"
                          title="上へ"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveField(field.id, 1);
                          }}
                          disabled={idx === fields.length - 1}
                          className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors"
                          title="下へ"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateField(field.id);
                          }}
                          className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                          title="コピー"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(field.id);
                          }}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          title="削除"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ml-1 ${expanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* 展開エリア */}
                    {expanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
                        {/* ラベル */}
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            {field.type === "heading" ? "見出しテキスト" : "項目名"}
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="項目名を入力"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        {/* 説明文 */}
                        {field.type !== "heading" && (
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">説明文</label>
                            <textarea
                              value={field.description || ""}
                              onChange={(e) => updateField(field.id, { description: e.target.value })}
                              placeholder="項目の補足説明（改行可）"
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            />
                          </div>
                        )}

                        {/* プレースホルダ */}
                        {(field.type === "text" || field.type === "textarea") && (
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">プレースホルダ</label>
                            <input
                              type="text"
                              value={field.placeholder || ""}
                              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                              placeholder="入力欄に表示される薄いテキスト"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        )}

                        {/* 選択肢 */}
                        {hasChoices(field.type) && (
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">選択肢</label>
                            <div className="space-y-2">
                              {(field.options || []).map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-5 text-center">{oi + 1}</span>
                                  <input
                                    type="text"
                                    value={opt.label}
                                    onChange={(e) => updateOption(field.id, oi, "label", e.target.value)}
                                    placeholder="表示テキスト"
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  />
                                  <input
                                    type="text"
                                    value={opt.value}
                                    onChange={(e) => updateOption(field.id, oi, "value", e.target.value)}
                                    placeholder="値"
                                    className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  />
                                  <button
                                    onClick={() => removeOption(field.id, oi)}
                                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => addOption(field.id)}
                              className="mt-2 text-xs text-blue-600 hover:underline"
                            >
                              + 選択肢を追加
                            </button>
                          </div>
                        )}

                        {/* 必須・条件付き・NG判定（heading以外） */}
                        {field.type !== "heading" && (
                          <>
                            {/* 必須チェック */}
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                className="rounded border-gray-300"
                              />
                              必須項目にする
                            </label>

                            {/* 条件付き表示 */}
                            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={!!field.conditional}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      updateField(field.id, { conditional: { when: "", value: "" } });
                                    } else {
                                      updateField(field.id, { conditional: undefined });
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                条件付き表示
                              </label>
                              {field.conditional && (
                                <div className="flex items-center gap-2 pl-6 text-xs text-gray-600">
                                  <select
                                    value={field.conditional.when}
                                    onChange={(e) =>
                                      updateField(field.id, {
                                        conditional: { ...field.conditional!, when: e.target.value },
                                      })
                                    }
                                    className="px-2 py-1 border border-gray-200 rounded text-xs"
                                  >
                                    <option value="">対象フィールド</option>
                                    {fields
                                      .filter((f) => f.id !== field.id && f.type !== "heading")
                                      .map((f) => (
                                        <option key={f.id} value={f.id}>
                                          {f.label || f.id}
                                        </option>
                                      ))}
                                  </select>
                                  <span>の回答が</span>
                                  <input
                                    type="text"
                                    value={field.conditional.value}
                                    onChange={(e) =>
                                      updateField(field.id, {
                                        conditional: { ...field.conditional!, value: e.target.value },
                                      })
                                    }
                                    placeholder="値"
                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-xs"
                                  />
                                  <span>のとき表示</span>
                                </div>
                              )}
                            </div>

                            {/* NG判定 */}
                            <div className="border border-orange-100 rounded-lg p-3 space-y-2 bg-orange-50/30">
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={!!field.ng_block}
                                  onChange={(e) => {
                                    updateField(field.id, {
                                      ng_block: e.target.checked,
                                      ng_block_value: e.target.checked ? "" : undefined,
                                      ng_block_message: e.target.checked ? "" : undefined,
                                    });
                                  }}
                                  className="rounded border-gray-300"
                                />
                                NG判定（この回答でブロック）
                              </label>
                              {field.ng_block && (
                                <div className="pl-6 space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span>ブロック値:</span>
                                    <input
                                      type="text"
                                      value={field.ng_block_value || ""}
                                      onChange={(e) => updateField(field.id, { ng_block_value: e.target.value })}
                                      placeholder="この値が選ばれたらブロック"
                                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">ブロック時メッセージ（任意）:</label>
                                    <input
                                      type="text"
                                      value={field.ng_block_message || ""}
                                      onChange={(e) => updateField(field.id, { ng_block_message: e.target.value })}
                                      placeholder="表示設定のメッセージを使用"
                                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 表示設定タブ */}
      {tab === "settings" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">ヘッダータイトル</label>
            <input
              type="text"
              value={settings.header_title}
              onChange={(e) => setSettings({ ...settings, header_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">目安時間テキスト</label>
            <input
              type="text"
              value={settings.estimated_time || ""}
              onChange={(e) => setSettings({ ...settings, estimated_time: e.target.value })}
              placeholder="例）平均回答時間 1〜2分程度"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.step_by_step}
              onChange={(e) => setSettings({ ...settings, step_by_step: e.target.checked })}
              className="rounded border-gray-300"
            />
            ステップバイステップ表示（1問ずつ表示）
          </label>

          <hr className="border-gray-100" />

          <h3 className="text-sm font-semibold text-gray-700">NGブロック画面</h3>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">タイトル</label>
            <input
              type="text"
              value={settings.ng_block_title || ""}
              onChange={(e) => setSettings({ ...settings, ng_block_title: e.target.value })}
              placeholder="オンライン処方の対象外です"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メッセージ</label>
            <textarea
              value={settings.ng_block_message || ""}
              onChange={(e) => setSettings({ ...settings, ng_block_message: e.target.value })}
              placeholder="ブロック時に表示されるメッセージ"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* スマホプレビュータブ */}
      {tab === "preview" && (
        <div className="flex justify-center py-4">
          <IntakePreview fields={fields} settings={settings} />
        </div>
      )}
      </div>
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================

export default function IntakeFormEditorPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <FormEditorView
        key={selectedId}
        templateId={selectedId}
        onBack={() => {
          setSelectedId(null);
          mutate(TEMPLATES_KEY);
        }}
      />
    );
  }

  return (
    <TemplateListView onSelect={(id) => setSelectedId(id)} />
  );
}
