// __tests__/api/condition-builder.test.ts
// 条件ビルダーのロジックテスト — AND/OR切り替え、ネスト処理、条件構築

import { describe, it, expect } from "vitest";
import type {
  SingleCondition,
  CompoundCondition,
  ConditionItem,
} from "@/lib/form-conditions";
import {
  evaluateCondition,
  evaluateConditionItem,
  evaluateCompoundCondition,
  evaluateDisplayConditions,
  isCompoundCondition,
  isSingleCondition,
} from "@/lib/form-conditions";
import {
  createEmptyCondition,
  createEmptyGroup,
} from "@/components/ConditionBuilder";
import type { ConditionField } from "@/components/ConditionBuilder";

// ============================================================
// テスト用フィールド定義
// ============================================================

const testFields: ConditionField[] = [
  { id: "q1", label: "性別", type: "radio", options: ["男性", "女性", "その他"] },
  { id: "q2", label: "年齢", type: "text" },
  { id: "q3", label: "症状", type: "checkbox", options: ["頭痛", "めまい", "腰痛"] },
  { id: "q4", label: "備考", type: "textarea" },
];

// ============================================================
// 型ガード
// ============================================================

describe("型ガード", () => {
  it("isCompoundCondition: CompoundConditionを正しく判定", () => {
    const compound: CompoundCondition = { logic: "and", conditions: [] };
    expect(isCompoundCondition(compound)).toBe(true);
  });

  it("isCompoundCondition: SingleConditionはfalse", () => {
    const single: SingleCondition = { when: "q1", operator: "equals", value: "男性" };
    expect(isCompoundCondition(single)).toBe(false);
  });

  it("isSingleCondition: SingleConditionを正しく判定", () => {
    const single: SingleCondition = { when: "q1", operator: "equals", value: "男性" };
    expect(isSingleCondition(single)).toBe(true);
  });

  it("isSingleCondition: CompoundConditionはfalse", () => {
    const compound: CompoundCondition = { logic: "and", conditions: [] };
    expect(isSingleCondition(compound)).toBe(false);
  });
});

// ============================================================
// 条件構築ヘルパー
// ============================================================

describe("条件構築ヘルパー", () => {
  describe("createEmptyCondition", () => {
    it("最初のフィールドをデフォルトで選択", () => {
      const cond = createEmptyCondition(testFields);
      expect(cond.when).toBe("q1");
      expect(cond.operator).toBe("equals");
      expect(cond.value).toBe("");
    });

    it("フィールドが空の場合は空文字のwhen", () => {
      const cond = createEmptyCondition([]);
      expect(cond.when).toBe("");
    });
  });

  describe("createEmptyGroup", () => {
    it("AND グループを作成", () => {
      const group = createEmptyGroup("and", testFields);
      expect(group.logic).toBe("and");
      expect(group.conditions).toHaveLength(1);
      expect(isCompoundCondition(group)).toBe(true);
    });

    it("OR グループを作成", () => {
      const group = createEmptyGroup("or", testFields);
      expect(group.logic).toBe("or");
      expect(group.conditions).toHaveLength(1);
    });
  });
});

// ============================================================
// AND/OR 切り替え
// ============================================================

describe("AND/OR 切り替え", () => {
  const baseConditions: SingleCondition[] = [
    { when: "q1", operator: "equals", value: "男性" },
    { when: "q2", operator: "not_empty" },
  ];

  it("ANDからORに切り替えると評価結果が変わる", () => {
    const formValues = { q1: "男性", q2: "" }; // q1は満たすがq2は空

    const andCondition: CompoundCondition = { logic: "and", conditions: baseConditions };
    expect(evaluateCompoundCondition(andCondition, formValues)).toBe(false); // ANDなので両方必要

    const orCondition: CompoundCondition = { logic: "or", conditions: baseConditions };
    expect(evaluateCompoundCondition(orCondition, formValues)).toBe(true); // ORなので片方でOK
  });

  it("logicフィールドの変更だけで切り替え可能", () => {
    const condition: CompoundCondition = { logic: "and", conditions: baseConditions };
    const switched: CompoundCondition = { ...condition, logic: "or" };
    expect(switched.logic).toBe("or");
    expect(switched.conditions).toEqual(baseConditions);
  });
});

