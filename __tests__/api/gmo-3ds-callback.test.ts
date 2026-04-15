// __tests__/api/gmo-3ds-callback.test.ts
// GMO 3DSコールバック（app/api/gmo/3ds-callback/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モック設定 ===
const mockSecureTran2 = vi.fn();
vi.mock("@/lib/payment/gmo", () => ({
  GmoPaymentProvider: class {
    secureTran2 = mockSecureTran2;
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((p: string) => p),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: vi.fn(),
}));

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: vi.fn().mockResolvedValue({ notifyReorderPaid: false }),
}));

vi.mock("@/lib/payment-thank-flex", () => ({
  sendPaymentThankNotification: vi.fn(),
}));

vi.mock("@/lib/tag-auto-rules", () => ({
  evaluateTagAutoRules: vi.fn().mockResolvedValue(undefined),
}));

const mockSaveCardViaTradedCard = vi.fn();
const mockMarkReorderPaid = vi.fn();
vi.mock("@/lib/payment/gmo-inline", () => ({
  saveCardViaTradedCard: (...args: unknown[]) => mockSaveCardViaTradedCard(...args),
  markReorderPaid: (...args: unknown[]) => mockMarkReorderPaid(...args),
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/point-auto-grant", () => ({
  processAutoGrant: vi.fn().mockResolvedValue(undefined),
}));

// Supabase モック
const mockFromResults: Record<string, { data: unknown; error: unknown }> = {};

function createChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "not", "is", "in",
    "order", "limit", "single", "maybeSingle",
    "gt", "gte", "lt", "lte", "range",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  chain.maybeSingle = vi.fn().mockReturnValue({
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return chain;
}

const mockFromFn = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFromFn(...args),
  },
}));

// dynamic import
const { POST, GET } = await import("@/app/api/gmo/3ds-callback/route");

const pendingOrder = {
  order_id: "order-3ds-001",
  access_id: "aid_001",
  access_pass: "apass_001",
  patient_id: "patient_001",
  product_code: "PROD_001",
  product_name: "テスト商品",
  amount: 5000,
  mode: null,
  reorder_id: null,
  tenant_id: "test-tenant",
  save_card: false,
  shipping: {
    name: "テスト太郎",
    postalCode: "1000001",
    address: "東京都千代田区",
    addressDetail: "1-1",
    phone: "09012345678",
    email: "test@example.com",
  },
};

function makeRequest(body: string) {
  return new NextRequest("http://localhost/api/gmo/3ds-callback", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト: pending order 取得成功
  mockFromFn.mockImplementation(() =>
    createChain({ data: pendingOrder, error: null }),
  );
  mockSecureTran2.mockResolvedValue({});
});

describe("POST /api/gmo/3ds-callback", () => {
  it("AccessIDがない場合はエラーリダイレクト", async () => {
    const res = await POST(makeRequest(""));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("payment_error=missing_access_id");
  });

  it("pending orderが見つからない場合はエラーリダイレクト", async () => {
    mockFromFn.mockImplementation(() =>
      createChain({ data: null, error: null }),
    );
    const res = await POST(makeRequest("AccessID=aid_001"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("payment_error=pending_not_found");
  });

  it("SecureTran2が失敗した場合はエラーリダイレクト", async () => {
    mockSecureTran2.mockResolvedValue({ ErrCode: "E01", ErrInfo: "3DS_FAIL" });
    const res = await POST(makeRequest("AccessID=aid_001"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("payment_error=3ds_failed");
  });

  it("正常系: 3DS認証成功で完了ページにリダイレクト", async () => {
    const res = await POST(makeRequest("AccessID=aid_001"));
    expect(res.status).toBe(303);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/mypage/purchase/complete");
    expect(location).toContain("code=PROD_001");
  });

  it("save_card=trueの場合はTradedCardを呼ぶ", async () => {
    mockFromFn.mockImplementation(() =>
      createChain({
        data: { ...pendingOrder, save_card: true },
        error: null,
      }),
    );
    mockSaveCardViaTradedCard.mockResolvedValue(true);

    await POST(makeRequest("AccessID=aid_001"));
    expect(mockSaveCardViaTradedCard).toHaveBeenCalledWith(
      "patient_001",
      "order-3ds-001",
      "test-tenant",
    );
  });

  it("reorder_idがある場合はmarkReorderPaidを呼ぶ", async () => {
    mockFromFn.mockImplementation(() =>
      createChain({
        data: { ...pendingOrder, reorder_id: "42" },
        error: null,
      }),
    );

    await POST(makeRequest("AccessID=aid_001"));
    expect(mockMarkReorderPaid).toHaveBeenCalledWith("42", "patient_001", "test-tenant");
  });
});

describe("GET /api/gmo/3ds-callback", () => {
  it("GETリクエストはエラーリダイレクト", async () => {
    const req = new NextRequest("http://localhost/api/gmo/3ds-callback");
    const res = await GET(req);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("payment_error=invalid_request");
  });
});
