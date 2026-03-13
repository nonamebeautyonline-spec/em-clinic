"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { nanoid } from "nanoid";
import Link from "next/link";
import type { DisplayConditions, SingleCondition, ConditionOperator, CompoundCondition } from "@/lib/form-conditions";
import { isCompoundCondition } from "@/lib/form-conditions";
import ConditionBuilder from "@/components/ConditionBuilder";
import type { ConditionField } from "@/components/ConditionBuilder";

// ============================================================
// 型定義
// ============================================================

type FieldType =
  | "heading_sm"
  | "heading_md"
  | "text"
  | "textarea"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "file"
  | "prefecture"
  | "date";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  hidden: boolean;
  options: string[];
  validation_rule: string;
  min_length: number | null;
  max_length: number | null;
  save_target: string;
  save_target_field_id: string;
  sort_order: number;
  display_conditions?: DisplayConditions;
}

interface FormSettings {
  confirm_dialog: boolean;
  confirm_text: string;
  confirm_button_text: string;
  confirm_cancel_text: string;
  deadline_enabled: boolean;
  deadline: string;
  max_responses_enabled: boolean;
  max_responses: number | null;
  responses_per_person: number | null;
  thanks_url: string;
  thanks_message: string;
  allow_restore: boolean;
  post_actions: number[];
  post_submit_actions: PostSubmitAction[];
}

interface FormData {
  id: number;
  name: string;
  folder_id: number | null;
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: number;
  name: string;
}

interface ActionDef {
  id: number;
  name: string;
}

interface TagDef {
  id: number;
  name: string;
  color: string;
}

interface TemplateDef {
  id: number;
  name: string;
  message_type: string;
}

interface WorkflowDef {
  id: string;
  name: string;
  status: string;
}

/** 回答後自動アクション */
interface PostSubmitAction {
  type: "tag_add" | "tag_remove" | "send_message" | "workflow";
  tag_id?: number;
  template_id?: number;
  workflow_id?: string;
}

interface FriendFieldDef {
  id: number;
  name: string;
  field_type: string;
}

// ============================================================
// 定数
// ============================================================

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "heading_sm", label: "小見出し", icon: "H" },
  { type: "heading_md", label: "中見出し", icon: "H" },
  { type: "text", label: "テキスト", icon: "T" },
  { type: "textarea", label: "テキストエリア", icon: "¶" },
  { type: "checkbox", label: "チェックボックス", icon: "☑" },
  { type: "radio", label: "ラジオボタン", icon: "◉" },
  { type: "dropdown", label: "プルダウン", icon: "▼" },
  { type: "file", label: "ファイル添付", icon: "📎" },
  { type: "prefecture", label: "都道府県", icon: "🗾" },
  { type: "date", label: "日付", icon: "📅" },
];

const SAVE_TARGETS = [
  { value: "", label: "なし" },
  { value: "patient", label: "患者情報" },
  { value: "friend_field", label: "友だち情報欄" },
];

// 条件分岐の演算子定義
const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "等しい" },
  { value: "not_equals", label: "等しくない" },
  { value: "contains", label: "含む" },
  { value: "not_empty", label: "空でない" },
  { value: "is_empty", label: "空である" },
];

// 値の入力が不要な演算子
const NO_VALUE_OPERATORS: ConditionOperator[] = ["not_empty", "is_empty"];

const DEFAULT_SETTINGS: FormSettings = {
  confirm_dialog: true,
  confirm_text: "送信してよろしいですか？",
  confirm_button_text: "送信",
  confirm_cancel_text: "キャンセル",
  deadline_enabled: false,
  deadline: "",
  max_responses_enabled: false,
  max_responses: null,
  responses_per_person: null,
  thanks_url: "",
  thanks_message: "回答を受け付けました。ありがとうございます。",
  allow_restore: false,
  post_actions: [],
  post_submit_actions: [],
};

// ============================================================
// 表示条件エディタコンポーネント（ConditionBuilder使用）
// ============================================================

