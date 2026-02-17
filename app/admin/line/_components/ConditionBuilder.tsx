"use client";

import { useState } from "react";

// ── 型定義 ──────────────────────────────────────────────

export interface ConditionRule {
  type: "tag" | "mark" | "name" | "registered_date" | "field"
    | "visit_count" | "purchase_amount" | "last_visit" | "reorder_count";
  // タグ条件
  tag_ids?: number[];
  tag_match?: "any_include" | "all_include" | "any_exclude" | "all_exclude";
  // 対応マーク条件
  mark_values?: string[];
  mark_match?: "any_match" | "all_match" | "any_exclude" | "all_exclude";
  // 名前条件
  name_operator?: "contains" | "not_contains" | "equals";
  name_value?: string;
  // 友だち登録日条件
  date_operator?: "before" | "after" | "between";
  date_value?: string;
  date_value_end?: string;
  // 友だち情報フィールド条件
  field_id?: number;
  field_operator?: "=" | "!=" | ">" | ">=" | "<" | "<=" | "contains";
  field_value?: string;
  // 行動データ条件（来院回数・購入金額・最終来院日・再処方回数）
  behavior_operator?: string;
  behavior_value?: string;
  behavior_value_end?: string;
  behavior_date_range?: string;
}

export interface StepCondition {
  enabled: boolean;
  rules: ConditionRule[];
}

export interface TagDef {
  id: number;
  name: string;
  color: string;
}

export interface MarkDef {
  id: number;
  value: string;
  label: string;
  color: string;
}

export interface FieldDef {
  id: number;
  name: string;
  field_type: string;
}

// ── タグマッチのラベル ──────────────────────────────────

const TAG_MATCH_OPTIONS: { value: ConditionRule["tag_match"]; label: string }[] = [
  { value: "any_include", label: "選択したタグのいずれか1つ以上を含む人" },
  { value: "all_include", label: "選択したタグを全て含む人" },
  { value: "any_exclude", label: "選択したタグを1つ以上含む人を除外" },
  { value: "all_exclude", label: "選択したタグを全て含む人を除外" },
];

const MARK_MATCH_OPTIONS: { value: ConditionRule["mark_match"]; label: string }[] = [
  { value: "any_match", label: "選択した対応マークのいずれかに一致" },
  { value: "all_match", label: "選択した対応マークの全てに一致" },
  { value: "any_exclude", label: "選択した対応マークを1つ以上含む人を除外" },
  { value: "all_exclude", label: "選択した対応マークを全て含む人を除外" },
];

const CONDITION_TYPES: { type: ConditionRule["type"]; label: string }[] = [
  { type: "tag", label: "タグ" },
  { type: "mark", label: "対応マーク" },
  { type: "name", label: "名前" },
  { type: "registered_date", label: "友だち登録日" },
  { type: "field", label: "友だち情報" },
  { type: "visit_count", label: "来院回数" },
  { type: "purchase_amount", label: "購入金額" },
  { type: "last_visit", label: "最終来院日" },
  { type: "reorder_count", label: "再処方回数" },
];

// ── 条件ON/OFFトグル（ステップ横に表示） ────────────────

