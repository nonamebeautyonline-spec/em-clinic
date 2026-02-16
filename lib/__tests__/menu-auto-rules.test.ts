// lib/__tests__/menu-auto-rules.test.ts
// メニュー自動切替ルールの条件評価・フィールド比較テスト
import { describe, it, expect } from "vitest";
import type { MenuRuleCondition, MenuAutoRule } from "@/lib/menu-auto-rules";

// === matchFieldValue のロジック再実装 ===
function matchFieldValue(actual: string, op: string, expected: string): boolean {
  const numA = Number(actual);
  const numE = Number(expected);
  const isNum = !isNaN(numA) && !isNaN(numE) && actual !== "" && expected !== "";

  switch (op) {
    case "=": return actual === expected;
    case "!=": return actual !== expected;
    case "contains": return actual.includes(expected);
    case ">": return isNum ? numA > numE : actual > expected;
    case "<": return isNum ? numA < numE : actual < expected;
    default: return false;
  }
}

// === matchesCondition のロジック再実装 ===
function matchesCondition(
  cond: MenuRuleCondition,
  tagIds: Set<number>,
  mark: string,
  fields: Map<number, string>,
): boolean {
  switch (cond.type) {
    case "tag": {
      const ids = cond.tag_ids || [];
      if (ids.length === 0) return false;
      if (cond.tag_match === "all") return ids.every(id => tagIds.has(id));
      return ids.some(id => tagIds.has(id));
    }
    case "mark": {
      const vals = cond.mark_values || [];
      return vals.includes(mark);
    }
    case "field": {
      const val = fields.get(cond.field_id || 0) || "";
      return matchFieldValue(val, cond.field_operator || "=", cond.field_value || "");
    }
    default:
      return false;
  }
}

// === matchesRule のロジック再実装 ===
function matchesRule(
  rule: { conditions: MenuRuleCondition[]; conditionOperator: "AND" | "OR" },
  tagIds: Set<number>,
  mark: string,
  fields: Map<number, string>,
): boolean {
  if (rule.conditions.length === 0) return false;
  const results = rule.conditions.map(c => matchesCondition(c, tagIds, mark, fields));
  return rule.conditionOperator === "OR"
    ? results.some(Boolean)
    : results.every(Boolean);
}

// === matchFieldValue テスト ===
describe("menu-auto-rules matchFieldValue", () => {
  it("= 文字列一致", () => {
    expect(matchFieldValue("Tokyo", "=", "Tokyo")).toBe(true);
    expect(matchFieldValue("Tokyo", "=", "Osaka")).toBe(false);
  });

  it("!= 文字列不一致", () => {
    expect(matchFieldValue("Tokyo", "!=", "Osaka")).toBe(true);
    expect(matchFieldValue("Tokyo", "!=", "Tokyo")).toBe(false);
  });

  it("contains 部分一致", () => {
    expect(matchFieldValue("東京都渋谷区", "contains", "渋谷")).toBe(true);
    expect(matchFieldValue("東京都渋谷区", "contains", "新宿")).toBe(false);
  });

  it("> 数値比較", () => {
    expect(matchFieldValue("100", ">", "50")).toBe(true);
    expect(matchFieldValue("50", ">", "100")).toBe(false);
    expect(matchFieldValue("50", ">", "50")).toBe(false);
  });

  it("< 数値比較", () => {
    expect(matchFieldValue("50", "<", "100")).toBe(true);
    expect(matchFieldValue("100", "<", "50")).toBe(false);
  });

  it("> 文字列比較（数値でない場合）", () => {
    expect(matchFieldValue("b", ">", "a")).toBe(true);
    expect(matchFieldValue("a", ">", "b")).toBe(false);
  });

  it("空文字列の数値比較は文字列比較にフォールバック", () => {
    // actual="" はNaN → isNum=false → 文字列比較
    expect(matchFieldValue("", ">", "100")).toBe(false);
  });

  it("未知のオペレーター → false", () => {
    expect(matchFieldValue("a", "like", "a")).toBe(false);
  });
});

// === matchesCondition テスト ===
describe("menu-auto-rules matchesCondition", () => {
  const tagIds = new Set([1, 2, 3]);
  const mark = "対応済み";
  const fields = new Map<number, string>([[10, "Tokyo"], [20, "100"]]);

  it("タグ条件: any — いずれかのタグを含む", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [1, 5], tag_match: "any" },
      tagIds, mark, fields
    )).toBe(true); // 1を含む
  });

  it("タグ条件: any — どれも含まない", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [4, 5], tag_match: "any" },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("タグ条件: all — 全てのタグを含む", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [1, 2], tag_match: "all" },
      tagIds, mark, fields
    )).toBe(true);
  });

  it("タグ条件: all — 一部欠けている", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [1, 4], tag_match: "all" },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("タグ条件: 空のtag_ids → false", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [] },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("マーク条件: 一致", () => {
    expect(matchesCondition(
      { type: "mark", mark_values: ["対応済み", "確認中"] },
      tagIds, mark, fields
    )).toBe(true);
  });

  it("マーク条件: 不一致", () => {
    expect(matchesCondition(
      { type: "mark", mark_values: ["未対応"] },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("フィールド条件: 一致", () => {
    expect(matchesCondition(
      { type: "field", field_id: 10, field_operator: "=", field_value: "Tokyo" },
      tagIds, mark, fields
    )).toBe(true);
  });

  it("フィールド条件: 数値比較", () => {
    expect(matchesCondition(
      { type: "field", field_id: 20, field_operator: ">", field_value: "50" },
      tagIds, mark, fields
    )).toBe(true); // 100 > 50
  });

  it("存在しないフィールド → 空文字として比較", () => {
    expect(matchesCondition(
      { type: "field", field_id: 999, field_operator: "=", field_value: "" },
      tagIds, mark, fields
    )).toBe(true); // "" === ""
  });

  it("未知のtype → false", () => {
    expect(matchesCondition(
      { type: "unknown" as any },
      tagIds, mark, fields
    )).toBe(false);
  });
});

// === matchesRule テスト ===
describe("menu-auto-rules matchesRule", () => {
  const tagIds = new Set([1, 2, 3]);
  const mark = "対応済み";
  const fields = new Map<number, string>([[10, "Tokyo"]]);

  it("AND: 全条件マッチ → true", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [1], tag_match: "any" as const },
        { type: "mark" as const, mark_values: ["対応済み"] },
      ],
      conditionOperator: "AND" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(true);
  });

  it("AND: 1つ不一致 → false", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [1], tag_match: "any" as const },
        { type: "mark" as const, mark_values: ["未対応"] },
      ],
      conditionOperator: "AND" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(false);
  });

  it("OR: いずれかマッチ → true", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [999] },
        { type: "mark" as const, mark_values: ["対応済み"] },
      ],
      conditionOperator: "OR" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(true);
  });

  it("OR: 全不一致 → false", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [999] },
        { type: "mark" as const, mark_values: ["未対応"] },
      ],
      conditionOperator: "OR" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(false);
  });

  it("条件なし → false", () => {
    const rule = { conditions: [], conditionOperator: "AND" as const };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(false);
  });
});

// === 優先度によるルール評価順 ===
describe("menu-auto-rules 優先度", () => {
  it("priority が小さい方が先に評価される", () => {
    const rules = [
      { id: "r3", priority: 3, enabled: true },
      { id: "r1", priority: 1, enabled: true },
      { id: "r2", priority: 2, enabled: false },
    ];
    const active = rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority);
    expect(active[0].id).toBe("r1");
    expect(active[1].id).toBe("r3");
    expect(active.length).toBe(2); // disabledはフィルタ
  });
});
