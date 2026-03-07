"use client";

/**
 * 条件ビルダーコンポーネント
 *
 * AND/ORのビジュアルグループ化とネスト対応の条件設定UI。
 * - AND: 青枠でグループ化
 * - OR: オレンジ枠でグループ化
 * - 条件行: フィールド選択 -> 演算子選択 -> 値入力
 * - ネストされた条件グループの追加/削除
 */

import { useState } from "react";
import type {
  CompoundCondition,
  SingleCondition,
  ConditionItem,
  ConditionOperator,
} from "@/lib/form-conditions";
import { isCompoundCondition } from "@/lib/form-conditions";

// ============================================================
// 型定義
// ============================================================

/** フィールド情報（最小限のprops用） */
export interface ConditionField {
  id: string;
  label: string;
  type: string;
  options?: string[];
}

export interface ConditionBuilderProps {
  /** 現在の条件値 */
  value: CompoundCondition;
  /** 条件変更時のコールバック */
  onChange: (condition: CompoundCondition) => void;
  /** 参照可能なフィールド一覧 */
  fields: ConditionField[];
  /** ネストの深さ（内部用） */
  depth?: number;
}

// ============================================================
// 定数
// ============================================================

/** 演算子定義 */
const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "等しい" },
  { value: "not_equals", label: "等しくない" },
  { value: "contains", label: "含む" },
  { value: "not_empty", label: "空でない" },
  { value: "is_empty", label: "空である" },
];

/** 値の入力が不要な演算子 */
const NO_VALUE_OPERATORS: ConditionOperator[] = ["not_empty", "is_empty"];

/** ネストの最大深度（UIの過度な複雑化を防止） */
const MAX_DEPTH = 3;

// ============================================================
// ヘルパー関数
// ============================================================

/** 空の単一条件を作成 */
export function createEmptyCondition(fields: ConditionField[]): SingleCondition {
  return {
    when: fields[0]?.id ?? "",
    operator: "equals",
    value: "",
  };
}

/** 空の複合条件を作成 */
export function createEmptyGroup(
  logic: "and" | "or",
  fields: ConditionField[]
): CompoundCondition {
  return {
    logic,
    conditions: [createEmptyCondition(fields)],
  };
}

/** フィールドの選択肢を取得（選択肢型の場合のみ） */
function getFieldOptions(fieldId: string, fields: ConditionField[]): string[] | null {
  const f = fields.find((x) => x.id === fieldId);
  if (!f) return null;
  if (["checkbox", "radio", "dropdown"].includes(f.type) && f.options && f.options.length > 0) {
    return f.options;
  }
  return null;
}

// ============================================================
// 単一条件行コンポーネント
// ============================================================

