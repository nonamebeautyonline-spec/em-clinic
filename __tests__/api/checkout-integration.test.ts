// __tests__/api/checkout-integration.test.ts
// checkout API の統合テスト（POSTハンドラ全体をテスト）
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextResponse } from "next/server";

// --- モック ---
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    })),
  },
}));

vi.mock("@/lib/products", () => ({
  getProductByCode: vi.fn(),
}));

vi.mock("@/lib/payment", () => ({
  getPaymentProvider: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue("test-tenant"),
  withTenant: vi.fn((query) => query),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/checkout", () => ({
  checkoutSchema: {},
}));

// --- 動的import用 ---
let POST: typeof import("@/app/api/checkout/route").POST;

beforeAll(async () => {
  process.env.APP_BASE_URL = "https://example.com";
  const mod = await import("@/app/api/checkout/route");
  POST = mod.POST;
});

// --- テストヘルパー ---
function createMockRequest(body?: Record<string, unknown>) {
  return {
    method: "POST",
    url: "https://example.com/api/checkout",
    headers: { get: vi.fn(() => null) },
    json: async () => body || {},
  } as any;
}

async function parseJson(res: Response) {
  return res.json();
}

describe("checkout API 統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. APP_BASE_URL未設定 → 500", async () => {
    // APP_BASE_URLはモジュールレベルで評価済みなので、
    // 再importが必要。vi.resetModules で再評価する
    vi.resetModules();

    // 環境変数を未設定にしてから再import
    const originalUrl = process.env.APP_BASE_URL;
    delete process.env.APP_BASE_URL;

    // モックを再設定（resetModulesで消えるため）
    vi.mock("@/lib/supabase", () => ({
      supabaseAdmin: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      },
    }));
    vi.mock("@/lib/products", () => ({ getProductByCode: vi.fn() }));
    vi.mock("@/lib/payment", () => ({ getPaymentProvider: vi.fn() }));
    vi.mock("@/lib/tenant", () => ({
      resolveTenantId: vi.fn().mockReturnValue("test-tenant"),
      withTenant: vi.fn((query) => query),
    }));
    vi.mock("@/lib/validations/helpers", () => ({ parseBody: vi.fn() }));
    vi.mock("@/lib/validations/checkout", () => ({ checkoutSchema: {} }));

    const mod = await import("@/app/api/checkout/route");
    const req = createMockRequest();
    const res = await mod.POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(500);
    expect(json.error).toContain("APP_BASE_URL");

    // 環境変数を復元
    process.env.APP_BASE_URL = originalUrl;
  });

  it("2. 商品が存在しない → 400", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "INVALID", mode: "current", patientId: null, reorderId: null },
    } as any);
    vi.mocked(getProductByCode).mockResolvedValue(null as any);

    const req = createMockRequest();
    const res = await POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid productCode.");
  });

  it("3. NG患者 → 403", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { withTenant } = await import("@/lib/tenant");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "current", patientId: "patient-ng", reorderId: null },
    } as any);
    // withTenantがintakeクエリ結果としてNG statusを返すようにする
    vi.mocked(withTenant).mockResolvedValueOnce({ data: { status: "NG" }, error: null } as any);

    const req = createMockRequest();
    const res = await POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(403);
    expect(json.error).toContain("処方不可");
  });

  it("4. 正常系 → 200 + checkoutUrl", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");
    const { getPaymentProvider } = await import("@/lib/payment");
    const { withTenant } = await import("@/lib/tenant");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "current", patientId: "patient-ok", reorderId: null },
    } as any);
    // withTenantがintakeクエリ結果としてOK statusを返す
    vi.mocked(withTenant).mockResolvedValueOnce({ data: { status: "OK" }, error: null } as any);
    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as any);
    const mockProvider = {
      createCheckoutLink: vi.fn().mockResolvedValue({ checkoutUrl: "https://pay.example.com/checkout/123" }),
    };
    vi.mocked(getPaymentProvider).mockResolvedValue(mockProvider as any);

    const req = createMockRequest();
    const res = await POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(200);
    expect(json.checkoutUrl).toBe("https://pay.example.com/checkout/123");
  });

  it("5. patientIdなしの場合 → NG判定スキップして正常続行", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");
    const { getPaymentProvider } = await import("@/lib/payment");
    const { supabaseAdmin } = await import("@/lib/supabase");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "first", patientId: null, reorderId: null },
    } as any);
    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as any);
    const mockProvider = {
      createCheckoutLink: vi.fn().mockResolvedValue({ checkoutUrl: "https://pay.example.com/checkout/456" }),
    };
    vi.mocked(getPaymentProvider).mockResolvedValue(mockProvider as any);

    const req = createMockRequest();
    const res = await POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(200);
    expect(json.checkoutUrl).toBe("https://pay.example.com/checkout/456");
    // supabaseAdmin.from が intake 用に呼ばれていないことを確認
    // (patientIdがnullなのでintakeクエリはスキップされる)
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("6. 無効なmode → 400", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "invalid_mode", patientId: null, reorderId: null },
    } as any);
    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as any);

    const req = createMockRequest();
    const res = await POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(400);
    expect(json.error).toContain("Invalid mode");
  });

  it("7. provider例外 → 500", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");
    const { getPaymentProvider } = await import("@/lib/payment");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "current", patientId: null, reorderId: null },
    } as any);
    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as any);
    const mockProvider = {
      createCheckoutLink: vi.fn().mockRejectedValue(new Error("決済プロバイダーエラー")),
    };
    vi.mocked(getPaymentProvider).mockResolvedValue(mockProvider as any);

    const req = createMockRequest();
    const res = await POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(500);
    expect(json.error).toContain("エラー");
  });

  it("8. Zodバリデーション失敗 → parseBodyのエラー返却", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");

    const errorResponse = NextResponse.json({ error: "バリデーションエラー" }, { status: 400 });
    vi.mocked(parseBody).mockResolvedValue({ error: errorResponse } as any);

    const req = createMockRequest();
    const res = await POST(req);
    const json = await parseJson(res);

    expect(res.status).toBe(400);
    expect(json.error).toBe("バリデーションエラー");
  });
});