function DisplayConditionEditor({
  field,
  allFields,
  onUpdate,
}: {
  field: FormField;
  allFields: FormField[];
  onUpdate: (dc: DisplayConditions) => void;
}) {
  // 自分自身と見出しを除いた他のフィールドを表示条件の参照先として使用可能
  const availableFields: ConditionField[] = allFields
    .filter(f => f.id !== field.id && f.type !== "heading_sm" && f.type !== "heading_md")
    .map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options }));

  const dc = field.display_conditions;
  const hasCondition = !!dc;

  // 現在の条件をCompoundConditionに正規化
  const normalizeToCompound = (): CompoundCondition => {
    if (!dc) {
      return { logic: "and", conditions: [{ when: availableFields[0]?.id ?? "", operator: "equals", value: "" }] };
    }
    if (isCompoundCondition(dc)) return dc;
    // 単一条件 → CompoundConditionに変換
    return { logic: "and", conditions: [dc as SingleCondition] };
  };

  // 条件を追加して有効化
  const enableCondition = () => {
    if (availableFields.length === 0) return;
    const initial: CompoundCondition = {
      logic: "and",
      conditions: [{ when: availableFields[0].id, operator: "equals", value: "" }],
    };
    onUpdate(initial);
  };

  // 条件をクリア
  const clearConditions = () => {
    onUpdate(null);
  };

  // ConditionBuilderからの変更を反映
  const handleChange = (compound: CompoundCondition) => {
    if (compound.conditions.length === 0) {
      onUpdate(null);
      return;
    }
    // 単一条件の場合はそのまま保存（後方互換性）
    if (compound.conditions.length === 1 && !isCompoundCondition(compound.conditions[0])) {
      onUpdate(compound.conditions[0] as SingleCondition);
      return;
    }
    onUpdate(compound);
  };

  return (
    <div className="pt-2 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          表示条件
        </label>
        <div className="flex items-center gap-2">
          {!hasCondition && availableFields.length > 0 && (
            <button
              onClick={enableCondition}
              className="text-xs text-[#00B900] hover:underline"
            >
              + 条件を追加
            </button>
          )}
          {hasCondition && (
            <button
              onClick={clearConditions}
              className="text-xs text-red-400 hover:text-red-600 hover:underline"
            >
              条件をクリア
            </button>
          )}
        </div>
      </div>

      {!hasCondition && (
        <p className="text-xs text-gray-400">
          条件なし（常に表示）
          {availableFields.length === 0 && "  ※ 他のフィールドを追加すると条件を設定できます"}
        </p>
      )}

      {hasCondition && (
        <ConditionBuilder
          value={normalizeToCompound()}
          onChange={handleChange}
          fields={availableFields}
        />
      )}
    </div>
  );
}

function createField(type: FieldType): FormField {
  return {
    id: nanoid(8),
    type,
    label: "",
    description: "",
    placeholder: "",
    required: false,
    hidden: false,
    options: type === "checkbox" || type === "radio" || type === "dropdown" ? [""] : [],
    validation_rule: "",
    min_length: null,
    max_length: null,
    save_target: "",
    save_target_field_id: "",
    sort_order: 0,
  };
}

// ============================================================
// メインコンポーネント
// ============================================================

