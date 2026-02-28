// __tests__/api/square-pay.test.ts
// POST /api/square/pay のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gte",
    "is", "not", "order", "limit", "maybeSingle", "single", "upsert",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((...args: any[]) => {
      const chains = (globalThis as any).__testTableChains || {};
      const table = args[0];
      if (!chains[table]) chains[table] = createChain();
      return chains[table];
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  getProductByCode: vi.fn(),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((v: string) => v || ""),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false, remaining: 5 }),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/payment/square-inline", () => ({
  ensureSquareCustomer: vi.fn(),
  saveCardOnFile: vi.fn(),
  createSquarePayment: vi.fn(),
  markReorderPaid: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

// --- ルートインポート ---
import { POST } from "@/app/api/square/pay/route";
import { getSettingOrEnv } from "@/lib/settings";
import { getProductByCode } from "@/lib/products";
import { parseBody } from "@/lib/validations/helpers";
import { createSquarePayment, ensureSquareCustomer, saveCardOnFile, markReorderPaid } from "@/lib/payment/square-inline";
import { invalidateDashboardCache } from "@/lib/redis";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { checkRateLimit } from "@/lib/rate-limit";

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

const validBody = {
  sourceId: "cnon:CARD_NONCE",
  productCode: "MJL_2.5mg_1m",
  mode: "current",
  patientId: "PID_001",
  reorderId: null,
  saveCard: true,
  shipping: {
    name: "山田太郎",
    postalCode: "160-0023",
    address: "東京都新宿区西新宿1-1-1",
    phone: "09012345678",
    email: "test@example.com",
  },
};

