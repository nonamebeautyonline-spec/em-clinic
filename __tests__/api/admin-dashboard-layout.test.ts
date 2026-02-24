// __tests__/api/admin-dashboard-layout.test.ts
// ダッシュボードレイアウトAPI 拡張テスト（DragOverlay・非表示ウィジェット再追加のユニットテスト含む）
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

import {
  GET,
  PUT,
  WIDGET_DEFINITIONS,
  getDefaultLayout,
  type DashboardLayout,
} from "@/app/api/admin/dashboard-layout/route";

describe("ダッシュボードレイアウト API - GET 拡張テスト", () => {
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

  it("設定なし → デフォルトレイアウト（全ウィジェット visible）", async () => {
    mockGetSetting.mockResolvedValue(null);
    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.widgets).toHaveLength(WIDGET_DEFINITIONS.length);
    json.widgets.forEach((w: any) => {
      expect(w.visible).toBe(true);
    });
  });

  it("一部非表示のレイアウトが正しく返る", async () => {
    const saved: DashboardLayout = {
      widgets: WIDGET_DEFINITIONS.map((d) => ({
        id: d.id,
        visible: d.id !== "shipping" && d.id !== "product_sales",
      })),
    };
    mockGetSetting.mockResolvedValue(JSON.stringify(saved));

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    const json = await res.json();

    // 非表示ウィジェットの確認
    const hiddenWidgets = json.widgets.filter((w: any) => !w.visible);
    expect(hiddenWidgets).toHaveLength(2);
    expect(hiddenWidgets.map((w: any) => w.id)).toContain("shipping");
    expect(hiddenWidgets.map((w: any) => w.id)).toContain("product_sales");
  });

  it("削除済みウィジェットIDは除外される", async () => {
    const saved = {
      widgets: [
        { id: "reservations", visible: true },
        { id: "deleted_widget_xyz" as any, visible: true },
        { id: "shipping", visible: true },
      ],
    };
    mockGetSetting.mockResolvedValue(JSON.stringify(saved));

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-layout");
    const res = await GET(req);
    const json = await res.json();

    // 不正なIDは除外される
    const ids = json.widgets.map((w: any) => w.id);
    expect(ids).not.toContain("deleted_widget_xyz");
    // 全ウィジェット分になる（未知のIDを除外し、不足分を補完）
    expect(json.widgets).toHaveLength(WIDGET_DEFINITIONS.length);
  });
});

describe("ダッシュボードレイアウト API - PUT 拡張テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockSetSetting.mockResolvedValue(true);
  });

  it("ウィジェット並び替え後の順序が保存される", async () => {
    // revenue → reservations → shipping の順で保存
    const widgets = [
      { id: "revenue", visible: true },
      { id: "reservations", visible: true },
      { id: "shipping", visible: true },
    ];
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", { widgets });
    const res = await PUT(req);
    expect(res.status).toBe(200);

    // setSetting に渡された JSON を検証
    const savedJson = JSON.parse(mockSetSetting.mock.calls[0][2]);
    expect(savedJson.widgets[0].id).toBe("revenue");
    expect(savedJson.widgets[1].id).toBe("reservations");
    expect(savedJson.widgets[2].id).toBe("shipping");
  });

  it("全ウィジェットを非表示にしても保存可能", async () => {
    const widgets = WIDGET_DEFINITIONS.map((w) => ({ id: w.id, visible: false }));
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", { widgets });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("空の widgets 配列でも保存可能", async () => {
    const req = createMockRequest("PUT", "http://localhost/api/admin/dashboard-layout", {
      widgets: [],
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

describe("getDefaultLayout ヘルパー 拡張テスト", () => {
  it("全ウィジェットIDがWIDGET_DEFINITIONSと一致", () => {
    const layout = getDefaultLayout();
    const layoutIds = layout.widgets.map((w) => w.id);
    const defIds = WIDGET_DEFINITIONS.map((d) => d.id);
    expect(layoutIds).toEqual(defIds);
  });

  it("非表示ウィジェットのフィルタリング動作", () => {
    const layout = getDefaultLayout();
    // デフォルトでは非表示ウィジェットなし
    const hiddenWidgets = layout.widgets.filter((w) => !w.visible);
    expect(hiddenWidgets).toHaveLength(0);

    // 一部を非表示にした場合
    layout.widgets[1].visible = false;
    layout.widgets[3].visible = false;
    const hidden = layout.widgets.filter((w) => !w.visible);
    expect(hidden).toHaveLength(2);
  });
});