function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
  canRemove,
}: {
  condition: SingleCondition;
  fields: ConditionField[];
  onChange: (updated: SingleCondition) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const fieldOptions = getFieldOptions(condition.when, fields);
  const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator);

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-gray-100 shadow-sm">
      {/* フィールド選択 */}
      <select
        value={condition.when}
        onChange={(e) => onChange({ ...condition, when: e.target.value, value: "" })}
        className="px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 min-w-0 flex-shrink truncate"
        aria-label="対象フィールド"
      >
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label || "(未設定)"}
          </option>
        ))}
      </select>

      {/* 演算子 */}
      <select
        value={condition.operator}
        onChange={(e) => {
          const newOp = e.target.value as ConditionOperator;
          const updated: SingleCondition = {
            ...condition,
            operator: newOp,
          };
          if (NO_VALUE_OPERATORS.includes(newOp)) {
            updated.value = undefined;
          }
          onChange(updated);
        }}
        className="px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 flex-shrink-0"
        aria-label="演算子"
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* 比較値 */}
      {needsValue &&
        (fieldOptions && fieldOptions.length > 0 ? (
          <select
            value={condition.value ?? ""}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 min-w-0 flex-1"
            aria-label="比較値"
          >
            <option value="">値を選択...</option>
            {fieldOptions
              .filter((o) => o)
              .map((opt, oi) => (
                <option key={oi} value={opt}>
                  {opt}
                </option>
              ))}
          </select>
        ) : (
          <input
            type="text"
            value={condition.value ?? ""}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="比較値"
            className="px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 min-w-0 flex-1"
            aria-label="比較値"
          />
        ))}

      {/* 削除ボタン */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
          title="条件を削除"
          aria-label="条件を削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================
// AND/OR トグルスイッチ
// ============================================================

function LogicToggle({
  logic,
  onChange,
}: {
  logic: "and" | "or";
  onChange: (logic: "and" | "or") => void;
}) {
  return (
    <div className="flex items-center gap-1 my-1">
      <button
        onClick={() => onChange("and")}
        className={`px-2.5 py-1 rounded-l-md text-xs font-semibold transition-all border ${
          logic === "and"
            ? "bg-blue-500 text-white border-blue-500 shadow-sm"
            : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
        }`}
        aria-label="AND条件に切替"
        data-testid="logic-toggle-and"
      >
        AND
      </button>
      <button
        onClick={() => onChange("or")}
        className={`px-2.5 py-1 rounded-r-md text-xs font-semibold transition-all border ${
          logic === "or"
            ? "bg-orange-500 text-white border-orange-500 shadow-sm"
            : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
        }`}
        aria-label="OR条件に切替"
        data-testid="logic-toggle-or"
      >
        OR
      </button>
    </div>
  );
}

// ============================================================
// 条件グループ（ネスト対応の再帰コンポーネント）
// ============================================================

function ConditionGroup({
  value,
  onChange,
  onRemove,
  fields,
  depth,
  canRemove,
}: {
  value: CompoundCondition;
  onChange: (updated: CompoundCondition) => void;
  onRemove?: () => void;
  fields: ConditionField[];
  depth: number;
  canRemove: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // グループの枠線色: AND=青、OR=オレンジ
  const borderColor = value.logic === "and" ? "border-blue-300" : "border-orange-300";
  const bgColor = value.logic === "and" ? "bg-blue-50/50" : "bg-orange-50/50";
  const labelColor = value.logic === "and" ? "text-blue-600" : "text-orange-600";
  const labelBg = value.logic === "and" ? "bg-blue-100" : "bg-orange-100";
  const connectorText = value.logic === "and" ? "かつ" : "または";

  // 条件項目の更新
  const updateItem = (index: number, updated: ConditionItem) => {
    const newConditions = [...value.conditions];
    newConditions[index] = updated;
    onChange({ ...value, conditions: newConditions });
  };

  // 条件項目の削除
  const removeItem = (index: number) => {
    const newConditions = value.conditions.filter((_, i) => i !== index);
    if (newConditions.length === 0) {
      // 最後の条件を削除 → グループ自体を削除
      onRemove?.();
    } else {
      onChange({ ...value, conditions: newConditions });
    }
  };

  // 単一条件を追加
  const addCondition = () => {
    onChange({
      ...value,
      conditions: [...value.conditions, createEmptyCondition(fields)],
    });
  };

  // ネストされたグループを追加
  const addGroup = (logic: "and" | "or") => {
    const newGroup = createEmptyGroup(logic, fields);
    onChange({
      ...value,
      conditions: [...value.conditions, newGroup],
    });
  };

  // ロジック切替
  const toggleLogic = (newLogic: "and" | "or") => {
    onChange({ ...value, logic: newLogic });
  };

  return (
    <div
      className={`rounded-lg border-2 ${borderColor} ${bgColor} p-3 relative`}
      data-testid={`condition-group-${value.logic}`}
    >
      {/* グループヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* ロジックラベル */}
          <span
            className={`${labelBg} ${labelColor} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}
          >
            {value.logic === "and" ? "AND (すべて満たす)" : "OR (いずれか満たす)"}
          </span>

          {/* AND/ORトグル */}
          <LogicToggle logic={value.logic} onChange={toggleLogic} />

          {/* 折りたたみ */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            title={collapsed ? "展開" : "折りたたむ"}
            aria-label={collapsed ? "展開" : "折りたたむ"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* グループ削除 */}
        {canRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
            title="グループを削除"
            aria-label="グループを削除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 条件一覧 */}
      {!collapsed && (
        <div className="space-y-1.5">
          {value.conditions.map((item, index) => (
            <div key={index}>
              {/* 条件間のコネクタ表示 */}
              {index > 0 && (
                <div className="flex items-center justify-center my-1">
                  <span
                    className={`text-[10px] font-semibold ${labelColor} px-2 py-0.5 rounded-full ${labelBg}`}
                  >
                    {connectorText}
                  </span>
                </div>
              )}

              {isCompoundCondition(item) ? (
                // ネストされたグループ
                <ConditionGroup
                  value={item}
                  onChange={(updated) => updateItem(index, updated)}
                  onRemove={() => removeItem(index)}
                  fields={fields}
                  depth={depth + 1}
                  canRemove={true}
                />
              ) : (
                // 単一条件行
                <ConditionRow
                  condition={item}
                  fields={fields}
                  onChange={(updated) => updateItem(index, updated)}
                  onRemove={() => removeItem(index)}
                  canRemove={value.conditions.length > 1 || canRemove}
                />
              )}
            </div>
          ))}

          {/* アクションボタン */}
          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={addCondition}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#00B900] transition-colors"
              aria-label="条件を追加"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              条件を追加
            </button>

            {depth < MAX_DEPTH && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => addGroup(value.logic === "and" ? "or" : "and")}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
                  aria-label="グループを追加"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h8m-8 6h16"
                    />
                  </svg>
                  グループを追加
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// メインコンポーネント（エクスポート）
// ============================================================

export default function ConditionBuilder({
  value,
  onChange,
  fields,
  depth = 0,
}: ConditionBuilderProps) {
  if (fields.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        参照可能なフィールドがありません。他のフィールドを追加してください。
      </p>
    );
  }

  return (
    <ConditionGroup
      value={value}
      onChange={onChange}
      fields={fields}
      depth={depth}
      canRemove={false}
    />
  );
}
