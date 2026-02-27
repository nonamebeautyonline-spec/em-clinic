/**
 * フォーム表示条件（条件分岐）の評価ロジック
 *
 * display_conditions の構造:
 * - 単一条件: { when: "field_id", operator: "equals", value: "比較値" }
 * - 複数条件: { logic: "and" | "or", conditions: [単一条件, ...] }
 * - null/undefined: 常に表示
 */

// ============================================================
// 型定義
// ============================================================

/** 演算子の種類 */
export type ConditionOperator =
  | "equals"      // 等しい
  | "not_equals"  // 等しくない
  | "contains"    // 含む
  | "not_empty"   // 空でない
  | "is_empty";   // 空である

/** 単一条件 */
export interface SingleCondition {
  when: string;              // 参照先フィールドID
  operator: ConditionOperator;
  value?: string;            // 比較値（not_empty / is_empty では不要）
}

/** 複合条件（AND/OR） */
export interface CompoundCondition {
  logic: "and" | "or";
  conditions: SingleCondition[];
}

/** display_conditions の型（単一 or 複合 or null） */
export type DisplayConditions = SingleCondition | CompoundCondition | null | undefined;

// ============================================================
// 評価関数
// ============================================================

/**
 * フォーム値が「空」かどうかを判定
 */
function isEmpty(val: unknown): boolean {
  if (val === undefined || val === null || val === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

/**
 * 単一条件を評価する
 * @param condition 単一条件
 * @param formValues フォームの現在の回答値（field_id → value のマップ）
 * @returns 条件を満たす場合 true
 */
export function evaluateCondition(
  condition: SingleCondition,
  formValues: Record<string, unknown>
): boolean {
  const fieldValue = formValues[condition.when];

  switch (condition.operator) {
    case "equals": {
      // 配列の場合：指定した値が含まれているかチェック
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value ?? "");
      }
      return String(fieldValue ?? "") === String(condition.value ?? "");
    }

    case "not_equals": {
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(condition.value ?? "");
      }
      return String(fieldValue ?? "") !== String(condition.value ?? "");
    }

    case "contains": {
      // 配列の場合：いずれかの要素に含まれているかチェック
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => String(v).includes(condition.value ?? ""));
      }
      return String(fieldValue ?? "").includes(condition.value ?? "");
    }

    case "not_empty": {
      return !isEmpty(fieldValue);
    }

    case "is_empty": {
      return isEmpty(fieldValue);
    }

    default:
      // 不明な演算子は常にtrue（表示）
      return true;
  }
}

/**
 * 型ガード: CompoundCondition かどうか
 */
function isCompoundCondition(
  dc: SingleCondition | CompoundCondition
): dc is CompoundCondition {
  return "logic" in dc && "conditions" in dc;
}

/**
 * display_conditions を評価する（単一・複合どちらにも対応）
 * @param displayConditions 表示条件（null/undefinedなら常にtrue）
 * @param formValues フォームの現在の回答値
 * @returns 表示すべき場合 true
 */
export function evaluateDisplayConditions(
  displayConditions: DisplayConditions,
  formValues: Record<string, unknown>
): boolean {
  // 条件なし = 常に表示
  if (!displayConditions) return true;

  // 複合条件
  if (isCompoundCondition(displayConditions)) {
    const { logic, conditions } = displayConditions;

    if (!conditions || conditions.length === 0) return true;

    if (logic === "or") {
      return conditions.some(c => evaluateCondition(c, formValues));
    }
    // デフォルトは AND
    return conditions.every(c => evaluateCondition(c, formValues));
  }

  // 単一条件
  return evaluateCondition(displayConditions, formValues);
}

/**
 * フォームフィールドの配列から、表示すべきフィールドIDのSetを返す
 * @param fields フィールド定義配列（display_conditions を含む）
 * @param formValues フォームの現在の回答値
 * @returns 表示すべきフィールドIDのSet
 */
export function getVisibleFieldIds(
  fields: Array<{ id: string; display_conditions?: DisplayConditions }>,
  formValues: Record<string, unknown>
): Set<string> {
  const visible = new Set<string>();
  for (const field of fields) {
    if (evaluateDisplayConditions(field.display_conditions, formValues)) {
      visible.add(field.id);
    }
  }
  return visible;
}