// ============================================================
// ネスト処理
// ============================================================

describe("ネスト処理", () => {
  it("ネストされたAND in ORを正しく評価", () => {
    // (q1=男性 AND q2が空でない) OR (q3に頭痛を含む)
    const nested: CompoundCondition = {
      logic: "or",
      conditions: [
        {
          logic: "and",
          conditions: [
            { when: "q1", operator: "equals", value: "男性" },
            { when: "q2", operator: "not_empty" },
          ],
        } as CompoundCondition,
        { when: "q3", operator: "equals", value: "頭痛" },
      ],
    };

    // ANDグループを満たす場合
    expect(evaluateDisplayConditions(nested, { q1: "男性", q2: "30", q3: [] })).toBe(true);

    // ORの2番目を満たす場合
    expect(evaluateDisplayConditions(nested, { q1: "女性", q2: "", q3: ["頭痛"] })).toBe(true);

    // どちらも満たさない場合
    expect(evaluateDisplayConditions(nested, { q1: "女性", q2: "", q3: ["腰痛"] })).toBe(false);
  });

  it("ネストされたOR in ANDを正しく評価", () => {
    // (q1=男性 OR q1=女性) AND q2が空でない
    const nested: CompoundCondition = {
      logic: "and",
      conditions: [
        {
          logic: "or",
          conditions: [
            { when: "q1", operator: "equals", value: "男性" },
            { when: "q1", operator: "equals", value: "女性" },
          ],
        } as CompoundCondition,
        { when: "q2", operator: "not_empty" },
      ],
    };

    // 両方満たす
    expect(evaluateDisplayConditions(nested, { q1: "男性", q2: "30" })).toBe(true);
    expect(evaluateDisplayConditions(nested, { q1: "女性", q2: "25" })).toBe(true);

    // ORは満たすがANDの2番目を満たさない
    expect(evaluateDisplayConditions(nested, { q1: "男性", q2: "" })).toBe(false);

    // ORを満たさない
    expect(evaluateDisplayConditions(nested, { q1: "その他", q2: "30" })).toBe(false);
  });

  it("3段ネストも正しく評価", () => {
    // ((q1=男性 AND q2が空でない) OR q3に頭痛) AND q4が空でない
    const deepNested: CompoundCondition = {
      logic: "and",
      conditions: [
        {
          logic: "or",
          conditions: [
            {
              logic: "and",
              conditions: [
                { when: "q1", operator: "equals", value: "男性" },
                { when: "q2", operator: "not_empty" },
              ],
            } as CompoundCondition,
            { when: "q3", operator: "equals", value: "頭痛" },
          ],
        } as CompoundCondition,
        { when: "q4", operator: "not_empty" },
      ],
    };

    // 内側のANDを満たし、外側のANDも満たす
    expect(evaluateDisplayConditions(deepNested, { q1: "男性", q2: "30", q3: [], q4: "備考あり" })).toBe(true);

    // ORの2番目（q3=頭痛）で、外側のANDも満たす
    expect(evaluateDisplayConditions(deepNested, { q1: "女性", q2: "", q3: ["頭痛"], q4: "備考あり" })).toBe(true);

    // q4が空だと外側のANDを満たさない
    expect(evaluateDisplayConditions(deepNested, { q1: "男性", q2: "30", q3: [], q4: "" })).toBe(false);
  });
});

// ============================================================
// evaluateConditionItem
// ============================================================

describe("evaluateConditionItem", () => {
  it("SingleConditionを正しく評価", () => {
    const item: ConditionItem = { when: "q1", operator: "equals", value: "はい" };
    expect(evaluateConditionItem(item, { q1: "はい" })).toBe(true);
    expect(evaluateConditionItem(item, { q1: "いいえ" })).toBe(false);
  });

  it("CompoundConditionを正しく評価", () => {
    const item: ConditionItem = {
      logic: "and",
      conditions: [
        { when: "q1", operator: "equals", value: "はい" },
        { when: "q2", operator: "not_empty" },
      ],
    };
    expect(evaluateConditionItem(item, { q1: "はい", q2: "値" })).toBe(true);
    expect(evaluateConditionItem(item, { q1: "はい", q2: "" })).toBe(false);
  });
});

