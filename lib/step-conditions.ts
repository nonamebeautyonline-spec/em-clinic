// lib/step-conditions.ts — ステップ表示条件の複合条件評価
//
// display_conditions の構造:
// {
//   operator: "and" | "or",
//   conditions: [
//     { field: "tag_has", op: "equals", value: "タグ名" },
//     { field: "tag_not_has", op: "equals", value: "タグ名" },
//     { field: "custom_field_equals", op: "equals", value: "フィールド名:値" },
//     { field: "days_since_start_gte", op: "gte", value: 7 },
//     { field: "days_since_start_lte", op: "lte", value: 30 },
//     { field: "step_completed", op: "equals", value: "step-id" },
//   ]
// }

/* ---------- 型定義 ---------- */

/** 個別条件 */
export interface DisplayCondition {
  field: string;
  op: string;
  value: unknown;
}

/** 複合条件（AND/OR） */
export interface DisplayConditions {
  operator: "and" | "or";
  conditions: DisplayCondition[];
}

/** 条件評価に使うコンテキスト */
export interface DisplayConditionContext {
  /** 患者に付与されているタグ名の一覧 */
  tags: string[];
  /** カスタムフィールド（キー→値） */
  customFields: Record<string, unknown>;
  /** シナリオ開始からの経過日数 */
  daysSinceStart: number;
  /** 完了済みステップのID一覧 */
  completedSteps: string[];
}

/* ---------- メイン評価関数 ---------- */

/**
 * 表示条件を評価する
 * @param displayConditions 複合条件オブジェクト（nullなら常にtrue）
 * @param context 評価コンテキスト
 * @returns 条件を満たすかどうか
 */
export function evaluateDisplayConditions(
  displayConditions: DisplayConditions | null | undefined,
  context: DisplayConditionContext
): boolean {
  // 条件未設定 → 常に表示
  if (!displayConditions) return true;
  if (!displayConditions.conditions || displayConditions.conditions.length === 0) return true;

  const operator = displayConditions.operator || "and";
  const results = displayConditions.conditions.map((cond) => evaluateSingleCondition(cond, context));

  if (operator === "and") {
    return results.every(Boolean);
  } else {
    // or
    return results.some(Boolean);
  }
}

/* ---------- 個別条件の評価 ---------- */

/**
 * 単一条件を評価する
 */
function evaluateSingleCondition(
  condition: DisplayCondition,
  context: DisplayConditionContext
): boolean {
  const { field, value } = condition;

  switch (field) {
    case "tag_has": {
      // 指定タグを持っているか
      const tagName = String(value ?? "");
      return context.tags.includes(tagName);
    }

    case "tag_not_has": {
      // 指定タグを持っていないか
      const tagName = String(value ?? "");
      return !context.tags.includes(tagName);
    }

    case "custom_field_equals": {
      // カスタムフィールドが指定値と一致するか
      // value形式: "フィールド名:値" または { key: "フィールド名", expected: "値" }
      if (typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>;
        const key = String(obj.key ?? "");
        const expected = String(obj.expected ?? "");
        return String(context.customFields[key] ?? "") === expected;
      }
      // 文字列形式: "key:expected"
      const str = String(value ?? "");
      const colonIdx = str.indexOf(":");
      if (colonIdx === -1) return false;
      const key = str.substring(0, colonIdx);
      const expected = str.substring(colonIdx + 1);
      return String(context.customFields[key] ?? "") === expected;
    }

    case "days_since_start_gte": {
      // 経過日数 >= 指定値
      const threshold = Number(value);
      if (isNaN(threshold)) return false;
      return context.daysSinceStart >= threshold;
    }

    case "days_since_start_lte": {
      // 経過日数 <= 指定値
      const threshold = Number(value);
      if (isNaN(threshold)) return false;
      return context.daysSinceStart <= threshold;
    }

    case "step_completed": {
      // 指定ステップが完了済みか
      const stepId = String(value ?? "");
      return context.completedSteps.includes(stepId);
    }

    default:
      // 未知のフィールドは true（条件スキップ）
      return true;
  }
}
