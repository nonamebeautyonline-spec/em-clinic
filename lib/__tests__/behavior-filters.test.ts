// lib/__tests__/behavior-filters.test.ts
// 行動データフィルタリング（セグメント配信・リッチメニュー出し分け用）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// Supabase モック
const mockSelect = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();
const mockNeq = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockNot = vi.fn().mockReturnThis();
const mockGte = vi.fn().mockReturnThis();
const mockLte = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  in: mockIn,
  neq: mockNeq,
  eq: mockEq,
  not: mockNot,
  gte: mockGte,
  lte: mockLte,
  order: mockOrder,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: <T>(query: T, _tenantId: string | null): T => query,
  strictWithTenant: <T>(query: T, _tenantId: string | null): T => query,
}));

import {
  matchBehaviorCondition,
  matchLastPaymentDate,
  getLastPaymentDates,
  getReorderCounts,
  getProductPurchasePatients,
} from "@/lib/behavior-filters";

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
// matchBehaviorCondition: エッジケース
// ===================================================================
describe("matchBehaviorCondition — エッジケース", () => {
  it("null 値 → false", () => {
    expect(matchBehaviorCondition(null, "=", "5")).toBe(false);
  });

  it("NaN expected → false", () => {
    expect(matchBehaviorCondition(5, "=", "abc")).toBe(false);
  });

  it("NaN value → false", () => {
    expect(matchBehaviorCondition("abc" as unknown as number, ">", "5")).toBe(false);
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
// matchLastPaymentDate: 最終決済日マッチ
// ===================================================================
describe("matchLastPaymentDate — 最終決済日マッチ", () => {
  it("null → false", () => {
    expect(matchLastPaymentDate(null, "2026-01-01", "2026-12-31")).toBe(false);
  });

  it("from/to 両方指定 → 範囲内ならtrue", () => {
    expect(matchLastPaymentDate("2026-06-15T10:00:00Z", "2026-01-01", "2026-12-31")).toBe(true);
    expect(matchLastPaymentDate("2025-06-15T10:00:00Z", "2026-01-01", "2026-12-31")).toBe(false);
    expect(matchLastPaymentDate("2027-06-15T10:00:00Z", "2026-01-01", "2026-12-31")).toBe(false);
  });

  it("from のみ指定 → from以降ならtrue", () => {
    expect(matchLastPaymentDate("2026-06-15T10:00:00Z", "2026-01-01", "")).toBe(true);
    expect(matchLastPaymentDate("2025-06-15T10:00:00Z", "2026-01-01", "")).toBe(false);
  });

  it("to のみ指定 → to以前ならtrue", () => {
    expect(matchLastPaymentDate("2026-06-15T10:00:00Z", "", "2026-12-31")).toBe(true);
    expect(matchLastPaymentDate("2027-06-15T10:00:00Z", "", "2026-12-31")).toBe(false);
  });

  it("from/to 両方空 → true（制限なし）", () => {
    expect(matchLastPaymentDate("2026-06-15T10:00:00Z", "", "")).toBe(true);
    expect(matchLastPaymentDate("2026-06-15T10:00:00Z")).toBe(true);
  });
});

// ===================================================================
// ソースコード構造チェック
// ===================================================================
describe("behavior-filters: ソースコード構造", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/behavior-filters.ts"), "utf-8");

  it("withTenant を使用してテナント分離している", () => {
    expect(src).toContain("withTenant");
    // 2つの関数（getLastPaymentDates, getReorderCounts）
    const withTenantCount = (src.match(/withTenant\(/g) || []).length;
    expect(withTenantCount).toBeGreaterThanOrEqual(2);
  });

  it("supabaseAdmin を使用している", () => {
    expect(src).toContain("supabaseAdmin");
  });

  it("公開関数がエクスポートされている", () => {
    expect(src).toMatch(/export\s+async\s+function\s+getLastPaymentDates/);
    expect(src).toMatch(/export\s+async\s+function\s+getReorderCounts/);
    expect(src).toMatch(/export\s+async\s+function\s+getProductPurchasePatients/);
    expect(src).toMatch(/export\s+function\s+matchBehaviorCondition/);
    expect(src).toMatch(/export\s+function\s+matchLastPaymentDate/);
  });
});

// ===================================================================
// DB関連関数テスト用ヘルパー
// ===================================================================
// Supabaseチェーンメソッドが await 可能になるよう thenable を設定する
function setupMockChainData(data: Record<string, unknown>[] | null, error: unknown = null) {
  // 各チェーンメソッドをリセット
  mockSelect.mockReset();
  mockIn.mockReset();
  mockNeq.mockReset();
  mockEq.mockReset();
  mockNot.mockReset();
  mockGte.mockReset();
  mockLte.mockReset();
  mockOrder.mockReset();

  // thenableなチェーンオブジェクト
  const chainObj: Record<string, unknown> = {
    select: mockSelect,
    in: mockIn,
    neq: mockNeq,
    eq: mockEq,
    not: mockNot,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    // await 時に data/error を返す
    then: (resolve: (value: { data: typeof data; error: typeof error }) => void) => resolve({ data, error }),
  };

  mockSelect.mockReturnValue(chainObj);
  mockIn.mockReturnValue(chainObj);
  mockNeq.mockReturnValue(chainObj);
  mockEq.mockReturnValue(chainObj);
  mockNot.mockReturnValue(chainObj);
  mockGte.mockReturnValue(chainObj);
  mockLte.mockReturnValue(chainObj);
  mockOrder.mockReturnValue(chainObj);
  mockFrom.mockReturnValue(chainObj);
}

// ===================================================================
// getLastPaymentDates: 最終決済日取得
// ===================================================================
describe("getLastPaymentDates — 最終決済日取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列 → 空Map", async () => {
    const result = await getLastPaymentDates([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("正常データ → 最新決済日Map（降順先頭を採用）", async () => {
    setupMockChainData([
      { patient_id: "p1", paid_at: "2026-02-20T10:00:00Z" },
      { patient_id: "p1", paid_at: "2026-01-15T10:00:00Z" },
      { patient_id: "p2", paid_at: "2026-02-10T10:00:00Z" },
    ]);

    const result = await getLastPaymentDates(["p1", "p2"]);
    expect(result.get("p1")).toBe("2026-02-20T10:00:00Z");
    expect(result.get("p2")).toBe("2026-02-10T10:00:00Z");
    // ordersテーブルを参照
    expect(mockFrom).toHaveBeenCalledWith("orders");
    // 降順ソートが指定されている
    expect(mockOrder).toHaveBeenCalledWith("paid_at", { ascending: false });
  });

  it("決済なし → null設定", async () => {
    setupMockChainData([]);

    const result = await getLastPaymentDates(["p1", "p2"]);
    expect(result.get("p1")).toBeNull();
    expect(result.get("p2")).toBeNull();
  });

  it("data=null → null設定", async () => {
    setupMockChainData(null);

    const result = await getLastPaymentDates(["p1"]);
    expect(result.get("p1")).toBeNull();
  });

  it("一部の患者にデータがない場合 → 該当患者はnull", async () => {
    setupMockChainData([
      { patient_id: "p1", paid_at: "2026-02-20T10:00:00Z" },
    ]);

    const result = await getLastPaymentDates(["p1", "p2"]);
    expect(result.get("p1")).toBe("2026-02-20T10:00:00Z");
    expect(result.get("p2")).toBeNull();
  });
});

// ===================================================================
// getReorderCounts: 再処方回数取得
// ===================================================================
describe("getReorderCounts — 再処方回数取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列 → 空Map", async () => {
    const result = await getReorderCounts([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("正常データ → patient_idごとの再処方回数Map", async () => {
    setupMockChainData([
      { patient_id: "p1" },
      { patient_id: "p1" },
      { patient_id: "p2" },
      { patient_id: "p2" },
      { patient_id: "p2" },
    ]);

    const result = await getReorderCounts(["p1", "p2"]);
    expect(result.get("p1")).toBe(2);
    expect(result.get("p2")).toBe(3);
    // reordersテーブルを参照
    expect(mockFrom).toHaveBeenCalledWith("reorders");
  });

  it("データなし → 全患者に0が設定される", async () => {
    setupMockChainData([]);

    const result = await getReorderCounts(["p1", "p2"]);
    expect(result.get("p1")).toBe(0);
    expect(result.get("p2")).toBe(0);
  });

  it("data=null → 全患者に0が設定される", async () => {
    setupMockChainData(null);

    const result = await getReorderCounts(["p1"]);
    expect(result.get("p1")).toBe(0);
  });

  it("一部の患者にデータがない場合 → 該当患者は0", async () => {
    setupMockChainData([
      { patient_id: "p1" },
    ]);

    const result = await getReorderCounts(["p1", "p2", "p3"]);
    expect(result.get("p1")).toBe(1);
    expect(result.get("p2")).toBe(0);
    expect(result.get("p3")).toBe(0);
  });
});

// ===================================================================
// getProductPurchasePatients: 商品購入履歴取得
// ===================================================================
describe("getProductPurchasePatients — 商品購入履歴取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空の患者ID配列 → 空Set", async () => {
    const result = await getProductPurchasePatients([], ["PROD-A"]);
    expect(result.size).toBe(0);
  });

  it("空の商品コード配列 → 空Set", async () => {
    const result = await getProductPurchasePatients(["p1"], []);
    expect(result.size).toBe(0);
  });

  it("正常データ → 購入済み患者のSetを返す", async () => {
    setupMockChainData([
      { patient_id: "p1" },
      { patient_id: "p2" },
    ]);

    const result = await getProductPurchasePatients(["p1", "p2", "p3"], ["PROD-A"]);
    expect(result.has("p1")).toBe(true);
    expect(result.has("p2")).toBe(true);
    // ordersとreordersの両方を参照
    expect(mockFrom).toHaveBeenCalledWith("orders");
    expect(mockFrom).toHaveBeenCalledWith("reorders");
  });

  it("購入者なし → 空Set", async () => {
    setupMockChainData([]);

    const result = await getProductPurchasePatients(["p1"], ["PROD-X"]);
    expect(result.size).toBe(0);
  });
});
