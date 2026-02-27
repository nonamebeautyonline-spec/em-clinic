// lib/__tests__/form-conditions.test.ts
// フォーム表示条件（条件分岐）の評価ロジックテスト
import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  evaluateDisplayConditions,
  getVisibleFieldIds,
} from "@/lib/form-conditions";
import type { SingleCondition, CompoundCondition, DisplayConditions } from "@/lib/form-conditions";

// ============================================================
// evaluateCondition: 単一条件の評価
// ============================================================

describe("evaluateCondition", () => {
  // --- equals ---
  describe("equals 演算子", () => {
    it("文字列が一致する場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "equals", value: "はい" };
      expect(evaluateCondition(cond, { q1: "はい" })).toBe(true);
    });

    it("文字列が一致しない場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "equals", value: "はい" };
      expect(evaluateCondition(cond, { q1: "いいえ" })).toBe(false);
    });

    it("値が未定義の場合、空文字との比較になる", () => {
      const cond: SingleCondition = { when: "q1", operator: "equals", value: "" };
      expect(evaluateCondition(cond, {})).toBe(true);
    });

    it("配列の場合、指定した値が含まれていれば true", () => {
      const cond: SingleCondition = { when: "q1", operator: "equals", value: "B" };
      expect(evaluateCondition(cond, { q1: ["A", "B", "C"] })).toBe(true);
    });

    it("配列の場合、指定した値が含まれていなければ false", () => {
      const cond: SingleCondition = { when: "q1", operator: "equals", value: "D" };
      expect(evaluateCondition(cond, { q1: ["A", "B", "C"] })).toBe(false);
    });

    it("数値も文字列変換で比較", () => {
      const cond: SingleCondition = { when: "q1", operator: "equals", value: "42" };
      expect(evaluateCondition(cond, { q1: 42 })).toBe(true);
    });
  });

  // --- not_equals ---
  describe("not_equals 演算子", () => {
    it("文字列が異なる場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_equals", value: "はい" };
      expect(evaluateCondition(cond, { q1: "いいえ" })).toBe(true);
    });

    it("文字列が一致する場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_equals", value: "はい" };
      expect(evaluateCondition(cond, { q1: "はい" })).toBe(false);
    });

    it("配列の場合、値が含まれていなければ true", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_equals", value: "D" };
      expect(evaluateCondition(cond, { q1: ["A", "B"] })).toBe(true);
    });

    it("配列の場合、値が含まれていれば false", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_equals", value: "A" };
      expect(evaluateCondition(cond, { q1: ["A", "B"] })).toBe(false);
    });
  });

  // --- contains ---
  describe("contains 演算子", () => {
    it("部分一致する場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "contains", value: "東京" };
      expect(evaluateCondition(cond, { q1: "東京都渋谷区" })).toBe(true);
    });

    it("部分一致しない場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "contains", value: "大阪" };
      expect(evaluateCondition(cond, { q1: "東京都渋谷区" })).toBe(false);
    });

    it("空文字のcontainsは常にtrue", () => {
      const cond: SingleCondition = { when: "q1", operator: "contains", value: "" };
      expect(evaluateCondition(cond, { q1: "何か" })).toBe(true);
    });

    it("配列のいずれかの要素に含まれていれば true", () => {
      const cond: SingleCondition = { when: "q1", operator: "contains", value: "頭痛" };
      expect(evaluateCondition(cond, { q1: ["頭痛", "めまい"] })).toBe(true);
    });

    it("配列のどの要素にも含まれていなければ false", () => {
      const cond: SingleCondition = { when: "q1", operator: "contains", value: "腰痛" };
      expect(evaluateCondition(cond, { q1: ["頭痛", "めまい"] })).toBe(false);
    });
  });

  // --- not_empty ---
  describe("not_empty 演算子", () => {
    it("値がある場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_empty" };
      expect(evaluateCondition(cond, { q1: "何か" })).toBe(true);
    });

    it("空文字の場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_empty" };
      expect(evaluateCondition(cond, { q1: "" })).toBe(false);
    });

    it("undefinedの場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_empty" };
      expect(evaluateCondition(cond, {})).toBe(false);
    });

    it("nullの場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_empty" };
      expect(evaluateCondition(cond, { q1: null })).toBe(false);
    });

    it("空配列の場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_empty" };
      expect(evaluateCondition(cond, { q1: [] })).toBe(false);
    });

    it("要素のある配列の場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "not_empty" };
      expect(evaluateCondition(cond, { q1: ["A"] })).toBe(true);
    });
  });

  // --- is_empty ---
  describe("is_empty 演算子", () => {
    it("undefinedの場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "is_empty" };
      expect(evaluateCondition(cond, {})).toBe(true);
    });

    it("空文字の場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "is_empty" };
      expect(evaluateCondition(cond, { q1: "" })).toBe(true);
    });

    it("nullの場合 true", () => {
      const cond: SingleCondition = { when: "q1", operator: "is_empty" };
      expect(evaluateCondition(cond, { q1: null })).toBe(true);
    });

    it("値がある場合 false", () => {
      const cond: SingleCondition = { when: "q1", operator: "is_empty" };
      expect(evaluateCondition(cond, { q1: "値" })).toBe(false);
    });
  });

  // --- 不明な演算子 ---
  it("不明な演算子は true を返す", () => {
    const cond = { when: "q1", operator: "unknown_op" as never, value: "x" };
    expect(evaluateCondition(cond, { q1: "y" })).toBe(true);
  });
});

