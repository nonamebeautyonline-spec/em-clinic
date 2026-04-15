// __tests__/api/gmo-pay.test.ts
// GMO決済エンドポイント（app/api/gmo/pay/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モック設定 ===
vi.mock("@/lib/patient-session", () => ({
  verifyPatientSession: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false }),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn().mockResolvedValue({ acquired: true, release: vi.fn() }),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((p: string) => p),
}));

vi.mock("@/lib/products", () => ({
  getProductByCode: vi.fn().mockResolvedValue({ title: "テスト商品", price: 5000, field_id: null }),
}));

vi.mock("@/lib/medical-fields", () => ({
  isMultiFieldEnabled: vi.fn().mockResolvedValue(false),
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

vi.mock("@/lib/address-utils", () => ({
  hasAddressDuplication: vi.fn(() => false),
}));

const mockCreateGmoPayment = vi.fn();
const mockCreateGmoPaymentWithSavedCard = vi.fn();
const mockEnsureGmoMember = vi.fn();
const mockGetGmoSavedCard = vi.fn();
const mockSaveCardViaTradedCard = vi.fn();
const mockMarkReorderPaid = vi.fn();

vi.mock("@/lib/payment/gmo-inline", () => ({
  createGmoPayment: (...args: unknown[]) => mockCreateGmoPayment(...args),
  createGmoPaymentWithSavedCard: (...args: unknown[]) => mockCreateGmoPaymentWithSavedCard(...args),
  ensureGmoMember: (...args: unknown[]) => mockEnsureGmoMember(...args),
  getGmoSavedCard: (...args: unknown[]) => mockGetGmoSavedCard(...args),
  saveCardViaTradedCard: (...args: unknown[]) => mockSaveCardViaTradedCard(...args),
  markReorderPaid: (...args: unknown[]) => mockMarkReorderPaid(...args),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/gmo-pay", () => ({
  gmoInlinePaySchema: {},
}));

// resolveCart モック
vi.mock("@/lib/purchase/resolve-cart", () => ({
  resolveCart: vi.fn().mockResolvedValue({
    productCode: "PROD_001",
    productName: "テスト商品",
    totalAmount: 5000,
    shippingFee: 0,
    items: [{ code: "PROD_001", title: "テスト商品", price: 5000, qty: 1 }],
  }),
}));

// メニュールール・ポイント
vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/point-auto-grant", () => ({
  processAutoGrant: vi.fn().mockResolvedValue(undefined),
}));

// Supabase モック
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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain({ data: null, error: null })),
  },
}));

import { verifyPatientSession } from "@/lib/patient-session";
import { parseBody } from "@/lib/validations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { acquireLock } from "@/lib/distributed-lock";
import { hasAddressDuplication } from "@/lib/address-utils";

const mockVerifySession = vi.mocked(verifyPatientSession);
const mockParseBody = vi.mocked(parseBody);
const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockAcquireLock = vi.mocked(acquireLock);
const mockHasAddressDup = vi.mocked(hasAddressDuplication);

// dynamic import でルートをロード
const { POST } = await import("@/app/api/gmo/pay/route");

const defaultBody = {
  token: "tok_xxx",
  useSavedCard: false,
  productCode: "PROD_001",
  cartItems: null,
  mode: "first",
  patientId: "patient_001",
  reorderId: null,
  saveCard: false,
  isFirstPurchase: false,
  shipping: {
    name: "テスト太郎",
    postalCode: "1000001",
    address: "東京都千代田区",
    addressDetail: "1-1",
    phone: "09012345678",
    email: "test@example.com",
  },
  shippingOptions: null,
};

function makeRequest(body = defaultBody) {
  return new NextRequest("http://localhost/api/gmo/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifySession.mockResolvedValue({ patientId: "patient_001" } as never);
  mockParseBody.mockResolvedValue({ data: defaultBody } as never);
  mockCheckRateLimit.mockResolvedValue({ limited: false } as never);
  mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() } as never);
  mockCreateGmoPayment.mockResolvedValue({ ok: true, orderId: "order-123" });
  // hasAddressDuplication は mockReturnValue で設定されるため、毎回明示的にリセット
  mockHasAddressDup.mockReturnValue(false);
});

describe("POST /api/gmo/pay", () => {
  it("セッション未認証の場合403を返す", async () => {
    mockVerifySession.mockResolvedValue(null as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it("バリデーションエラーの場合はパースエラーを返す", async () => {
    const errorResponse = new Response(JSON.stringify({ message: "invalid" }), { status: 400 });
    mockParseBody.mockResolvedValue({ error: errorResponse } as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("トークンも保存カードもない場合400を返す", async () => {
    mockParseBody.mockResolvedValue({
      data: { ...defaultBody, token: null, useSavedCard: false },
    } as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("カード情報が不足");
  });

  it("住所に都道府県重複がある場合400を返す", async () => {
    mockHasAddressDup.mockReturnValue(true);
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("都道府県が重複");
  });

  it("patientIdがセッションと不一致の場合403を返す", async () => {
    mockParseBody.mockResolvedValue({
      data: { ...defaultBody, patientId: "different_patient" },
    } as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it("レート制限に引っかかった場合429を返す", async () => {
    mockCheckRateLimit.mockResolvedValue({ limited: true } as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it("分散ロック取得失敗の場合409を返す", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: false, release: vi.fn() } as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
  });

  it("正常系: 決済成功でorderId付きレスポンスを返す", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toBe("order-123");
  });

  it("GMO決済失敗の場合400を返す", async () => {
    mockCreateGmoPayment.mockResolvedValue({ ok: false, error: "カードが拒否されました" });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("3DS認証が必要な場合はacsUrl付きレスポンスを返す", async () => {
    mockCreateGmoPayment.mockResolvedValue({
      ok: false,
      needs3ds: true,
      acsUrl: "https://acs.example.com",
      orderId: "order-3ds",
      accessId: "aid",
      accessPass: "apass",
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.needs3ds).toBe(true);
    expect(data.acsUrl).toBe("https://acs.example.com");
  });
});
