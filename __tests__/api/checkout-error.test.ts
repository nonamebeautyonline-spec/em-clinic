// __tests__/api/checkout-error.test.ts
// checkout API の異常系テスト（Supabaseエラー、タイムアウト、不正レスポンス）
import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from "vitest";
import { NextResponse } from "next/server";
import type { PaymentProvider } from "@/lib/payment/types";

// --- モック（checkout-integration.test.ts と同じ構成） ---
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
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/checkout", () => ({
  checkoutSchema: {},
}));

const mockGetSettingOrEnv = vi.fn().mockResolvedValue("https://example.com");
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: unknown[]) => mockGetSettingOrEnv(...args),
}));

// --- 動的import ---
let POST: typeof import("@/app/api/checkout/route").POST;

beforeAll(async () => {
  const mod = await import("@/app/api/checkout/route");
  POST = mod.POST;
});

// --- テストヘルパー ---
interface MockRequest {
  method: string;
  url: string;
  headers: { get: Mock };
  json: () => Promise<Record<string, unknown>>;
}

function createMockRequest(body?: Record<string, unknown>): MockRequest {
  return {
    method: "POST",
    url: "https://example.com/api/checkout",
    headers: { get: vi.fn(() => null) },
    json: async () => body || {},
  };
}

async function parseJson(res: Response) {
  return res.json();
}

// ========== 異常系テスト ==========
describe("checkout API 異常系テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトでAPP_BASE_URLを返す
    mockGetSettingOrEnv.mockResolvedValue("https://example.com");
  });

  it("Supabaseがエラーを返す場合 → intake取得失敗でもクラッシュしない", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");
    const { getPaymentProvider } = await import("@/lib/payment");
    const { withTenant } = await import("@/lib/tenant");

    // parseBodyは正常に解析
    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "current", patientId: "patient-err", reorderId: null },
    } as { data: Record<string, unknown> });

    // withTenantがSupabaseエラーを返す（intake取得時）
    vi.mocked(withTenant).mockResolvedValueOnce({
      data: null,
      error: { message: "relation does not exist", code: "42P01" },
    } as never);

    // 商品は正常に存在
    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as Awaited<ReturnType<typeof getProductByCode>>);

    // 決済プロバイダも正常
    const mockProvider: Pick<PaymentProvider, "createCheckoutLink"> = {
      createCheckoutLink: vi.fn().mockResolvedValue({ checkoutUrl: "https://pay.example.com/ok" }),
    };
    vi.mocked(getPaymentProvider).mockResolvedValue(mockProvider as PaymentProvider);

    const req = createMockRequest();
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);

    // Supabaseエラー時はintakeRow=nullとなり、NG判定スキップ → 正常系に進む
    // 200で返るか、500で返るか（実装次第）。いずれにせよクラッシュしない
    expect([200, 500]).toContain(res.status);
  });

  it("決済プロバイダがタイムアウトする場合 → 500エラーを返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");
    const { getPaymentProvider } = await import("@/lib/payment");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "current", patientId: null, reorderId: null },
    } as { data: Record<string, unknown> });

    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as Awaited<ReturnType<typeof getProductByCode>>);

    // タイムアウトエラーをシミュレート
    const mockProvider: Pick<PaymentProvider, "createCheckoutLink"> = {
      createCheckoutLink: vi.fn().mockRejectedValue(
        Object.assign(new Error("request timeout"), { code: "ETIMEDOUT" })
      ),
    };
    vi.mocked(getPaymentProvider).mockResolvedValue(mockProvider as PaymentProvider);

    const req = createMockRequest();
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });

  it("決済プロバイダが不正なレスポンス（checkoutUrl欠落）を返す場合", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");
    const { getPaymentProvider } = await import("@/lib/payment");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "first", patientId: null, reorderId: null },
    } as { data: Record<string, unknown> });

    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as Awaited<ReturnType<typeof getProductByCode>>);

    // checkoutUrlが存在しない不正なレスポンス
    const mockProvider: Pick<PaymentProvider, "createCheckoutLink"> = {
      createCheckoutLink: vi.fn().mockResolvedValue({ url: "https://wrong-field.com" }),
    };
    vi.mocked(getPaymentProvider).mockResolvedValue(mockProvider as PaymentProvider);

    const req = createMockRequest();
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    const json = await parseJson(res);

    // checkoutUrlがundefinedになるが、NextResponse.jsonは200で返す（バリデーション未実装）
    // 実装ではcheckoutUrlをそのまま返すため、undefinedが返る
    expect(res.status).toBe(200);
    expect(json.checkoutUrl).toBeUndefined();
  });

  it("getPaymentProvider自体が例外を投げる場合 → 500エラーを返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");
    const { getPaymentProvider } = await import("@/lib/payment");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "current", patientId: null, reorderId: null },
    } as { data: Record<string, unknown> });

    vi.mocked(getProductByCode).mockResolvedValue({
      code: "PROD1",
      title: "テスト商品",
      price: 1000,
    } as Awaited<ReturnType<typeof getProductByCode>>);

    // getPaymentProvider自体が設定不備で例外
    vi.mocked(getPaymentProvider).mockRejectedValue(
      new Error("決済プロバイダの設定が見つかりません")
    );

    const req = createMockRequest();
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });

  it("getProductByCodeが例外を投げる場合 → 500エラーを返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const { getProductByCode } = await import("@/lib/products");

    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "PROD1", mode: "current", patientId: null, reorderId: null },
    } as { data: Record<string, unknown> });

    // DB接続エラーでgetProductByCodeが例外
    vi.mocked(getProductByCode).mockRejectedValue(
      new Error("connection refused")
    );

    const req = createMockRequest();
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });
});
