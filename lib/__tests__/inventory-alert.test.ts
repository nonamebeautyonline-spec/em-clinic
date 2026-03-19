// lib/__tests__/inventory-alert.test.ts
// 在庫アラート（閾値通知）ロジックのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null, count: null }) {
  const chain: Record<string, unknown> = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

import { checkInventoryAlerts, getUnresolvedAlerts, getUnresolvedAlertCount } from "@/lib/inventory-alert";

describe("checkInventoryAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("アラート有効な商品がない場合は何もしない", async () => {
    // products クエリが空配列を返す
    tableChains["products"] = createChain({ data: [], error: null });
    tableChains["inventory_alerts"] = createChain({ data: [], error: null });

    const result = await checkInventoryAlerts("test-tenant");
    expect(result.created).toBe(0);
    expect(result.resolved).toBe(0);
  });

  it("products 取得エラー時はエラーを返さず 0/0 を返す", async () => {
    tableChains["products"] = createChain({ data: null, error: { message: "DB error" } });

    const result = await checkInventoryAlerts("test-tenant");
    expect(result.created).toBe(0);
    expect(result.resolved).toBe(0);
  });

  it("stock_quantity が null（無制限）の場合はアラートを作成しない", async () => {
    tableChains["products"] = createChain({
      data: [{
        id: "prod-1",
        title: "テスト商品",
        code: "TEST-1",
        stock_quantity: null,
        stock_alert_threshold: 5,
        stock_alert_enabled: true,
      }],
      error: null,
    });
    tableChains["inventory_alerts"] = createChain({ data: [], error: null });

    const result = await checkInventoryAlerts("test-tenant");
    expect(result.created).toBe(0);
  });

  it("閾値以下の商品に対してアラートを作成する", async () => {
    tableChains["products"] = createChain({
      data: [{
        id: "prod-1",
        title: "テスト商品",
        code: "TEST-1",
        stock_quantity: 3,
        stock_alert_threshold: 5,
        stock_alert_enabled: true,
      }],
      error: null,
    });
    // 既存アラートなし
    tableChains["inventory_alerts"] = createChain({ data: [], error: null });

    const result = await checkInventoryAlerts("test-tenant");
    expect(result.created).toBe(1);
    // insert が呼ばれたことを確認
    expect(tableChains["inventory_alerts"].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "prod-1",
        current_stock: 3,
        threshold: 5,
      })
    );
  });

  it("既にアラートがある場合は重複作成しない", async () => {
    tableChains["products"] = createChain({
      data: [{
        id: "prod-1",
        title: "テスト商品",
        code: "TEST-1",
        stock_quantity: 3,
        stock_alert_threshold: 5,
        stock_alert_enabled: true,
      }],
      error: null,
    });
    // 既存アラートあり
    tableChains["inventory_alerts"] = createChain({
      data: [{ id: "alert-1", product_id: "prod-1", current_stock: 3 }],
      error: null,
    });

    const result = await checkInventoryAlerts("test-tenant");
    expect(result.created).toBe(0);
  });

  it("在庫が閾値を超えた場合にアラートを解消する", async () => {
    tableChains["products"] = createChain({
      data: [{
        id: "prod-1",
        title: "テスト商品",
        code: "TEST-1",
        stock_quantity: 10,
        stock_alert_threshold: 5,
        stock_alert_enabled: true,
      }],
      error: null,
    });
    // 未解消アラートあり
    tableChains["inventory_alerts"] = createChain({
      data: [{ id: "alert-1", product_id: "prod-1", current_stock: 3 }],
      error: null,
    });

    const result = await checkInventoryAlerts("test-tenant");
    expect(result.resolved).toBe(1);
    // update(resolved_at) が呼ばれたことを確認
    expect(tableChains["inventory_alerts"].update).toHaveBeenCalledWith(
      expect.objectContaining({
        resolved_at: expect.any(String),
      })
    );
  });

  it("在庫がちょうど閾値と同じ場合はアラートを作成する", async () => {
    tableChains["products"] = createChain({
      data: [{
        id: "prod-1",
        title: "テスト商品",
        code: "TEST-1",
        stock_quantity: 5,
        stock_alert_threshold: 5,
        stock_alert_enabled: true,
      }],
      error: null,
    });
    tableChains["inventory_alerts"] = createChain({ data: [], error: null });

    const result = await checkInventoryAlerts("test-tenant");
    expect(result.created).toBe(1);
  });

  it("tenantId が null でも動作する", async () => {
    tableChains["products"] = createChain({ data: [], error: null });
    tableChains["inventory_alerts"] = createChain({ data: [], error: null });

    const result = await checkInventoryAlerts(null);
    expect(result.created).toBe(0);
    expect(result.resolved).toBe(0);
  });
});

describe("getUnresolvedAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("未解消アラートを商品情報付きで返す", async () => {
    tableChains["inventory_alerts"] = createChain({
      data: [{
        id: "alert-1",
        tenant_id: "test-tenant",
        product_id: "prod-1",
        current_stock: 3,
        threshold: 5,
        resolved_at: null,
        created_at: "2026-03-07T00:00:00Z",
        products: { title: "テスト商品", code: "TEST-1" },
      }],
      error: null,
    });

    const alerts = await getUnresolvedAlerts("test-tenant");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].product_title).toBe("テスト商品");
    expect(alerts[0].product_code).toBe("TEST-1");
    expect(alerts[0].current_stock).toBe(3);
    expect(alerts[0].threshold).toBe(5);
  });

  it("DBエラー時は空配列を返す", async () => {
    tableChains["inventory_alerts"] = createChain({ data: null, error: { message: "DB error" } });

    const alerts = await getUnresolvedAlerts("test-tenant");
    expect(alerts).toEqual([]);
  });
});

describe("getUnresolvedAlertCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("未解消アラート件数を返す", async () => {
    tableChains["inventory_alerts"] = createChain({ data: null, error: null, count: 3 });

    const count = await getUnresolvedAlertCount("test-tenant");
    expect(count).toBe(3);
  });

  it("DBエラー時は 0 を返す", async () => {
    tableChains["inventory_alerts"] = createChain({ data: null, error: { message: "DB error" }, count: null });

    const count = await getUnresolvedAlertCount("test-tenant");
    expect(count).toBe(0);
  });

  it("count が null の場合は 0 を返す", async () => {
    tableChains["inventory_alerts"] = createChain({ data: null, error: null, count: null });

    const count = await getUnresolvedAlertCount("test-tenant");
    expect(count).toBe(0);
  });
});