export default function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // フォームデータ
  const { data: formData, isLoading: formLoading } = useSWR<{ form: FormData }>(`/api/admin/line/forms/${id}`);
  const [form, setForm] = useState<FormData | null>(null);

  // マスタデータ
  const { data: folderData, isLoading: folderLoading } = useSWR<{ folders: Folder[] }>("/api/admin/line/form-folders");
  const { data: actionData, isLoading: actionLoading } = useSWR<{ actions: ActionDef[] }>("/api/admin/line/actions");
  const { data: fieldData, isLoading: fieldLoading } = useSWR<{ fields: FriendFieldDef[] }>("/api/admin/friend-fields");
  const { data: tagData, isLoading: tagLoading } = useSWR<{ tags: TagDef[] }>("/api/admin/tags?simple=true");
  const { data: templateData, isLoading: templateLoading } = useSWR<{ templates: TemplateDef[] }>("/api/admin/line/templates");
  const { data: workflowData, isLoading: workflowLoading } = useSWR<{ workflows: WorkflowDef[] }>("/api/admin/line/workflows");

  const folders = folderData?.folders || [];
  const actions = actionData?.actions || [];
  const friendFields = fieldData?.fields || [];
  const tagDefs = tagData?.tags || [];
  const templateDefs = templateData?.templates || [];
  const workflowDefs = workflowData?.workflows || [];
  const loading = formLoading || folderLoading || actionLoading || fieldLoading || tagLoading || templateLoading || workflowLoading;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"fields" | "settings">("fields");

  // 編集中
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_SETTINGS);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  // フォームデータが取得されたらローカルstateに反映
  useEffect(() => {
    if (formData?.form) {
      const f = formData.form;
      setForm(f);
      setName(f.name);
      setTitle(f.title || "");
      setDescription(f.description || "");
      setFolderId(f.folder_id);
      setFields(f.fields || []);
      setSettings({ ...DEFAULT_SETTINGS, ...(f.settings || {}) });
    }
  }, [formData]);

  // 保存
  const save = async () => {
    setSaving(true);
    setSaved(false);
    const body = { name, title, description, folder_id: folderId, fields, settings };
    await fetch(`/api/admin/line/forms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 保存してプレビュー
  const saveAndPreview = async () => {
    setSaving(true);
    const body = { name, title, description, folder_id: folderId, fields, settings };
    await fetch(`/api/admin/line/forms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setSaving(false);
    window.open(`/forms/${form?.slug}?preview=1`, "_blank");
  };

  // プレビュー（保存なし）
  const openPreview = () => {
    window.open(`/forms/${form?.slug}?preview=1`, "_blank");
  };

  // 公開切替
  const togglePublish = async () => {
    const next = !form?.is_published;
    await fetch(`/api/admin/line/forms/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_published: next }),
    });
    setForm(prev => prev ? { ...prev, is_published: next } : prev);
  };

  // フィールド操作
  const addField = (type: FieldType) => {
    const f = createField(type);
    f.sort_order = fields.length;
    setFields(prev => [...prev, f]);
    setExpandedField(f.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
    if (expandedField === fieldId) setExpandedField(null);
  };

  const duplicateField = (fieldId: string) => {
    const src = fields.find(f => f.id === fieldId);
    if (!src) return;
    const dup = { ...src, id: nanoid(8), label: src.label + "（コピー）" };
    const idx = fields.findIndex(f => f.id === fieldId);
    const next = [...fields];
    next.splice(idx + 1, 0, dup);
    setFields(next);
    setExpandedField(dup.id);
  };

  const moveField = (fieldId: string, dir: -1 | 1) => {
    const idx = fields.findIndex(f => f.id === fieldId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const next = [...fields];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setFields(next);
  };

  // 選択肢操作
  const addOption = (fieldId: string) => {
    const f = fields.find(x => x.id === fieldId);
    if (!f) return;
    updateField(fieldId, { options: [...f.options, ""] });
  };

  const updateOption = (fieldId: string, optIdx: number, val: string) => {
    const f = fields.find(x => x.id === fieldId);
    if (!f) return;
    const opts = [...f.options];
    opts[optIdx] = val;
    updateField(fieldId, { options: opts });
  };

  const removeOption = (fieldId: string, optIdx: number) => {
    const f = fields.find(x => x.id === fieldId);
    if (!f) return;
    updateField(fieldId, { options: f.options.filter((_, i) => i !== optIdx) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
      </div>
    );
  }

  if (!form) {
    return <div className="text-center py-32 text-gray-400">フォームが見つかりません</div>;
  }

  const hasChoices = (t: FieldType) => ["checkbox", "radio", "dropdown"].includes(t);
  const isHeading = (t: FieldType) => ["heading_sm", "heading_md"].includes(t);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/line/forms" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">フォーム編集</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.is_published ? (
                <span className="text-green-600">公開中</span>
              ) : (
                <span>非公開</span>
              )}
              {form.slug && <span className="ml-2">URL: /forms/{form.slug}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/line/forms/${id}/responses`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            回答一覧
          </Link>
          <button
            onClick={openPreview}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            プレビュー
          </button>
          <button
            onClick={togglePublish}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${form.is_published ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-blue-500 text-white hover:bg-blue-600"}`}
          >
            {form.is_published ? "非公開にする" : "公開する"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors disabled:opacity-40 shadow-sm"
          >
            {saving ? "保存中..." : saved ? "保存しました" : "保存"}
          </button>
          <button
            onClick={saveAndPreview}
            disabled={saving}
            className="px-4 py-2 border-2 border-[#00B900] text-[#00B900] rounded-lg text-sm font-medium hover:bg-[#00B900]/5 transition-colors disabled:opacity-40"
          >
            保存してプレビュー
          </button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="grid grid-cols-[1fr_200px] gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">フォーム名（管理用）</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">フォルダ</label>
            <select
              value={folderId || ""}
              onChange={e => setFolderId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
            >
              <option value="">未分類</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 mb-1 block">表示タイトル</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ユーザーに表示されるタイトル"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">説明文</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="フォーム上部に表示される説明文"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] resize-none"
          />
        </div>
      </div>

      {/* タブ */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
        <button
          onClick={() => setTab("fields")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${tab === "fields" ? "text-[#00B900]" : "text-gray-500 hover:text-gray-700"}`}
        >
          フィールド ({fields.length})
          {tab === "fields" && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00B900] rounded-full" />}
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${tab === "settings" ? "text-[#00B900]" : "text-gray-500 hover:text-gray-700"}`}
        >
          設定
          {tab === "settings" && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00B900] rounded-full" />}
        </button>
      </div>

      {/* フィールドタブ */}
      {tab === "fields" && (
        <div>
          {/* フィールド追加ボタン */}
          <div className="flex flex-wrap gap-2 mb-5">
            {FIELD_TYPES.map(ft => (
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
                const ftInfo = FIELD_TYPES.find(ft => ft.type === field.type);
                return (
                  <div key={field.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* ヘッダー */}
                    <div
                      className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpandedField(expanded ? null : field.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-gray-400 w-6 text-center flex-shrink-0">{idx + 1}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 flex-shrink-0">{ftInfo?.label}</span>
                        <span className="text-sm text-gray-800 truncate">{field.label || "（未設定）"}</span>
                        {field.required && <span className="text-[9px] bg-red-50 text-red-500 px-1 py-0.5 rounded flex-shrink-0">必須</span>}
                        {field.hidden && <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded flex-shrink-0">非表示</span>}
                        {field.display_conditions && <span className="text-[9px] bg-blue-50 text-blue-500 px-1 py-0.5 rounded flex-shrink-0">条件分岐</span>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={e => { e.stopPropagation(); moveField(field.id, -1); }} disabled={idx === 0} className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors" title="上へ">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={e => { e.stopPropagation(); moveField(field.id, 1); }} disabled={idx === fields.length - 1} className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors" title="下へ">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button onClick={e => { e.stopPropagation(); duplicateField(field.id); }} className="p-1 text-gray-300 hover:text-gray-500 transition-colors" title="コピー">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <button onClick={e => { e.stopPropagation(); removeField(field.id); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="削除">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ml-1 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    {/* 展開エリア */}
                    {expanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
                        {/* ラベル */}
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            {isHeading(field.type) ? "見出しテキスト" : "項目名"}
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={e => updateField(field.id, { label: e.target.value })}
                            placeholder={isHeading(field.type) ? "見出しテキストを入力" : "項目名を入力"}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                          />
                        </div>

                        {/* 説明文 */}
                        {!isHeading(field.type) && (
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">説明文</label>
                            <input
                              type="text"
                              value={field.description}
                              onChange={e => updateField(field.id, { description: e.target.value })}
                              placeholder="項目の補足説明"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                            />
                          </div>
                        )}

                        {/* プレースホルダ (text/textarea) */}
                        {(field.type === "text" || field.type === "textarea") && (
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">プレースホルダ</label>
                            <input
                              type="text"
                              value={field.placeholder}
                              onChange={e => updateField(field.id, { placeholder: e.target.value })}
                              placeholder="入力欄に表示される薄いテキスト"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                            />
                          </div>
                        )}

                        {/* 選択肢 (checkbox/radio/dropdown) */}
                        {hasChoices(field.type) && (
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">選択肢</label>
                            <div className="space-y-2">
                              {field.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-5 text-center">{oi + 1}</span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={e => updateOption(field.id, oi, e.target.value)}
                                    placeholder={`選択肢${oi + 1}`}
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                                  />
                                  <button onClick={() => removeOption(field.id, oi)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => addOption(field.id)}
                              className="mt-2 text-xs text-[#00B900] hover:underline"
                            >
                              + 選択肢を追加
                            </button>
                          </div>
                        )}

                        {/* テキスト文字数制限 */}
                        {(field.type === "text" || field.type === "textarea") && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">最小文字数</label>
                              <input
                                type="number"
                                value={field.min_length ?? ""}
                                onChange={e => updateField(field.id, { min_length: e.target.value ? parseInt(e.target.value) : null })}
                                placeholder="なし"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">最大文字数</label>
                              <input
                                type="number"
                                value={field.max_length ?? ""}
                                onChange={e => updateField(field.id, { max_length: e.target.value ? parseInt(e.target.value) : null })}
                                placeholder="なし"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                              />
                            </div>
                          </div>
                        )}

                        {/* 必須・非表示 + 登録先 */}
                        {!isHeading(field.type) && (
                          <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={e => updateField(field.id, { required: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-[#00B900] focus:ring-[#00B900]"
                              />
                              必須
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                              <input
                                type="checkbox"
                                checked={field.hidden}
                                onChange={e => updateField(field.id, { hidden: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-[#00B900] focus:ring-[#00B900]"
                              />
                              非表示
                            </label>
                            <div className="ml-auto flex items-center gap-2">
                              <label className="text-xs text-gray-500">登録先:</label>
                              <select
                                value={field.save_target}
                                onChange={e => updateField(field.id, { save_target: e.target.value, save_target_field_id: "" })}
                                className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900]"
                              >
                                {SAVE_TARGETS.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                              </select>
                              {field.save_target === "friend_field" && (
                                <select
                                  value={field.save_target_field_id}
                                  onChange={e => updateField(field.id, { save_target_field_id: e.target.value })}
                                  className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900]"
                                >
                                  <option value="">欄を選択...</option>
                                  {friendFields.map(ff => <option key={ff.id} value={String(ff.id)}>{ff.name}</option>)}
                                </select>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 表示条件（条件分岐） */}
                        <DisplayConditionEditor
                          field={field}
                          allFields={fields}
                          onUpdate={(dc) => updateField(field.id, { display_conditions: dc })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 設定タブ */}
      {tab === "settings" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {/* 確認テキスト */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium w-48 align-top whitespace-nowrap bg-gray-50/50">確認テキスト</td>
                <td className="px-5 py-4">
                  <textarea
                    value={settings.confirm_text}
                    onChange={e => setSettings(s => ({ ...s, confirm_text: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] resize-none"
                  />
                </td>
              </tr>
              {/* ダイアログ送信ボタン */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium bg-gray-50/50">ダイアログ送信ボタン</td>
                <td className="px-5 py-4">
                  <input
                    type="text"
                    value={settings.confirm_button_text}
                    onChange={e => setSettings(s => ({ ...s, confirm_button_text: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                  />
                </td>
              </tr>
              {/* ダイアログキャンセルボタン */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium bg-gray-50/50">ダイアログキャンセルボタン</td>
                <td className="px-5 py-4">
                  <input
                    type="text"
                    value={settings.confirm_cancel_text}
                    onChange={e => setSettings(s => ({ ...s, confirm_cancel_text: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                  />
                </td>
              </tr>
              {/* 回答期限 */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium bg-gray-50/50">回答期限</td>
                <td className="px-5 py-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.deadline_enabled}
                      onChange={e => setSettings(s => ({ ...s, deadline_enabled: e.target.checked, deadline: e.target.checked ? s.deadline : "" }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#00B900] focus:ring-[#00B900]"
                    />
                    設定する
                  </label>
                  {settings.deadline_enabled && (
                    <input
                      type="datetime-local"
                      value={settings.deadline}
                      onChange={e => setSettings(s => ({ ...s, deadline: e.target.value }))}
                      className="mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                    />
                  )}
                </td>
              </tr>
              {/* 先着数制限 */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium bg-gray-50/50">先着数制限</td>
                <td className="px-5 py-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.max_responses_enabled}
                      onChange={e => setSettings(s => ({ ...s, max_responses_enabled: e.target.checked, max_responses: e.target.checked ? s.max_responses : null }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#00B900] focus:ring-[#00B900]"
                    />
                    制限する
                  </label>
                  {settings.max_responses_enabled && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        value={settings.max_responses ?? ""}
                        onChange={e => setSettings(s => ({ ...s, max_responses: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="100"
                        min={1}
                        className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                      />
                      <span className="text-sm text-gray-500">人</span>
                    </div>
                  )}
                </td>
              </tr>
              {/* 1人が回答できる回数 */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium bg-gray-50/50">1人が回答できる回数</td>
                <td className="px-5 py-4">
                  <select
                    value={settings.responses_per_person ?? ""}
                    onChange={e => setSettings(s => ({ ...s, responses_per_person: e.target.value ? parseInt(e.target.value) : null }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                  >
                    <option value="">何度でも可能</option>
                    <option value="1">1回のみ</option>
                    <option value="2">2回まで</option>
                    <option value="3">3回まで</option>
                    <option value="5">5回まで</option>
                    <option value="10">10回まで</option>
                  </select>
                </td>
              </tr>
              {/* サンクスページURL */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium bg-gray-50/50">サンクスページURL</td>
                <td className="px-5 py-4">
                  <input
                    type="url"
                    value={settings.thanks_url}
                    onChange={e => setSettings(s => ({ ...s, thanks_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                  />
                  <p className="text-xs text-gray-400 mt-1">空欄の場合は完了メッセージを表示します</p>
                </td>
              </tr>
              {/* 完了メッセージ */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium align-top bg-gray-50/50">完了メッセージ</td>
                <td className="px-5 py-4">
                  <textarea
                    value={settings.thanks_message}
                    onChange={e => setSettings(s => ({ ...s, thanks_message: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] resize-none"
                  />
                </td>
              </tr>
              {/* 送信後アクション */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium align-top bg-gray-50/50">送信後アクション</td>
                <td className="px-5 py-4">
                  <p className="text-xs text-gray-400 mb-2">フォーム送信時に自動実行するアクションを選択（複数可）</p>
                  {actions.length === 0 ? (
                    <p className="text-xs text-gray-400">アクションがありません。「アクション管理」で作成してください。</p>
                  ) : (
                    <div className="space-y-1.5">
                      {actions.map(a => (
                        <label key={a.id} className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={(settings.post_actions || []).includes(a.id)}
                            onChange={e => {
                              const current = settings.post_actions || [];
                              setSettings(s => ({
                                ...s,
                                post_actions: e.target.checked
                                  ? [...current, a.id]
                                  : current.filter((x: number) => x !== a.id),
                              }));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#00B900] focus:ring-[#00B900]"
                          />
                          {a.name}
                        </label>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
              {/* 回答後自動アクション */}
              <tr className="border-b border-gray-100">
                <td className="px-5 py-4 text-gray-700 font-medium align-top bg-gray-50/50">回答後アクション</td>
                <td className="px-5 py-4">
                  <p className="text-xs text-gray-400 mb-3">フォーム回答後に自動実行するアクションを設定（複数可・順番に実行）</p>

                  {/* アクション一覧 */}
                  {(settings.post_submit_actions || []).length > 0 && (
                    <div className="space-y-2 mb-3">
                      {(settings.post_submit_actions || []).map((action, ai) => (
                        <div key={ai} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                          <span className="text-xs text-gray-400 w-5 text-center flex-shrink-0">{ai + 1}</span>

                          {/* アクション種別 */}
                          <select
                            value={action.type}
                            onChange={e => {
                              const newType = e.target.value as PostSubmitAction["type"];
                              const updated = [...(settings.post_submit_actions || [])];
                              updated[ai] = { type: newType };
                              setSettings(s => ({ ...s, post_submit_actions: updated }));
                            }}
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900] flex-shrink-0"
                          >
                            <option value="tag_add">タグ追加</option>
                            <option value="tag_remove">タグ削除</option>
                            <option value="send_message">メッセージ送信</option>
                            <option value="workflow">ワークフロー実行</option>
                          </select>

                          {/* タグ選択（tag_add / tag_remove） */}
                          {(action.type === "tag_add" || action.type === "tag_remove") && (
                            <select
                              value={action.tag_id ?? ""}
                              onChange={e => {
                                const updated = [...(settings.post_submit_actions || [])];
                                updated[ai] = { ...action, tag_id: e.target.value ? Number(e.target.value) : undefined };
                                setSettings(s => ({ ...s, post_submit_actions: updated }));
                              }}
                              className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900] flex-1 min-w-0"
                            >
                              <option value="">タグを選択...</option>
                              {tagDefs.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          )}

                          {/* テンプレート選択（send_message） */}
                          {action.type === "send_message" && (
                            <select
                              value={action.template_id ?? ""}
                              onChange={e => {
                                const updated = [...(settings.post_submit_actions || [])];
                                updated[ai] = { ...action, template_id: e.target.value ? Number(e.target.value) : undefined };
                                setSettings(s => ({ ...s, post_submit_actions: updated }));
                              }}
                              className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900] flex-1 min-w-0"
                            >
                              <option value="">テンプレートを選択...</option>
                              {templateDefs.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          )}

                          {/* ワークフロー選択（workflow） */}
                          {action.type === "workflow" && (
                            <select
                              value={action.workflow_id ?? ""}
                              onChange={e => {
                                const updated = [...(settings.post_submit_actions || [])];
                                updated[ai] = { ...action, workflow_id: e.target.value || undefined };
                                setSettings(s => ({ ...s, post_submit_actions: updated }));
                              }}
                              className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900] flex-1 min-w-0"
                            >
                              <option value="">ワークフローを選択...</option>
                              {workflowDefs.filter(w => w.status === "active").map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                          )}

                          {/* 削除ボタン */}
                          <button
                            onClick={() => {
                              const updated = (settings.post_submit_actions || []).filter((_, i) => i !== ai);
                              setSettings(s => ({ ...s, post_submit_actions: updated }));
                            }}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                            title="アクションを削除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* アクション追加ボタン */}
                  <button
                    onClick={() => {
                      const newAction: PostSubmitAction = { type: "tag_add" };
                      setSettings(s => ({
                        ...s,
                        post_submit_actions: [...(s.post_submit_actions || []), newAction],
                      }));
                    }}
                    className="text-xs text-[#00B900] hover:underline flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    アクションを追加
                  </button>

                  {(settings.post_submit_actions || []).length === 0 && (
                    <p className="text-xs text-gray-400 mt-2">アクションが未設定です。LINE友だちに対してタグ付け・メッセージ送信・ワークフロー実行を自動化できます。</p>
                  )}
                </td>
              </tr>
              {/* 回答復元 */}
              <tr>
                <td className="px-5 py-4 text-gray-700 font-medium align-top bg-gray-50/50">回答復元</td>
                <td className="px-5 py-4">
                  <label className="flex items-start gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.allow_restore}
                      onChange={e => setSettings(s => ({ ...s, allow_restore: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#00B900] focus:ring-[#00B900]"
                    />
                    <div>
                      2回目以降の回答時に前回の回答を復元する(初期値は無視されます)
                      <p className="text-xs text-gray-400 mt-0.5">別のフォームの回答や、回答した端末が異なる場合、時間が経過した場合は復元できません</p>
                    </div>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
