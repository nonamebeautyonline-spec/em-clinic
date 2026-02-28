// __tests__/api/square-sdk-config.test.ts
// GET /api/square/sdk-config のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック ---
const mockGetSettingsBulk = vi.fn();

vi.mock("@/lib/settings", () => ({
  getSettingsBulk: (...args: any[]) => mockGetSettingsBulk(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
}));

// --- ルートインポート ---
import { GET } from "@/app/api/square/sdk-config/route";

function createRequest() {
  const req = new NextRequest("http://localhost:3000/api/square/sdk-config");
  return req;
}

function makeSettings(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    "payment:checkout_mode": "inline",
    "payment:provider": "square",
    "square:application_id": "sq0idp-APP_ID",
    "square:location_id": "LOC_123",
    "square:env": "sandbox",
    ...overrides,
  };
  return new Map(Object.entries(defaults));
}

describe("GET /api/square/sdk-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: inline有効
    mockGetSettingsBulk.mockResolvedValue(makeSettings());
  });

  it("inline有効時、SDK設定を返す", async () => {
    const res = await GET(createRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.enabled).toBe(true);
    expect(body.applicationId).toBe("sq0idp-APP_ID");
    expect(body.locationId).toBe("LOC_123");
    expect(body.environment).toBe("sandbox");
  });

  it("getSettingsBulk にテナントIDが渡される", async () => {
    await GET(createRequest());
    expect(mockGetSettingsBulk).toHaveBeenCalledWith(["payment", "square"], "test-tenant");
  });

  it("checkout_mode=hosted の場合は enabled: false", async () => {
    mockGetSettingsBulk.mockResolvedValue(makeSettings({ "payment:checkout_mode": "hosted" }));
    const res = await GET(createRequest());
    const body = await res.json();

    expect(body.enabled).toBe(false);
  });

  it("checkout_mode 未設定の場合は enabled: false（デフォルト hosted）", async () => {
    const settings = makeSettings();
    settings.delete("payment:checkout_mode");
    mockGetSettingsBulk.mockResolvedValue(settings);

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });

  it("provider=gmo の場合は enabled: false", async () => {
    mockGetSettingsBulk.mockResolvedValue(makeSettings({ "payment:provider": "gmo" }));
    const res = await GET(createRequest());
    const body = await res.json();

    expect(body.enabled).toBe(false);
  });

  it("applicationId 未設定の場合は enabled: false", async () => {
    const settings = makeSettings();
    settings.delete("square:application_id");
    mockGetSettingsBulk.mockResolvedValue(settings);

    // 環境変数もクリア
    const orig = process.env.SQUARE_APPLICATION_ID;
    delete process.env.SQUARE_APPLICATION_ID;

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(false);

    process.env.SQUARE_APPLICATION_ID = orig;
  });

  it("locationId 未設定の場合は enabled: false", async () => {
    const settings = makeSettings();
    settings.delete("square:location_id");
    mockGetSettingsBulk.mockResolvedValue(settings);

    const orig = process.env.SQUARE_LOCATION_ID;
    delete process.env.SQUARE_LOCATION_ID;

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(false);

    process.env.SQUARE_LOCATION_ID = orig;
  });

  it("DB未設定でも環境変数から applicationId/locationId を取得する", async () => {
    const settings = makeSettings();
    settings.delete("square:application_id");
    settings.delete("square:location_id");
    settings.delete("square:env");
    mockGetSettingsBulk.mockResolvedValue(settings);

    process.env.SQUARE_APPLICATION_ID = "env-app-id";
    process.env.SQUARE_LOCATION_ID = "env-loc-id";
    process.env.SQUARE_ENV = "production";

    const res = await GET(createRequest());
    const body = await res.json();

    expect(body.enabled).toBe(true);
    expect(body.applicationId).toBe("env-app-id");
    expect(body.locationId).toBe("env-loc-id");
    expect(body.environment).toBe("production");

    delete process.env.SQUARE_APPLICATION_ID;
    delete process.env.SQUARE_LOCATION_ID;
    delete process.env.SQUARE_ENV;
  });
});