// ============================================================
// 後方互換性: 旧形式の条件も正しく動作
// ============================================================

describe("後方互換性", () => {
  it("単一条件（旧形式）も正しく評価", () => {
    const dc: SingleCondition = { when: "q1", operator: "equals", value: "はい" };
    expect(evaluateDisplayConditions(dc, { q1: "はい" })).toBe(true);
  });

  it("フラットなCompoundCondition（旧形式）も正しく評価", () => {
    const dc: CompoundCondition = {
      logic: "and",
      conditions: [
        { when: "q1", operator: "equals", value: "はい" },
        { when: "q2", operator: "not_empty" },
      ],
    };
    expect(evaluateDisplayConditions(dc, { q1: "はい", q2: "値" })).toBe(true);
    expect(evaluateDisplayConditions(dc, { q1: "はい", q2: "" })).toBe(false);
  });

  it("null/undefinedは常にtrue", () => {
    expect(evaluateDisplayConditions(null, {})).toBe(true);
    expect(evaluateDisplayConditions(undefined, {})).toBe(true);
  });
});

// ============================================================
// 条件グループ操作シミュレーション
// ============================================================

describe("条件グループ操作シミュレーション", () => {
  it("条件の追加: 既存グループに条件を追加", () => {
    const original: CompoundCondition = {
      logic: "and",
      conditions: [{ when: "q1", operator: "equals", value: "男性" }],
    };

    const newCond: SingleCondition = { when: "q2", operator: "not_empty" };
    const updated: CompoundCondition = {
      ...original,
      conditions: [...original.conditions, newCond],
    };

    expect(updated.conditions).toHaveLength(2);
    expect(updated.logic).toBe("and");
  });

  it("条件の削除: 条件を取り除く", () => {
    const original: CompoundCondition = {
      logic: "and",
      conditions: [
        { when: "q1", operator: "equals", value: "男性" },
        { when: "q2", operator: "not_empty" },
      ],
    };

    const updated: CompoundCondition = {
      ...original,
      conditions: original.conditions.filter((_, i) => i !== 1),
    };

    expect(updated.conditions).toHaveLength(1);
  });

  it("ネストグループの追加", () => {
    const original: CompoundCondition = {
      logic: "and",
      conditions: [{ when: "q1", operator: "equals", value: "男性" }],
    };

    const nestedGroup: CompoundCondition = {
      logic: "or",
      conditions: [
        { when: "q2", operator: "equals", value: "20" },
        { when: "q2", operator: "equals", value: "30" },
      ],
    };

    const updated: CompoundCondition = {
      ...original,
      conditions: [...original.conditions, nestedGroup],
    };

    expect(updated.conditions).toHaveLength(2);
    expect(isCompoundCondition(updated.conditions[1])).toBe(true);

    // q1=男性 AND (q2=20 OR q2=30)
    expect(evaluateDisplayConditions(updated, { q1: "男性", q2: "20" })).toBe(true);
    expect(evaluateDisplayConditions(updated, { q1: "男性", q2: "30" })).toBe(true);
    expect(evaluateDisplayConditions(updated, { q1: "男性", q2: "40" })).toBe(false);
    expect(evaluateDisplayConditions(updated, { q1: "女性", q2: "20" })).toBe(false);
  });

  it("ネストグループの削除", () => {
    const compound: CompoundCondition = {
      logic: "and",
      conditions: [
        { when: "q1", operator: "equals", value: "男性" },
        {
          logic: "or",
          conditions: [
            { when: "q2", operator: "equals", value: "20" },
            { when: "q2", operator: "equals", value: "30" },
          ],
        },
      ],
    };

    // ネストグループ（index=1）を削除
    const updated: CompoundCondition = {
      ...compound,
      conditions: compound.conditions.filter((_, i) => i !== 1),
    };

    expect(updated.conditions).toHaveLength(1);
    expect(isSingleCondition(updated.conditions[0])).toBe(true);
  });

  it("空のconditions配列はtrueを返す", () => {
    const empty: CompoundCondition = { logic: "and", conditions: [] };
    expect(evaluateCompoundCondition(empty, {})).toBe(true);
  });
});