// ============================================================
// evaluateDisplayConditions: 複合条件の評価
// ============================================================

describe("evaluateDisplayConditions", () => {
  it("null の場合は true（常に表示）", () => {
    expect(evaluateDisplayConditions(null, {})).toBe(true);
  });

  it("undefined の場合は true（常に表示）", () => {
    expect(evaluateDisplayConditions(undefined, {})).toBe(true);
  });

  it("単一条件を正しく評価する", () => {
    const dc: SingleCondition = { when: "q1", operator: "equals", value: "はい" };
    expect(evaluateDisplayConditions(dc, { q1: "はい" })).toBe(true);
    expect(evaluateDisplayConditions(dc, { q1: "いいえ" })).toBe(false);
  });

  // --- AND 複合条件 ---
  describe("AND 複合条件", () => {
    const dc: CompoundCondition = {
      logic: "and",
      conditions: [
        { when: "q1", operator: "equals", value: "はい" },
        { when: "q2", operator: "not_empty" },
      ],
    };

    it("すべての条件を満たす場合 true", () => {
      expect(evaluateDisplayConditions(dc, { q1: "はい", q2: "値あり" })).toBe(true);
    });

    it("一部の条件を満たさない場合 false", () => {
      expect(evaluateDisplayConditions(dc, { q1: "はい", q2: "" })).toBe(false);
    });

    it("すべての条件を満たさない場合 false", () => {
      expect(evaluateDisplayConditions(dc, { q1: "いいえ", q2: "" })).toBe(false);
    });
  });

  // --- OR 複合条件 ---
  describe("OR 複合条件", () => {
    const dc: CompoundCondition = {
      logic: "or",
      conditions: [
        { when: "q1", operator: "equals", value: "A" },
        { when: "q1", operator: "equals", value: "B" },
      ],
    };

    it("いずれかの条件を満たす場合 true", () => {
      expect(evaluateDisplayConditions(dc, { q1: "A" })).toBe(true);
      expect(evaluateDisplayConditions(dc, { q1: "B" })).toBe(true);
    });

    it("どの条件も満たさない場合 false", () => {
      expect(evaluateDisplayConditions(dc, { q1: "C" })).toBe(false);
    });
  });

  // --- 空の conditions 配列 ---
  it("空のconditions配列はtrue", () => {
    const dc: CompoundCondition = { logic: "and", conditions: [] };
    expect(evaluateDisplayConditions(dc, {})).toBe(true);
  });
});

// ============================================================
// getVisibleFieldIds: 表示フィールドID取得
// ============================================================

describe("getVisibleFieldIds", () => {
  const fields = [
    { id: "q1", display_conditions: undefined },
    { id: "q2", display_conditions: { when: "q1", operator: "equals" as const, value: "はい" } },
    { id: "q3", display_conditions: { when: "q1", operator: "equals" as const, value: "いいえ" } },
    { id: "q4", display_conditions: null },
  ];

  it("条件なしのフィールドは常に表示", () => {
    const visible = getVisibleFieldIds(fields, {});
    expect(visible.has("q1")).toBe(true);
    expect(visible.has("q4")).toBe(true);
  });

  it("条件を満たすフィールドのみ表示", () => {
    const visible = getVisibleFieldIds(fields, { q1: "はい" });
    expect(visible.has("q1")).toBe(true);
    expect(visible.has("q2")).toBe(true);
    expect(visible.has("q3")).toBe(false);
    expect(visible.has("q4")).toBe(true);
  });

  it("回答が変わるとフィールド表示も変わる", () => {
    const visible = getVisibleFieldIds(fields, { q1: "いいえ" });
    expect(visible.has("q2")).toBe(false);
    expect(visible.has("q3")).toBe(true);
  });
});
