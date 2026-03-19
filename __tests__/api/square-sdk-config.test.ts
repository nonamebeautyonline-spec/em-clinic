// __tests__/api/square-sdk-config.test.ts
// GET /api/square/sdk-config のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック ---
const mockGetSetting = vi.fn();

vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
}));

vi.mock("@/lib/square-account-server", () => ({
  getActiveSquareAccount: vi.fn(),
}));

// --- ルートインポート ---
import { GET } from "@/app/api/square/sdk-config/route";
import { getActiveSquareAccount } from "@/lib/square-account-server";

function createRequest() {
  const req = new NextRequest("http://localhost:3000/api/square/sdk-config");
  return req;
}

describe("GET /api/square/sdk-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: inline + square
    mockGetSetting.mockImplementation((category: string, key: string) => {
      if (category === "payment" && key === "checkout_mode") return "inline";
      if (category === "payment" && key === "provider") return "square";
      return null;
    });
    vi.mocked(getActiveSquareAccount).mockResolvedValue({
      accessToken: "sq-test-token",
      applicationId: "sq0idp-APP_ID",
      locationId: "LOC_123",
      webhookSignatureKey: "",
      env: "sandbox",
      threeDsEnabled: false,
      baseUrl: "https://connect.squareupsandbox.com",
    });
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

  it("getActiveSquareAccount にテナントIDが渡される", async () => {
    await GET(createRequest());
    expect(getActiveSquareAccount).toHaveBeenCalledWith("test-tenant");
  });

  it("checkout_mode=hosted の場合は enabled: false", async () => {
    mockGetSetting.mockImplementation((category: string, key: string) => {
      if (category === "payment" && key === "checkout_mode") return "hosted";
      if (category === "payment" && key === "provider") return "square";
      return null;
    });
    const res = await GET(createRequest());
    const body = await res.json();

    expect(body.enabled).toBe(false);
  });

  it("checkout_mode 未設定の場合は enabled: false（デフォルト hosted）", async () => {
    mockGetSetting.mockImplementation((category: string, key: string) => {
      if (category === "payment" && key === "checkout_mode") return null;
      if (category === "payment" && key === "provider") return "square";
      return null;
    });

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });

  it("provider=gmo の場合は enabled: false", async () => {
    mockGetSetting.mockImplementation((category: string, key: string) => {
      if (category === "payment" && key === "checkout_mode") return "inline";
      if (category === "payment" && key === "provider") return "gmo";
      return null;
    });
    const res = await GET(createRequest());
    const body = await res.json();

    expect(body.enabled).toBe(false);
  });

  it("applicationId 未設定の場合は enabled: false", async () => {
    vi.mocked(getActiveSquareAccount).mockResolvedValue({
      accessToken: "sq-test-token",
      applicationId: "",
      locationId: "LOC_123",
      webhookSignatureKey: "",
      env: "sandbox",
      threeDsEnabled: false,
      baseUrl: "https://connect.squareupsandbox.com",
    });

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });

  it("locationId 未設定の場合は enabled: false", async () => {
    vi.mocked(getActiveSquareAccount).mockResolvedValue({
      accessToken: "sq-test-token",
      applicationId: "sq0idp-APP_ID",
      locationId: "",
      webhookSignatureKey: "",
      env: "sandbox",
      threeDsEnabled: false,
      baseUrl: "https://connect.squareupsandbox.com",
    });

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });

  it("Square設定が未構成の場合は enabled: false", async () => {
    vi.mocked(getActiveSquareAccount).mockResolvedValue(undefined);

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });

  it("3DS有効の場合 threeDsEnabled: true", async () => {
    vi.mocked(getActiveSquareAccount).mockResolvedValue({
      accessToken: "sq-test-token",
      applicationId: "sq0idp-APP_ID",
      locationId: "LOC_123",
      webhookSignatureKey: "",
      env: "production",
      threeDsEnabled: true,
      baseUrl: "https://connect.squareup.com",
    });

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.threeDsEnabled).toBe(true);
  });
});
