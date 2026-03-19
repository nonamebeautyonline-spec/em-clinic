// __tests__/api/inventory-alerts.test.ts
// 在庫アラートAPI (app/api/admin/inventory/alerts/route.ts, alerts/count/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyAdminAuth, mockCheckInventoryAlerts, mockGetUnresolvedAlerts, mockGetUnresolvedAlertCount } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockCheckInventoryAlerts: vi.fn().mockResolvedValue({ created: 0, resolved: 0 }),
  mockGetUnresolvedAlerts: vi.fn().mockResolvedValue([]),
  mockGetUnresolvedAlertCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/inventory-alert", () => ({
  checkInventoryAlerts: mockCheckInventoryAlerts,
  getUnresolvedAlerts: mockGetUnresolvedAlerts,
  getUnresolvedAlertCount: mockGetUnresolvedAlertCount,
}));

import { GET as alertsGET } from "@/app/api/admin/inventory/alerts/route";
import { GET as countGET } from "@/app/api/admin/inventory/alerts/count/route";

function createGetRequest(path: string) {
  return new Request(`http://localhost${path}`, { method: "GET" });
}

// =============================================
// GET /api/admin/inventory/alerts テスト
// =============================================
describe("GET /api/admin/inventory/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createGetRequest("/api/admin/inventory/alerts");
    const res = await alertsGET(req);
    expect(res.status).toBe(401);
  });

  it("正常にアラート一覧を返す", async () => {
    const alerts = [
      {
        id: "alert-1",
        tenant_id: "test-tenant",
        product_id: "prod-1",
        current_stock: 3,
        threshold: 5,
        resolved_at: null,
        created_at: "2026-03-07T00:00:00Z",
        product_title: "テスト商品",
        product_code: "TEST-1",
      },
    ];
    mockGetUnresolvedAlerts.mockResolvedValue(alerts);

    const req = createGetRequest("/api/admin/inventory/alerts");
    const res = await alertsGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alerts).toHaveLength(1);
    expect(json.alerts[0].product_title).toBe("テスト商品");
    expect(json.alerts[0].current_stock).toBe(3);
  });

  it("アラートがない場合は空配列を返す", async () => {
    mockGetUnresolvedAlerts.mockResolvedValue([]);

    const req = createGetRequest("/api/admin/inventory/alerts");
    const res = await alertsGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alerts).toEqual([]);
  });

  it("checkInventoryAlerts を呼んでから一覧を取得する", async () => {
    mockGetUnresolvedAlerts.mockResolvedValue([]);

    const req = createGetRequest("/api/admin/inventory/alerts");
    await alertsGET(req);

    // checkInventoryAlerts が先に呼ばれることを確認
    expect(mockCheckInventoryAlerts).toHaveBeenCalledWith("test-tenant");
    expect(mockGetUnresolvedAlerts).toHaveBeenCalledWith("test-tenant");
  });

  it("checkInventoryAlerts がエラーでもリクエスト自体は 500 を返す", async () => {
    mockCheckInventoryAlerts.mockRejectedValue(new Error("check failed"));

    const req = createGetRequest("/api/admin/inventory/alerts");
    const res = await alertsGET(req);
    expect(res.status).toBe(500);
  });
});

// =============================================
// GET /api/admin/inventory/alerts/count テスト
// =============================================
describe("GET /api/admin/inventory/alerts/count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createGetRequest("/api/admin/inventory/alerts/count");
    const res = await countGET(req);
    expect(res.status).toBe(401);
  });

  it("正常にアラート件数を返す", async () => {
    mockGetUnresolvedAlertCount.mockResolvedValue(5);

    const req = createGetRequest("/api/admin/inventory/alerts/count");
    const res = await countGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(5);
  });

  it("アラートがない場合は 0 を返す", async () => {
    mockGetUnresolvedAlertCount.mockResolvedValue(0);

    const req = createGetRequest("/api/admin/inventory/alerts/count");
    const res = await countGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(0);
  });

  it("エラー時は 500 を返す", async () => {
    mockGetUnresolvedAlertCount.mockRejectedValue(new Error("DB error"));

    const req = createGetRequest("/api/admin/inventory/alerts/count");
    const res = await countGET(req);
    expect(res.status).toBe(500);
  });
});
