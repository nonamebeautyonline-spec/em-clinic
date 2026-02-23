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

import {
  matchBehaviorCondition,
  getVisitCounts,
  getPurchaseAmounts,
  getLastVisitDates,
  getReorderCounts,
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

// ===================================================================
// DB関連関数テスト用ヘルパー
// ===================================================================
// Supabaseチェーンメソッドが await 可能になるよう thenable を設定する
function setupMockChainData(data: any[] | null, error: any = null) {
  // 各チェーンメソッドをリセット
  mockSelect.mockReset();
  mockIn.mockReset();
  mockNeq.mockReset();
  mockEq.mockReset();
  mockGte.mockReset();
  mockOrder.mockReset();

  // thenableなチェーンオブジェクト
  const chainObj: Record<string, any> = {
    select: mockSelect,
    in: mockIn,
    neq: mockNeq,
    eq: mockEq,
    gte: mockGte,
    order: mockOrder,
    // await 時に data/error を返す
    then: (resolve: any) => resolve({ data, error }),
  };

  mockSelect.mockReturnValue(chainObj);
  mockIn.mockReturnValue(chainObj);
  mockNeq.mockReturnValue(chainObj);
  mockEq.mockReturnValue(chainObj);
  mockGte.mockReturnValue(chainObj);
  mockOrder.mockReturnValue(chainObj);
  mockFrom.mockReturnValue(chainObj);
}

// ===================================================================
// getVisitCounts: 来院回数取得
// ===================================================================
describe("getVisitCounts — 来院回数取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列 → 空Map", async () => {
    const result = await getVisitCounts([]);
    expect(result.size).toBe(0);
    // DBへのクエリが発行されないことを確認
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("正常データ → patient_idごとの予約件数Map", async () => {
    setupMockChainData([
      { patient_id: "p1" },
      { patient_id: "p1" },
      { patient_id: "p1" },
      { patient_id: "p2" },
    ]);

    const result = await getVisitCounts(["p1", "p2"]);
    expect(result.get("p1")).toBe(3);
    expect(result.get("p2")).toBe(1);
    // reservationsテーブルを参照していることを確認
    expect(mockFrom).toHaveBeenCalledWith("reservations");
  });

  it("データなし → 全患者に0が設定される", async () => {
    setupMockChainData([]);

    const result = await getVisitCounts(["p1", "p2", "p3"]);
    expect(result.get("p1")).toBe(0);
    expect(result.get("p2")).toBe(0);
    expect(result.get("p3")).toBe(0);
    expect(result.size).toBe(3);
  });

  it("data=null → 全患者に0が設定される", async () => {
    setupMockChainData(null);

    const result = await getVisitCounts(["p1"]);
    expect(result.get("p1")).toBe(0);
  });

  it("dateRange指定あり → gteが呼ばれる", async () => {
    setupMockChainData([{ patient_id: "p1" }]);

    await getVisitCounts(["p1"], "30d");
    expect(mockGte).toHaveBeenCalledWith("reserved_date", expect.any(String));
  });

  it("dateRange='all' → gteが呼ばれない", async () => {
    setupMockChainData([{ patient_id: "p1" }]);

    await getVisitCounts(["p1"], "all");
    expect(mockGte).not.toHaveBeenCalled();
  });

  it("dateRange=未知の値 → gteが呼ばれない（getDateRangeStartがnull）", async () => {
    setupMockChainData([{ patient_id: "p1" }]);

    await getVisitCounts(["p1"], "unknown_range");
    expect(mockGte).not.toHaveBeenCalled();
  });

  it("一部の患者にデータがない場合 → 該当患者は0", async () => {
    setupMockChainData([
      { patient_id: "p1" },
      { patient_id: "p1" },
    ]);

    const result = await getVisitCounts(["p1", "p2"]);
    expect(result.get("p1")).toBe(2);
    expect(result.get("p2")).toBe(0);
  });
});

// ===================================================================
// getPurchaseAmounts: 購入金額取得
// ===================================================================
describe("getPurchaseAmounts — 購入金額取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列 → 空Map", async () => {
    const result = await getPurchaseAmounts([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("正常データ → patient_idごとの合計金額Map", async () => {
    setupMockChainData([
      { patient_id: "p1", amount: 5000 },
      { patient_id: "p2", amount: 3000 },
    ]);

    const result = await getPurchaseAmounts(["p1", "p2"]);
    expect(result.get("p1")).toBe(5000);
    expect(result.get("p2")).toBe(3000);
    // ordersテーブルを参照していることを確認
    expect(mockFrom).toHaveBeenCalledWith("orders");
  });

  it("複数注文の合算", async () => {
    setupMockChainData([
      { patient_id: "p1", amount: 5000 },
      { patient_id: "p1", amount: 8000 },
      { patient_id: "p1", amount: 2000 },
      { patient_id: "p2", amount: 10000 },
    ]);

    const result = await getPurchaseAmounts(["p1", "p2"]);
    expect(result.get("p1")).toBe(15000);
    expect(result.get("p2")).toBe(10000);
  });

  it("データなし → 全患者に0が設定される", async () => {
    setupMockChainData([]);

    const result = await getPurchaseAmounts(["p1", "p2"]);
    expect(result.get("p1")).toBe(0);
    expect(result.get("p2")).toBe(0);
  });

  it("data=null → 全患者に0が設定される", async () => {
    setupMockChainData(null);

    const result = await getPurchaseAmounts(["p1"]);
    expect(result.get("p1")).toBe(0);
  });

  it("amount=null → 0として加算される", async () => {
    setupMockChainData([
      { patient_id: "p1", amount: null },
      { patient_id: "p1", amount: 3000 },
    ]);

    const result = await getPurchaseAmounts(["p1"]);
    expect(result.get("p1")).toBe(3000);
  });

  it("dateRange指定あり → gteがpaid_atで呼ばれる", async () => {
    setupMockChainData([]);

    await getPurchaseAmounts(["p1"], "90d");
    expect(mockGte).toHaveBeenCalledWith("paid_at", expect.any(String));
  });

  it("dateRange='all' → gteが呼ばれない", async () => {
    setupMockChainData([]);

    await getPurchaseAmounts(["p1"], "all");
    expect(mockGte).not.toHaveBeenCalled();
  });
});

// ===================================================================
// getLastVisitDates: 最終来院日取得
// ===================================================================
describe("getLastVisitDates — 最終来院日取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列 → 空Map", async () => {
    const result = await getLastVisitDates([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("正常データ → 最新日付Map（降順先頭を採用）", async () => {
    // orderで降順ソート済みなので先頭が最新
    setupMockChainData([
      { patient_id: "p1", reserved_date: "2026-02-20" },
      { patient_id: "p1", reserved_date: "2026-01-15" },
      { patient_id: "p2", reserved_date: "2026-02-10" },
    ]);

    const result = await getLastVisitDates(["p1", "p2"]);
    // p1は先頭の2026-02-20が採用される（2件目は無視）
    expect(result.get("p1")).toBe("2026-02-20");
    expect(result.get("p2")).toBe("2026-02-10");
    // reservationsテーブルを参照
    expect(mockFrom).toHaveBeenCalledWith("reservations");
    // 降順ソートが指定されている
    expect(mockOrder).toHaveBeenCalledWith("reserved_date", { ascending: false });
  });

  it("予約なし → null設定", async () => {
    setupMockChainData([]);

    const result = await getLastVisitDates(["p1", "p2"]);
    expect(result.get("p1")).toBeNull();
    expect(result.get("p2")).toBeNull();
  });

  it("data=null → null設定", async () => {
    setupMockChainData(null);

    const result = await getLastVisitDates(["p1"]);
    expect(result.get("p1")).toBeNull();
  });

  it("一部の患者にデータがない場合 → 該当患者はnull", async () => {
    setupMockChainData([
      { patient_id: "p1", reserved_date: "2026-02-20" },
    ]);

    const result = await getLastVisitDates(["p1", "p2"]);
    expect(result.get("p1")).toBe("2026-02-20");
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
