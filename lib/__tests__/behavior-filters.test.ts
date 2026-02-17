// lib/__tests__/behavior-filters.test.ts
// 行動データフィルタリング（セグメント配信・リッチメニュー出し分け用）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
const mockSelect = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();
const mockNeq = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockGte = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  in: mockIn,
  neq: mockNeq,
  eq: mockEq,
  gte: mockGte,
  order: mockOrder,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: (query: any, _tenantId: string | null) => query,
}));

import { matchBehaviorCondition } from "@/lib/behavior-filters";

// ===================================================================
// matchBehaviorCondition: 数値比較
// ===================================================================
describe("matchBehaviorCondition — 数値比較", () => {
  it("= : 一致", () => {
    expect(matchBehaviorCondition(5, "=", "5")).toBe(true);
    expect(matchBehaviorCondition(5, "=", "3")).toBe(false);
  });

  it("!= : 不一致", () => {
    expect(matchBehaviorCondition(5, "!=", "3")).toBe(true);
    expect(matchBehaviorCondition(5, "!=", "5")).toBe(false);
  });

  it("> : より大きい", () => {
    expect(matchBehaviorCondition(10, ">", "5")).toBe(true);
    expect(matchBehaviorCondition(5, ">", "5")).toBe(false);
    expect(matchBehaviorCondition(3, ">", "5")).toBe(false);
  });

  it(">= : 以上", () => {
    expect(matchBehaviorCondition(5, ">=", "5")).toBe(true);
    expect(matchBehaviorCondition(6, ">=", "5")).toBe(true);
    expect(matchBehaviorCondition(4, ">=", "5")).toBe(false);
  });

  it("< : より小さい", () => {
    expect(matchBehaviorCondition(3, "<", "5")).toBe(true);
    expect(matchBehaviorCondition(5, "<", "5")).toBe(false);
  });

  it("<= : 以下", () => {
    expect(matchBehaviorCondition(5, "<=", "5")).toBe(true);
    expect(matchBehaviorCondition(4, "<=", "5")).toBe(true);
    expect(matchBehaviorCondition(6, "<=", "5")).toBe(false);
  });

  it("between : 範囲内", () => {
    expect(matchBehaviorCondition(5, "between", "3", "7")).toBe(true);
    expect(matchBehaviorCondition(3, "between", "3", "7")).toBe(true);
    expect(matchBehaviorCondition(7, "between", "3", "7")).toBe(true);
    expect(matchBehaviorCondition(2, "between", "3", "7")).toBe(false);
    expect(matchBehaviorCondition(8, "between", "3", "7")).toBe(false);
  });

  it("between : expectedEnd が NaN → false", () => {
    expect(matchBehaviorCondition(5, "between", "3")).toBe(false);
    expect(matchBehaviorCondition(5, "between", "3", "abc")).toBe(false);
  });
});

// ===================================================================
// matchBehaviorCondition: 日付比較
// ===================================================================
describe("matchBehaviorCondition — 日付比較", () => {
  it("within_days : N日以内 → true", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(matchBehaviorCondition(today, "within_days", "7")).toBe(true);
  });

  it("within_days : 古い日付 → false", () => {
    const oldDate = "2020-01-01";
    expect(matchBehaviorCondition(oldDate, "within_days", "7")).toBe(false);
  });

  it("before_days : N日以上前 → true", () => {
    const oldDate = "2020-01-01";
    expect(matchBehaviorCondition(oldDate, "before_days", "7")).toBe(true);
  });

  it("before_days : 今日 → false", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(matchBehaviorCondition(today, "before_days", "7")).toBe(false);
  });

  it("within_days : NaN → false", () => {
    expect(matchBehaviorCondition("2026-01-01", "within_days", "abc")).toBe(false);
  });

  it("before_days : NaN → false", () => {
    expect(matchBehaviorCondition("2026-01-01", "before_days", "abc")).toBe(false);
  });
});

// ===================================================================
// matchBehaviorCondition: エッジケース
// ===================================================================
describe("matchBehaviorCondition — エッジケース", () => {
  it("null 値 → false", () => {
    expect(matchBehaviorCondition(null, "=", "5")).toBe(false);
    expect(matchBehaviorCondition(null, "within_days", "7")).toBe(false);
  });

  it("NaN expected → false", () => {
    expect(matchBehaviorCondition(5, "=", "abc")).toBe(false);
  });

  it("NaN value → false", () => {
    expect(matchBehaviorCondition("abc" as any, ">", "5")).toBe(false);
  });

  it("未知のオペレーター → false", () => {
    expect(matchBehaviorCondition(5, "unknown_op", "5")).toBe(false);
  });

  it("0 は有効な数値", () => {
    expect(matchBehaviorCondition(0, "=", "0")).toBe(true);
    expect(matchBehaviorCondition(0, ">=", "0")).toBe(true);
    expect(matchBehaviorCondition(0, "<", "1")).toBe(true);
  });

  it("負の数", () => {
    expect(matchBehaviorCondition(-1, "<", "0")).toBe(true);
    expect(matchBehaviorCondition(-5, "between", "-10", "0")).toBe(true);
  });
});

// ===================================================================
// ソースコード構造チェック
// ===================================================================
describe("behavior-filters: ソースコード構造", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/behavior-filters.ts"), "utf-8");

  it("withTenant を使用してテナント分離している", () => {
    expect(src).toContain("withTenant");
    // 4つの関数（getVisitCounts, getPurchaseAmounts, getLastVisitDates, getReorderCounts）
    const withTenantCount = (src.match(/withTenant\(/g) || []).length;
    expect(withTenantCount).toBeGreaterThanOrEqual(4);
  });

  it("supabaseAdmin を使用している", () => {
    expect(src).toContain("supabaseAdmin");
  });

  it("canceledを除外している（来院回数）", () => {
    expect(src).toContain("canceled");
  });

  it("getDateRangeStart で日付範囲を計算している", () => {
    expect(src).toContain("getDateRangeStart");
    expect(src).toContain("30d");
    expect(src).toContain("90d");
    expect(src).toContain("180d");
    expect(src).toContain("1y");
  });

  it("5つの公開関数がエクスポートされている", () => {
    expect(src).toMatch(/export\s+async\s+function\s+getVisitCounts/);
    expect(src).toMatch(/export\s+async\s+function\s+getPurchaseAmounts/);
    expect(src).toMatch(/export\s+async\s+function\s+getLastVisitDates/);
    expect(src).toMatch(/export\s+async\s+function\s+getReorderCounts/);
    expect(src).toMatch(/export\s+function\s+matchBehaviorCondition/);
  });
});