export function ConditionToggle({
  condition,
  onChange,
  onEditClick,
}: {
  condition: StepCondition;
  onChange: (condition: StepCondition) => void;
  onEditClick: () => void;
}) {
  const handleClick = () => {
    if (!condition.enabled) {
      // OFFからONにする時：ONにしてモーダルを開く
      onChange({ ...condition, enabled: true });
      onEditClick();
    } else {
      // 既にONの時：条件設定モーダルを開く
      onEditClick();
    }
  };

  const handleOff = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ ...condition, enabled: false, rules: [] });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
          condition.enabled
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {condition.enabled ? "条件ON" : "条件OFF"}
      </button>
      {condition.enabled && (
        <button
          type="button"
          onClick={handleOff}
          className="p-0.5 rounded text-amber-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="条件をOFFにする"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── 条件サマリー表示（ステップ内に表示） ────────────────

export function ConditionSummary({
  condition,
  tags,
  marks,
  onEditClick,
  onRemoveClick,
}: {
  condition: StepCondition;
  tags: TagDef[];
  marks: MarkDef[];
  onEditClick: () => void;
  onRemoveClick: () => void;
}) {
  if (!condition.enabled || condition.rules.length === 0) return null;

  const parts: string[] = [];
  for (const rule of condition.rules) {
    if (rule.type === "tag" && rule.tag_ids?.length) {
      const tagNames = rule.tag_ids
        .map(id => tags.find(t => t.id === id)?.name || `ID:${id}`)
        .join(", ");
      const matchLabel = TAG_MATCH_OPTIONS.find(o => o.value === rule.tag_match)?.label || "";
      parts.push(`タグ${tagNames} (${matchLabel})`);
    }
    if (rule.type === "mark" && rule.mark_values?.length) {
      const markNames = rule.mark_values
        .map(v => marks.find(m => m.value === v)?.label || v)
        .join(", ");
      const matchLabel = MARK_MATCH_OPTIONS.find(o => o.value === rule.mark_match)?.label || "";
      parts.push(`対応マーク${markNames} (${matchLabel})`);
    }
    if (rule.type === "name" && rule.name_value) {
      parts.push(`名前「${rule.name_value}」`);
    }
    if (rule.type === "registered_date") {
      parts.push("友だち登録日");
    }
    if (rule.type === "field") {
      parts.push("友だち情報");
    }
    if (rule.type === "visit_count") {
      parts.push(`来院回数${rule.behavior_operator || ">="}${rule.behavior_value || "0"}回`);
    }
    if (rule.type === "purchase_amount") {
      parts.push(`購入金額${rule.behavior_operator || ">="}${rule.behavior_value || "0"}円`);
    }
    if (rule.type === "last_visit") {
      const op = rule.behavior_operator === "within_days" ? "以内" : "以上前";
      parts.push(`最終来院${rule.behavior_value || "30"}日${op}`);
    }
    if (rule.type === "reorder_count") {
      parts.push(`再処方${rule.behavior_operator || ">="}${rule.behavior_value || "0"}回`);
    }
  }

  const summary = parts.length > 0 ? `実行条件: ${parts.join(" and ")}` : "実行条件あり";

  return (
    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
      <span className="flex-1 truncate">{summary}</span>
      <button
        type="button"
        onClick={onEditClick}
        className="px-2 py-0.5 bg-white border border-amber-300 rounded text-[11px] font-medium text-amber-700 hover:bg-amber-50 transition-colors flex-shrink-0"
      >
        編集
      </button>
      <button
        type="button"
        onClick={onRemoveClick}
        className="px-2 py-0.5 bg-red-50 border border-red-200 rounded text-[11px] font-medium text-red-600 hover:bg-red-100 transition-colors flex-shrink-0"
      >
        条件削除
      </button>
    </div>
  );
}

// ── 条件設定モーダル ────────────────────────────────────

export function ConditionBuilderModal({
  condition,
  tags,
  marks,
  fields,
  onSave,
  onClose,
}: {
  condition: StepCondition;
  tags: TagDef[];
  marks: MarkDef[];
  fields?: FieldDef[];
  onSave: (condition: StepCondition) => void;
  onClose: () => void;
}) {
  const [rules, setRules] = useState<ConditionRule[]>(
    condition.rules.length > 0 ? condition.rules : []
  );

  const addRule = (type: ConditionRule["type"]) => {
    const newRule: ConditionRule = { type };
    if (type === "tag") {
      newRule.tag_ids = [];
      newRule.tag_match = "any_include";
    }
    if (type === "mark") {
      newRule.mark_values = [];
      newRule.mark_match = "any_match";
    }
    if (type === "name") {
      newRule.name_operator = "contains";
      newRule.name_value = "";
    }
    if (type === "registered_date") {
      newRule.date_operator = "after";
      newRule.date_value = "";
    }
    if (type === "field") {
      newRule.field_id = fields?.[0]?.id;
      newRule.field_operator = "=";
      newRule.field_value = "";
    }
    if (type === "visit_count" || type === "purchase_amount" || type === "reorder_count") {
      newRule.behavior_operator = ">=";
      newRule.behavior_value = "1";
      newRule.behavior_date_range = "all";
    }
    if (type === "last_visit") {
      newRule.behavior_operator = "within_days";
      newRule.behavior_value = "30";
    }
    setRules(prev => [...prev, newRule]);
  };

  const updateRule = (index: number, updates: Partial<ConditionRule>) => {
    setRules(prev => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({ enabled: true, rules });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <h2 className="font-bold text-gray-900">条件設定</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-xs text-gray-500 mb-5">
            「すべて満たす」必要がある条件 (and条件)
          </p>

          {/* 条件ルール一覧 */}
          <div className="space-y-4">
            {rules.map((rule, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 relative bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="absolute top-3 left-3 p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* タグ条件 */}
                {rule.type === "tag" && (
                  <TagConditionEditor
                    rule={rule}
                    tags={tags}
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 対応マーク条件 */}
                {rule.type === "mark" && (
                  <MarkConditionEditor
                    rule={rule}
                    marks={marks}
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 名前条件 */}
                {rule.type === "name" && (
                  <NameConditionEditor
                    rule={rule}
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 友だち登録日条件 */}
                {rule.type === "registered_date" && (
                  <DateConditionEditor
                    rule={rule}
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 友だち情報フィールド条件 */}
                {rule.type === "field" && fields && (
                  <FieldConditionEditor
                    rule={rule}
                    fields={fields}
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 来院回数条件 */}
                {rule.type === "visit_count" && (
                  <NumericBehaviorEditor
                    label="来院回数"
                    unit="回"
                    rule={rule}
                    showDateRange
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 購入金額条件 */}
                {rule.type === "purchase_amount" && (
                  <NumericBehaviorEditor
                    label="購入金額"
                    unit="円"
                    rule={rule}
                    showDateRange
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 最終来院日条件 */}
                {rule.type === "last_visit" && (
                  <LastVisitEditor
                    rule={rule}
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}

                {/* 再処方回数条件 */}
                {rule.type === "reorder_count" && (
                  <NumericBehaviorEditor
                    label="再処方回数"
                    unit="回"
                    rule={rule}
                    showDateRange={false}
                    onUpdate={(updates) => updateRule(i, updates)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 条件追加ボタン */}
          <div className="mt-6">
            <p className="text-xs text-gray-400 mb-3 text-center">絞り込む項目を更に追加できます</p>
            <div className="flex flex-wrap justify-center gap-2">
              {CONDITION_TYPES.map(ct => (
                <button
                  key={ct.type}
                  type="button"
                  onClick={() => addRule(ct.type)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl text-sm font-bold hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/25"
          >
            この条件を設定する
          </button>
        </div>
      </div>
    </div>
  );
}

// ── タグ条件エディタ ────────────────────────────────────

function TagConditionEditor({
  rule,
  tags,
  onUpdate,
}: {
  rule: ConditionRule;
  tags: TagDef[];
  onUpdate: (updates: Partial<ConditionRule>) => void;
}) {
  const selectedIds = rule.tag_ids || [];

  const toggleTag = (tagId: number) => {
    const next = selectedIds.includes(tagId)
      ? selectedIds.filter(id => id !== tagId)
      : [...selectedIds, tagId];
    onUpdate({ tag_ids: next });
  };

  return (
    <div className="pl-8">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">タグ</span>

      {/* タグ選択 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map(t => {
          const selected = selectedIds.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selected
                  ? "text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
              style={selected ? { backgroundColor: t.color } : {}}
            >
              {selected && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {t.name}
            </button>
          );
        })}
        {tags.length === 0 && (
          <p className="text-xs text-gray-400">タグがまだ作成されていません</p>
        )}
      </div>

      {/* マッチモード */}
      {selectedIds.length > 0 && (
        <div className="mt-3">
          <select
            value={rule.tag_match || "any_include"}
            onChange={(e) => onUpdate({ tag_match: e.target.value as ConditionRule["tag_match"] })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
          >
            {TAG_MATCH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── 対応マーク条件エディタ ──────────────────────────────

function MarkConditionEditor({
  rule,
  marks,
  onUpdate,
}: {
  rule: ConditionRule;
  marks: MarkDef[];
  onUpdate: (updates: Partial<ConditionRule>) => void;
}) {
  const selectedValues = rule.mark_values || [];

  const toggleMark = (val: string) => {
    const next = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onUpdate({ mark_values: next });
  };

  return (
    <div className="pl-8">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">対応マーク</span>

      <div className="mt-3 flex flex-wrap gap-2">
        {marks.map(m => {
          const selected = selectedValues.includes(m.value);
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => toggleMark(m.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selected
                  ? "bg-white shadow-sm ring-2 ring-amber-400"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {m.value !== "none" ? (
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
              ) : (
                <span className="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              {m.label}
            </button>
          );
        })}
      </div>

      {selectedValues.length > 0 && (
        <div className="mt-3">
          <select
            value={rule.mark_match || "any_match"}
            onChange={(e) => onUpdate({ mark_match: e.target.value as ConditionRule["mark_match"] })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
          >
            {MARK_MATCH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── 名前条件エディタ ────────────────────────────────────

function NameConditionEditor({
  rule,
  onUpdate,
}: {
  rule: ConditionRule;
  onUpdate: (updates: Partial<ConditionRule>) => void;
}) {
  return (
    <div className="pl-8">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">名前</span>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={rule.name_operator || "contains"}
          onChange={(e) => onUpdate({ name_operator: e.target.value as ConditionRule["name_operator"] })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        >
          <option value="contains">を含む</option>
          <option value="not_contains">を含まない</option>
          <option value="equals">と一致</option>
        </select>
        <input
          type="text"
          value={rule.name_value || ""}
          onChange={(e) => onUpdate({ name_value: e.target.value })}
          placeholder="名前を入力"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        />
      </div>
    </div>
  );
}

// ── 友だち登録日条件エディタ ────────────────────────────

function DateConditionEditor({
  rule,
  onUpdate,
}: {
  rule: ConditionRule;
  onUpdate: (updates: Partial<ConditionRule>) => void;
}) {
  return (
    <div className="pl-8">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">友だち登録日</span>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={rule.date_operator || "after"}
          onChange={(e) => onUpdate({ date_operator: e.target.value as ConditionRule["date_operator"] })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        >
          <option value="after">以降</option>
          <option value="before">以前</option>
          <option value="between">期間</option>
        </select>
        <input
          type="date"
          value={rule.date_value || ""}
          onChange={(e) => onUpdate({ date_value: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        />
        {rule.date_operator === "between" && (
          <>
            <span className="text-xs text-gray-400">〜</span>
            <input
              type="date"
              value={rule.date_value_end || ""}
              onChange={(e) => onUpdate({ date_value_end: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
            />
          </>
        )}
      </div>
    </div>
  );
}

// ── 友だち情報フィールド条件エディタ ────────────────────

function FieldConditionEditor({
  rule,
  fields,
  onUpdate,
}: {
  rule: ConditionRule;
  fields: FieldDef[];
  onUpdate: (updates: Partial<ConditionRule>) => void;
}) {
  return (
    <div className="pl-8">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">友だち情報</span>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={rule.field_id || ""}
          onChange={(e) => onUpdate({ field_id: Number(e.target.value) })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        >
          <option value="">フィールドを選択</option>
          {fields.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          value={rule.field_operator || "="}
          onChange={(e) => onUpdate({ field_operator: e.target.value as ConditionRule["field_operator"] })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        >
          <option value="=">と一致</option>
          <option value="!=">と一致しない</option>
          <option value="contains">を含む</option>
          <option value=">">より大きい</option>
          <option value=">=">以上</option>
          <option value="<">より小さい</option>
          <option value="<=">以下</option>
        </select>
        <input
          type="text"
          value={rule.field_value || ""}
          onChange={(e) => onUpdate({ field_value: e.target.value })}
          placeholder="値を入力"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        />
      </div>
    </div>
  );
}

// ── 数値系行動データ条件エディタ（来院回数・購入金額・再処方回数共通） ──

const NUMERIC_OPERATORS = [
  { value: ">=", label: "以上" },
  { value: ">", label: "より多い" },
  { value: "=", label: "と等しい" },
  { value: "<=", label: "以下" },
  { value: "<", label: "より少ない" },
  { value: "between", label: "範囲" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "全期間" },
  { value: "30d", label: "過去30日" },
  { value: "90d", label: "過去90日" },
  { value: "180d", label: "過去180日" },
  { value: "1y", label: "過去1年" },
];

function NumericBehaviorEditor({
  label,
  unit,
  rule,
  showDateRange,
  onUpdate,
}: {
  label: string;
  unit: string;
  rule: ConditionRule;
  showDateRange: boolean;
  onUpdate: (updates: Partial<ConditionRule>) => void;
}) {
  return (
    <div className="pl-8">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={rule.behavior_operator || ">="}
            onChange={(e) => onUpdate({ behavior_operator: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
          >
            {NUMERIC_OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={rule.behavior_value || ""}
            onChange={(e) => onUpdate({ behavior_value: e.target.value })}
            placeholder="値"
            min="0"
            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
          />
          {rule.behavior_operator === "between" && (
            <>
              <span className="text-xs text-gray-400">〜</span>
              <input
                type="number"
                value={rule.behavior_value_end || ""}
                onChange={(e) => onUpdate({ behavior_value_end: e.target.value })}
                placeholder="上限"
                min="0"
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
              />
            </>
          )}
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
        {showDateRange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">集計期間:</span>
            <select
              value={rule.behavior_date_range || "all"}
              onChange={(e) => onUpdate({ behavior_date_range: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
            >
              {DATE_RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 最終来院日条件エディタ ──────────────────────────────────

function LastVisitEditor({
  rule,
  onUpdate,
}: {
  rule: ConditionRule;
  onUpdate: (updates: Partial<ConditionRule>) => void;
}) {
  return (
    <div className="pl-8">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">最終来院日</span>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={rule.behavior_operator || "within_days"}
          onChange={(e) => onUpdate({ behavior_operator: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        >
          <option value="within_days">日以内</option>
          <option value="before_days">日以上前</option>
        </select>
        <input
          type="number"
          value={rule.behavior_value || ""}
          onChange={(e) => onUpdate({ behavior_value: e.target.value })}
          placeholder="日数"
          min="1"
          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
        />
        <span className="text-xs text-gray-500">
          {rule.behavior_operator === "within_days" ? "日以内に来院あり" : "日以上来院なし"}
        </span>
      </div>
    </div>
  );
}
