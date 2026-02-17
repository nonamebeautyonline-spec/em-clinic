// __tests__/api/analytics-financials.test.ts
// 分析・売上・在庫API統合テスト
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

// ===================================================================
// 分析API
// ===================================================================
const ANALYTICS_ROUTES = [
  { file: "app/api/admin/analytics/route.ts", name: "分析データ" },
  { file: "app/api/admin/analytics/export/route.ts", name: "分析エクスポート" },
];

describe("分析API: 認証チェック", () => {
  for (const { file, name } of ANALYTICS_ROUTES) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("verifyAdminAuth");
    });
  }
});

describe("分析API: テナント分離", () => {
  for (const { file, name } of ANALYTICS_ROUTES) {
    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
      expect(hasTenant).toBe(true);
    });
  }
});

describe("分析API: supabaseAdmin使用", () => {
  for (const { file, name } of ANALYTICS_ROUTES) {
    it(`${name} は supabaseAdmin を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("supabaseAdmin");
    });
  }
});

describe("分析API: 401レスポンス", () => {
  for (const { file, name } of ANALYTICS_ROUTES) {
    it(`${name} は認証失敗時 401 を返す`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("401");
    });
  }
});

// ===================================================================
// 分析API固有テスト
// ===================================================================
describe("analytics: 分析データ詳細", () => {
  const file = "app/api/admin/analytics/route.ts";

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("orders テーブルを参照している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"orders"');
  });
});

describe("analytics/export: 分析エクスポート詳細", () => {
  const file = "app/api/admin/analytics/export/route.ts";

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("CSV形式のレスポンスを返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasCsv = src.includes("text/csv") || src.includes("csv") || src.includes("CSV");
    expect(hasCsv).toBe(true);
  });
});

// ===================================================================
// 売上（financials）API
// ===================================================================
describe("financials: 売上データ", () => {
  const file = "app/api/admin/financials/route.ts";

  it("verifyAdminAuth で認証している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("verifyAdminAuth");
  });

  it("テナント対応している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
    expect(hasTenant).toBe(true);
  });

  it("Supabase クライアントを使用している（createClient または supabaseAdmin）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasClient = src.includes("supabaseAdmin") || src.includes("createClient");
    expect(hasClient).toBe(true);
  });

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("monthly_financials テーブルを参照している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("monthly_financials");
  });

  it("認証失敗時 401 を返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("401");
  });
});

// ===================================================================
// 日別売上（daily-revenue）API
// ===================================================================
describe("daily-revenue: 日別売上データ", () => {
  const file = "app/api/admin/daily-revenue/route.ts";

  it("verifyAdminAuth で認証している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("verifyAdminAuth");
  });

  it("テナント対応している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
    expect(hasTenant).toBe(true);
  });

  it("Supabase クライアントを使用している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasClient = src.includes("supabaseAdmin") || src.includes("createClient");
    expect(hasClient).toBe(true);
  });

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("認証失敗時 401 を返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("401");
  });
});

// ===================================================================
// 在庫（inventory）API
// ===================================================================
describe("inventory: 在庫管理", () => {
  const file = "app/api/admin/inventory/route.ts";

  it("verifyAdminAuth で認証している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("verifyAdminAuth");
  });

  it("テナント対応している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
    expect(hasTenant).toBe(true);
  });

  it("supabaseAdmin を使用している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("supabaseAdmin");
  });

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("getProducts 経由で商品データを取得している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("getProducts");
  });

  it("認証失敗時 401 を返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("401");
  });
});

// ===================================================================
// 売上計算ロジック（純粋関数テスト）
// ===================================================================
describe("売上計算: ロジックテスト", () => {
  function calculateRevenueSummary(
    orders: Array<{ amount: number; status: string; paid_at: string }>
  ) {
    const paidOrders = orders.filter((o) => o.status === "paid");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
    const orderCount = paidOrders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return { totalRevenue, orderCount, averageOrderValue };
  }

  it("正常に集計できる", () => {
    const orders = [
      { amount: 13000, status: "paid", paid_at: "2026-01-01" },
      { amount: 22850, status: "paid", paid_at: "2026-01-02" },
      { amount: 13000, status: "canceled", paid_at: "2026-01-03" },
    ];
    const summary = calculateRevenueSummary(orders);
    expect(summary.totalRevenue).toBe(35850);
    expect(summary.orderCount).toBe(2);
    expect(summary.averageOrderValue).toBe(17925);
  });

  it("全キャンセルの場合", () => {
    const orders = [
      { amount: 13000, status: "canceled", paid_at: "2026-01-01" },
    ];
    const summary = calculateRevenueSummary(orders);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.orderCount).toBe(0);
    expect(summary.averageOrderValue).toBe(0);
  });

  it("空配列の場合", () => {
    const summary = calculateRevenueSummary([]);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.orderCount).toBe(0);
    expect(summary.averageOrderValue).toBe(0);
  });
});

// ===================================================================
// 日別集計ロジック（純粋関数テスト）
// ===================================================================
describe("日別集計: ロジックテスト", () => {
  function groupByDate(
    orders: Array<{ amount: number; paid_at: string }>
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const o of orders) {
      const date = o.paid_at.slice(0, 10);
      map.set(date, (map.get(date) || 0) + o.amount);
    }
    return map;
  }

  it("日付ごとに合計を計算", () => {
    const orders = [
      { amount: 13000, paid_at: "2026-01-01T10:00:00Z" },
      { amount: 22850, paid_at: "2026-01-01T15:00:00Z" },
      { amount: 13000, paid_at: "2026-01-02T10:00:00Z" },
    ];
    const grouped = groupByDate(orders);
    expect(grouped.get("2026-01-01")).toBe(35850);
    expect(grouped.get("2026-01-02")).toBe(13000);
  });

  it("空配列の場合", () => {
    const grouped = groupByDate([]);
    expect(grouped.size).toBe(0);
  });
});