function createRequest(body: any = validBody, cookies: Record<string, string> = { patient_id: "PID_001" }) {
  const req = new NextRequest("http://localhost:3000/api/square/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

describe("POST /api/square/pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};

    // デフォルトモック設定
    vi.mocked(checkRateLimit).mockResolvedValue({ limited: false, remaining: 5 });
    vi.mocked(parseBody).mockResolvedValue({ data: validBody });
    vi.mocked(getSettingOrEnv).mockImplementation(async (_cat, key) => {
      if (key === "access_token") return "sq-test-token";
      if (key === "location_id") return "LOC_123";
      if (key === "env") return "sandbox";
      return "";
    });
    vi.mocked(getProductByCode).mockResolvedValue({
      code: "MJL_2.5mg_1m",
      title: "マンジャロ 2.5mg 1ヶ月",
      price: 13000,
    });
    vi.mocked(createSquarePayment).mockResolvedValue({
      ok: true,
      payment: { id: "PAY_001", created_at: "2026-03-01T12:00:00Z", receipt_url: "https://squareup.com/receipt" },
    });
    vi.mocked(ensureSquareCustomer).mockResolvedValue("CUST_001");
    vi.mocked(saveCardOnFile).mockResolvedValue("ccof:SAVED_CARD");

    // intake チェーン（NG患者チェック用）
    const intakeChain = createChain({ data: { status: "OK" }, error: null });
    setTableChain("intake", intakeChain);

    // orders チェーン
    const ordersChain = createChain({ data: null, error: null });
    setTableChain("orders", ordersChain);
  });

  it("正常な初回決済（nonce）で成功レスポンスを返す", async () => {
    const res = await POST(createRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.paymentId).toBe("PAY_001");
  });

  it("初回決済でカード保存 → card_id で決済する", async () => {
    await POST(createRequest());

    expect(ensureSquareCustomer).toHaveBeenCalled();
    expect(saveCardOnFile).toHaveBeenCalled();
    // createSquarePayment の sourceId がカードID
    expect(createSquarePayment).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ sourceId: "ccof:SAVED_CARD" }),
    );
  });

  it("カード保存失敗時はnonceで直接決済（フォールバック）", async () => {
    vi.mocked(saveCardOnFile).mockResolvedValue(null);

    const res = await POST(createRequest());
    const body = await res.json();

    expect(body.success).toBe(true);
    // nonce で直接決済
    expect(createSquarePayment).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ sourceId: "cnon:CARD_NONCE" }),
    );
  });

  it("保存済みカードでの決済（2回目以降）", async () => {
    const savedCardBody = { ...validBody, sourceId: "ccof:EXISTING_CARD" };
    vi.mocked(parseBody).mockResolvedValue({ data: savedCardBody });

    const pChain = createChain({
      data: { square_customer_id: "CUST_001", square_card_id: "ccof:EXISTING_CARD" },
      error: null,
    });
    setTableChain("patients", pChain);

    const res = await POST(createRequest(savedCardBody));
    const body = await res.json();

    expect(body.success).toBe(true);
    // ensureSquareCustomer は呼ばれない（保存済みカードフロー）
    expect(ensureSquareCustomer).not.toHaveBeenCalled();
    expect(saveCardOnFile).not.toHaveBeenCalled();
  });

  it("他人のカードIDで決済しようとすると 403 エラー", async () => {
    const savedCardBody = { ...validBody, sourceId: "ccof:SOMEONE_ELSE_CARD" };
    vi.mocked(parseBody).mockResolvedValue({ data: savedCardBody });

    const pChain = createChain({
      data: { square_customer_id: "CUST_001", square_card_id: "ccof:MY_CARD" },
      error: null,
    });
    setTableChain("patients", pChain);

    const res = await POST(createRequest(savedCardBody));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("無効なカード");
  });

  it("Cookie不一致で 403 エラー", async () => {
    const res = await POST(createRequest(validBody, { patient_id: "WRONG_PID" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("認証情報");
  });

  it("NG患者の場合 403 エラー", async () => {
    const intakeChain = createChain({ data: { status: "NG" }, error: null });
    setTableChain("intake", intakeChain);

    const res = await POST(createRequest());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("処方不可");
  });

  it("無効な商品コードで 400 エラー", async () => {
    vi.mocked(getProductByCode).mockResolvedValue(null);

    const res = await POST(createRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("無効な商品コード");
  });

  it("Square設定不足で 500 エラー", async () => {
    vi.mocked(getSettingOrEnv).mockResolvedValue(undefined);

    const res = await POST(createRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Square設定");
  });

  it("決済失敗で 400 エラー", async () => {
    vi.mocked(createSquarePayment).mockResolvedValue({
      ok: false,
      error: "カードが拒否されました",
    });

    const res = await POST(createRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("カードが拒否されました");
  });

  it("reorder モードで paidマーク + カルテ作成される", async () => {
    const reorderBody = { ...validBody, mode: "reorder", reorderId: "42" };
    vi.mocked(parseBody).mockResolvedValue({ data: reorderBody });

    await POST(createRequest(reorderBody));

    expect(markReorderPaid).toHaveBeenCalledWith("42", "PID_001", "test-tenant");
    expect(createReorderPaymentKarte).toHaveBeenCalledWith(
      "PID_001", "MJL_2.5mg_1m", expect.any(String), undefined, "test-tenant",
    );
  });

  it("current モードでは reorder処理が走らない", async () => {
    await POST(createRequest());

    expect(markReorderPaid).not.toHaveBeenCalled();
    expect(createReorderPaymentKarte).not.toHaveBeenCalled();
  });

  it("決済成功後にキャッシュが削除される", async () => {
    await POST(createRequest());
    expect(invalidateDashboardCache).toHaveBeenCalledWith("PID_001");
  });

  it("orders INSERT にテナントペイロードが含まれる", async () => {
    const ordersChain = createChain({ data: null, error: null });
    setTableChain("orders", ordersChain);

    await POST(createRequest());

    expect(ordersChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "test-tenant" }),
    );
  });

  it("parseBody エラー時はバリデーションエラーを返す", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "入力値が不正です" }), { status: 400 });
    vi.mocked(parseBody).mockResolvedValue({ error: errorResponse } as any);

    const res = await POST(createRequest());
    expect(res.status).toBe(400);
  });

  it("レート制限に引っかかると 429 エラー", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ limited: true, remaining: 0, retryAfter: 300 });

    const res = await POST(createRequest());
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toContain("決済リクエストが多すぎます");
  });

  it("直近60秒以内の同一注文がある場合は 409 エラー", async () => {
    // ordersの重複チェックで既存注文が見つかるケース
    const ordersChain = createChain({ data: { id: "PAY_RECENT" }, error: null });
    setTableChain("orders", ordersChain);

    const res = await POST(createRequest());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("直前に同じ決済");
  });

  it("冪等性キーがcreateSquarePaymentに渡される", async () => {
    await POST(createRequest());

    expect(createSquarePayment).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });
});
