// __tests__/api/step-conditions.test.ts
// ステップ表示条件（複合条件分岐）のテスト
// 対象: lib/step-conditions.ts

import { describe, it, expect } from "vitest";
import {
  evaluateDisplayConditions,
  type DisplayConditions,
  type DisplayConditionContext,
} from "@/lib/step-conditions";

/* ---------- ヘルパー ---------- */

function makeContext(overrides: Partial<DisplayConditionContext> = {}): DisplayConditionContext {
  return {
    tags: [],
    customFields: {},
    daysSinceStart: 0,
    completedSteps: [],
    ...overrides,
  };
}

/* ---------- テスト本体 ---------- */

describe("evaluateDisplayConditions", () => {
  // ------------------------------------------------------------------
  // 未設定・空条件
  // ------------------------------------------------------------------
  describe("未設定・空条件", () => {
    it("null の場合は true を返す", () => {
      expect(evaluateDisplayConditions(null, makeContext())).toBe(true);
    });

    it("undefined の場合は true を返す", () => {
      expect(evaluateDisplayConditions(undefined, makeContext())).toBe(true);
    });

    it("conditions が空配列の場合は true を返す", () => {
      const dc: DisplayConditions = { operator: "and", conditions: [] };
      expect(evaluateDisplayConditions(dc, makeContext())).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // tag_has フィールド
  // ------------------------------------------------------------------
  describe("tag_has", () => {
    it("タグを持っている場合は true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "tag_has", op: "equals", value: "VIP" }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ tags: ["VIP", "新規"] }))).toBe(true);
    });

    it("タグを持っていない場合は false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "tag_has", op: "equals", value: "VIP" }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ tags: ["新規"] }))).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // tag_not_has フィールド
  // ------------------------------------------------------------------
  describe("tag_not_has", () => {
    it("タグを持っていない場合は true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "tag_not_has", op: "equals", value: "ブロック" }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ tags: ["VIP"] }))).toBe(true);
    });

    it("タグを持っている場合は false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "tag_not_has", op: "equals", value: "ブロック" }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ tags: ["ブロック"] }))).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // custom_field_equals フィールド
  // ------------------------------------------------------------------
  describe("custom_field_equals", () => {
    it("文字列形式 (key:value) で一致する場合は true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "custom_field_equals", op: "equals", value: "gender:female" }],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ customFields: { gender: "female" } }))
      ).toBe(true);
    });

    it("文字列形式 (key:value) で不一致の場合は false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "custom_field_equals", op: "equals", value: "gender:male" }],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ customFields: { gender: "female" } }))
      ).toBe(false);
    });

    it("オブジェクト形式 { key, expected } で一致する場合は true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [
          { field: "custom_field_equals", op: "equals", value: { key: "plan", expected: "premium" } },
        ],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ customFields: { plan: "premium" } }))
      ).toBe(true);
    });

    it("オブジェクト形式で不一致の場合は false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [
          { field: "custom_field_equals", op: "equals", value: { key: "plan", expected: "premium" } },
        ],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ customFields: { plan: "basic" } }))
      ).toBe(false);
    });

    it("コロンなしの文字列は false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "custom_field_equals", op: "equals", value: "invalid" }],
      };
      expect(evaluateDisplayConditions(dc, makeContext())).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // days_since_start_gte フィールド
  // ------------------------------------------------------------------
  describe("days_since_start_gte", () => {
    it("経過日数が閾値以上なら true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "days_since_start_gte", op: "gte", value: 7 }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ daysSinceStart: 10 }))).toBe(true);
    });

    it("経過日数が閾値と等しい場合も true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "days_since_start_gte", op: "gte", value: 7 }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ daysSinceStart: 7 }))).toBe(true);
    });

    it("経過日数が閾値未満なら false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "days_since_start_gte", op: "gte", value: 7 }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ daysSinceStart: 3 }))).toBe(false);
    });

    it("NaN の場合は false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "days_since_start_gte", op: "gte", value: "abc" }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ daysSinceStart: 10 }))).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // days_since_start_lte フィールド
  // ------------------------------------------------------------------
  describe("days_since_start_lte", () => {
    it("経過日数が閾値以下なら true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "days_since_start_lte", op: "lte", value: 30 }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ daysSinceStart: 15 }))).toBe(true);
    });

    it("経過日数が閾値と等しい場合も true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "days_since_start_lte", op: "lte", value: 30 }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ daysSinceStart: 30 }))).toBe(true);
    });

    it("経過日数が閾値を超えたら false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "days_since_start_lte", op: "lte", value: 30 }],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ daysSinceStart: 31 }))).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // step_completed フィールド
  // ------------------------------------------------------------------
  describe("step_completed", () => {
    it("指定ステップが完了済みなら true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "step_completed", op: "equals", value: "step-3" }],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ completedSteps: ["step-1", "step-3", "step-5"] }))
      ).toBe(true);
    });

    it("指定ステップが未完了なら false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "step_completed", op: "equals", value: "step-3" }],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ completedSteps: ["step-1", "step-2"] }))
      ).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 未知のフィールド
  // ------------------------------------------------------------------
  describe("未知のフィールド", () => {
    it("未知のフィールドは true を返す（条件スキップ）", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [{ field: "unknown_field", op: "equals", value: "test" }],
      };
      expect(evaluateDisplayConditions(dc, makeContext())).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // AND 演算子
  // ------------------------------------------------------------------
  describe("AND 演算子", () => {
    it("全条件が true なら true", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "days_since_start_gte", op: "gte", value: 7 },
        ],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ tags: ["VIP"], daysSinceStart: 10 }))
      ).toBe(true);
    });

    it("1つでも false なら false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "days_since_start_gte", op: "gte", value: 30 },
        ],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ tags: ["VIP"], daysSinceStart: 10 }))
      ).toBe(false);
    });

    it("全条件が false なら false", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "tag_has", op: "equals", value: "プレミアム" },
        ],
      };
      expect(evaluateDisplayConditions(dc, makeContext({ tags: [] }))).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // OR 演算子
  // ------------------------------------------------------------------
  describe("OR 演算子", () => {
    it("1つでも true なら true", () => {
      const dc: DisplayConditions = {
        operator: "or",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "days_since_start_gte", op: "gte", value: 30 },
        ],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ tags: ["VIP"], daysSinceStart: 5 }))
      ).toBe(true);
    });

    it("全条件が false なら false", () => {
      const dc: DisplayConditions = {
        operator: "or",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "days_since_start_gte", op: "gte", value: 30 },
        ],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ tags: ["新規"], daysSinceStart: 5 }))
      ).toBe(false);
    });

    it("全条件が true なら true", () => {
      const dc: DisplayConditions = {
        operator: "or",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "days_since_start_gte", op: "gte", value: 7 },
        ],
      };
      expect(
        evaluateDisplayConditions(dc, makeContext({ tags: ["VIP"], daysSinceStart: 10 }))
      ).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 複合条件の組み合わせ
  // ------------------------------------------------------------------
  describe("複合条件の組み合わせ", () => {
    it("AND: タグ + 日数 + ステップ完了 の複合条件", () => {
      const dc: DisplayConditions = {
        operator: "and",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "days_since_start_gte", op: "gte", value: 7 },
          { field: "days_since_start_lte", op: "lte", value: 30 },
          { field: "step_completed", op: "equals", value: "step-1" },
        ],
      };

      // 全条件満たす
      expect(
        evaluateDisplayConditions(dc, makeContext({
          tags: ["VIP"],
          daysSinceStart: 14,
          completedSteps: ["step-1", "step-2"],
        }))
      ).toBe(true);

      // 日数が範囲外
      expect(
        evaluateDisplayConditions(dc, makeContext({
          tags: ["VIP"],
          daysSinceStart: 31,
          completedSteps: ["step-1"],
        }))
      ).toBe(false);
    });

    it("OR: タグ or カスタムフィールド の複合条件", () => {
      const dc: DisplayConditions = {
        operator: "or",
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "custom_field_equals", op: "equals", value: "plan:premium" },
        ],
      };

      // タグのみ一致
      expect(
        evaluateDisplayConditions(dc, makeContext({
          tags: ["VIP"],
          customFields: { plan: "basic" },
        }))
      ).toBe(true);

      // カスタムフィールドのみ一致
      expect(
        evaluateDisplayConditions(dc, makeContext({
          tags: [],
          customFields: { plan: "premium" },
        }))
      ).toBe(true);

      // どちらも不一致
      expect(
        evaluateDisplayConditions(dc, makeContext({
          tags: [],
          customFields: { plan: "basic" },
        }))
      ).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // operator デフォルト
  // ------------------------------------------------------------------
  describe("operator デフォルト", () => {
    it("operator が未設定の場合は AND として動作する", () => {
      const dc = {
        conditions: [
          { field: "tag_has", op: "equals", value: "VIP" },
          { field: "tag_has", op: "equals", value: "プレミアム" },
        ],
      } as unknown as DisplayConditions;

      // 1つしか満たさない → AND だから false
      expect(
        evaluateDisplayConditions(dc, makeContext({ tags: ["VIP"] }))
      ).toBe(false);
    });
  });
});
