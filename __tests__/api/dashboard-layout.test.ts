// __tests__/api/dashboard-layout.test.ts
// ダッシュボードウィジェット配置API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- settings モック ---
const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();

vi.mock("@/lib/settings", () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// --- リクエスト生成ヘルパー ---
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

import { GET, PUT, WIDGET_DEFINITIONS, getDefaultLayout } from "@/app/api/admin/dashboard-layout/route";

describe("ダッシュボードレイアウト API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("設定なし → デフォルトレイアウトを返す", async () => {
    mockGetSetting.mockResolvedValue(null);
    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // 全ウィジェットがvisible=trueで返る
    expect(json.widgets).toHaveLength(WIDGET_DEFINITIONS.length);
    json.widgets.forEach((w: any) => {
      expect(w.visible).toBe(true);
    });
  });

  it("保存済みレイアウトを返す", async () => {
    const saved = {
      widgets: [
        { id: "reservations", visible: true },
        { id: "shipping", visible: false },
        { id: "revenue", visible: true },
        { id: "repeat_rate", visible: true },
        { id: "payment_rate", visible: false },
        { id: "reservation_rate", visible: true },
        { id: "consultation_rate", visible: true },
        { id: "line_registered", visible: true },
        { id: "active_reservations", visible: true },
        { id: "today_paid", visible: true },
        { id: "avg_order", visible: true },
        { id: "daily_chart", visible: true },
        { id: "product_sales", visible: false },
        { id: "bank_transfer", visible: true },
      ],
    };
    mockGetSetting.mockResolvedValue(JSON.stringify(saved));

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // shippingはfalse
    const shipping = json.widgets.find((w: any) => w.id === "shipping");
    expect(shipping?.visible).toBe(false);
  });

  it("新ウィジェットが追加された場合、末尾に追加される", async () => {
    // 一部だけ保存されている場合（新ウィジェット未含む）
    const saved = {
      widgets: [
        { id: "reservations", visible: true },
        { id: "shipping", visible: true },
      ],
    };
    mockGetSetting.mockResolvedValue(JSON.stringify(saved));

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // 保存されていなかったウィジェットも追加される
    expect(json.widgets.length).toBe(WIDGET_DEFINITIONS.length);
    // revenue は追加されているはず
    const revenue = json.widgets.find((w: any) => w.id === "revenue");
    expect(revenue).toBeDefined();
    expect(revenue?.visible).toBe(true);
  });

  it("不正なJSON → デフォルトレイアウトにフォールバック", async () => {
    mockGetSetting.mockResolvedValue("INVALID JSON{{{");
    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.widgets).toHaveLength(WIDGET_DEFINITIONS.length);
  });
});

describe("ダッシュボードレイアウト API - PUT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockSetSetting.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", {
      widgets: [],
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("widgets配列なし → 400", async () => {
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", {});
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("widgets配列が必要です");
  });

  it("不正なウィジェットID → 400", async () => {
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", {
      widgets: [{ id: "invalid_widget_id", visible: true }],
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("不正なウィジェットID");
  });

  it("重複ウィジェットID → 400", async () => {
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", {
      widgets: [
        { id: "reservations", visible: true },
        { id: "reservations", visible: false },
      ],
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("重複ウィジェットID");
  });

  it("visibleがboolean以外 → 400", async () => {
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", {
      widgets: [{ id: "reservations", visible: "yes" }],
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("visible はboolean必須");
  });

  it("正常保存 → ok:true", async () => {
    const widgets = WIDGET_DEFINITIONS.map(w => ({ id: w.id, visible: true }));
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", { widgets });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockSetSetting).toHaveBeenCalledWith(
      "dashboard",
      "layout",
      expect.any(String),
      "test-tenant",
    );
  });

  it("保存失敗 → 500", async () => {
    mockSetSetting.mockResolvedValue(false);
    const widgets = [{ id: "reservations", visible: true }];
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", { widgets });
    const res = await PUT(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("保存に失敗しました");
  });

  it("不正なリクエストボディ → 400", async () => {
    const req = new Request("http://localhost/api/admin/dashboard-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON{{{",
    }) as any;
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("不正なリクエスト");
  });
});

describe("getDefaultLayout ヘルパー", () => {
  it("全ウィジェットがvisible=trueで返る", () => {
    const layout = getDefaultLayout();
    expect(layout.widgets).toHaveLength(WIDGET_DEFINITIONS.length);
    layout.widgets.forEach(w => {
      expect(w.visible).toBe(true);
    });
  });
});
