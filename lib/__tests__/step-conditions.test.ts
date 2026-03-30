// lib/__tests__/step-conditions.test.ts — ステップ表示条件の評価テスト

import { describe, it, expect } from "vitest";
import {
  evaluateDisplayConditions,
  type DisplayConditions,
  type DisplayConditionContext,
} from "@/lib/step-conditions";

/* ---------- ヘルパー ---------- */

function makeContext(
  overrides: Partial<DisplayConditionContext> = {},
): DisplayConditionContext {
  return {
    tags: [],
    customFields: {},
    daysSinceStart: 0,
    completedSteps: [],
    ...overrides,
  };
}

/* ---------- 基本動作 ---------- */

describe("evaluateDisplayConditions — 基本", () => {
  it("条件がnullの場合trueを返す", () => {
    expect(evaluateDisplayConditions(null, makeContext())).toBe(true);
  });

  it("条件がundefinedの場合trueを返す", () => {
    expect(evaluateDisplayConditions(undefined, makeContext())).toBe(true);
  });

  it("条件配列が空の場合trueを返す", () => {
    const cond: DisplayConditions = { operator: "and", conditions: [] };
    expect(evaluateDisplayConditions(cond, makeContext())).toBe(true);
  });
});

/* ---------- tag_has ---------- */

describe("evaluateDisplayConditions — tag_has", () => {
  it("指定タグを持っていればtrue", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "tag_has", op: "equals", value: "VIP" }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ tags: ["VIP", "新規"] }))).toBe(true);
  });

  it("指定タグを持っていなければfalse", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "tag_has", op: "equals", value: "VIP" }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ tags: ["新規"] }))).toBe(false);
  });
});

/* ---------- tag_not_has ---------- */

describe("evaluateDisplayConditions — tag_not_has", () => {
  it("指定タグを持っていなければtrue", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "tag_not_has", op: "equals", value: "ブロック" }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ tags: ["新規"] }))).toBe(true);
  });

  it("指定タグを持っていればfalse", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "tag_not_has", op: "equals", value: "ブロック" }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ tags: ["ブロック"] }))).toBe(false);
  });
});

/* ---------- custom_field_equals ---------- */

describe("evaluateDisplayConditions — custom_field_equals", () => {
  it("文字列形式: key:valueが一致すればtrue", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "custom_field_equals", op: "equals", value: "gender:male" }],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ customFields: { gender: "male" } })),
    ).toBe(true);
  });

  it("文字列形式: 値が一致しなければfalse", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "custom_field_equals", op: "equals", value: "gender:female" }],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ customFields: { gender: "male" } })),
    ).toBe(false);
  });

  it("オブジェクト形式: { key, expected }で評価できる", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [
        { field: "custom_field_equals", op: "equals", value: { key: "plan", expected: "premium" } },
      ],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ customFields: { plan: "premium" } })),
    ).toBe(true);
  });

  it("コロンのない文字列はfalseを返す", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "custom_field_equals", op: "equals", value: "invalid" }],
    };
    expect(evaluateDisplayConditions(cond, makeContext())).toBe(false);
  });
});

/* ---------- days_since_start_gte / lte ---------- */

describe("evaluateDisplayConditions — days_since_start", () => {
  it("gte: 経過日数が閾値以上ならtrue", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "days_since_start_gte", op: "gte", value: 7 }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ daysSinceStart: 7 }))).toBe(true);
    expect(evaluateDisplayConditions(cond, makeContext({ daysSinceStart: 10 }))).toBe(true);
  });

  it("gte: 経過日数が閾値未満ならfalse", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "days_since_start_gte", op: "gte", value: 7 }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ daysSinceStart: 3 }))).toBe(false);
  });

  it("lte: 経過日数が閾値以下ならtrue", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "days_since_start_lte", op: "lte", value: 30 }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ daysSinceStart: 30 }))).toBe(true);
    expect(evaluateDisplayConditions(cond, makeContext({ daysSinceStart: 15 }))).toBe(true);
  });

  it("lte: 経過日数が閾値超過ならfalse", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "days_since_start_lte", op: "lte", value: 30 }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ daysSinceStart: 31 }))).toBe(false);
  });

  it("NaN値の場合falseを返す", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "days_since_start_gte", op: "gte", value: "invalid" }],
    };
    expect(evaluateDisplayConditions(cond, makeContext({ daysSinceStart: 10 }))).toBe(false);
  });
});

/* ---------- step_completed ---------- */

describe("evaluateDisplayConditions — step_completed", () => {
  it("指定ステップが完了済みならtrue", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "step_completed", op: "equals", value: "step-1" }],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ completedSteps: ["step-1", "step-2"] })),
    ).toBe(true);
  });

  it("指定ステップが未完了ならfalse", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "step_completed", op: "equals", value: "step-3" }],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ completedSteps: ["step-1"] })),
    ).toBe(false);
  });
});

/* ---------- AND / OR 複合条件 ---------- */

describe("evaluateDisplayConditions — 複合条件", () => {
  it("AND: 全条件trueならtrue", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [
        { field: "tag_has", op: "equals", value: "VIP" },
        { field: "days_since_start_gte", op: "gte", value: 7 },
      ],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ tags: ["VIP"], daysSinceStart: 10 })),
    ).toBe(true);
  });

  it("AND: 1つでもfalseならfalse", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [
        { field: "tag_has", op: "equals", value: "VIP" },
        { field: "days_since_start_gte", op: "gte", value: 7 },
      ],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ tags: ["VIP"], daysSinceStart: 3 })),
    ).toBe(false);
  });

  it("OR: いずれかtrueならtrue", () => {
    const cond: DisplayConditions = {
      operator: "or",
      conditions: [
        { field: "tag_has", op: "equals", value: "VIP" },
        { field: "tag_has", op: "equals", value: "プレミアム" },
      ],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ tags: ["プレミアム"] })),
    ).toBe(true);
  });

  it("OR: 全てfalseならfalse", () => {
    const cond: DisplayConditions = {
      operator: "or",
      conditions: [
        { field: "tag_has", op: "equals", value: "VIP" },
        { field: "tag_has", op: "equals", value: "プレミアム" },
      ],
    };
    expect(
      evaluateDisplayConditions(cond, makeContext({ tags: ["一般"] })),
    ).toBe(false);
  });

  it("未知のフィールドはtrue扱い（条件スキップ）", () => {
    const cond: DisplayConditions = {
      operator: "and",
      conditions: [{ field: "unknown_field", op: "equals", value: "x" }],
    };
    expect(evaluateDisplayConditions(cond, makeContext())).toBe(true);
  });
});
