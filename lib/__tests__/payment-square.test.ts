// lib/__tests__/payment-square.test.ts
// SquarePaymentProvider クラスのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// --- モック ---
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(),
}));

import { getSettingOrEnv } from "@/lib/settings";
const mockGetSettingOrEnv = vi.mocked(getSettingOrEnv);

// fetchモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { SquarePaymentProvider } from "@/lib/payment/square";

// --- ヘルパー ---
function defaultConfig(overrides: Record<string, string | undefined> = {}) {
  const config: Record<string, string | undefined> = {
    access_token: "sq-test-token",
    location_id: "LOC123",
    env: "sandbox",
    webhook_signature_key: "whsec_test_key",
    ...overrides,
  };
  mockGetSettingOrEnv.mockImplementation(
    async (_cat: string, key: string) => config[key],
  );
}

function defaultCheckoutParams() {
  return {
    productTitle: "ED治療薬セット",
    price: 5000,
    redirectUrl: "https://example.com/thanks",
    metadata: {
      patientId: "P001",
      productCode: "ED-SET",
      mode: "initial",
      reorderId: "R100",
    },
  };
}

// --- テスト ---
describe("SquarePaymentProvider — createCheckoutLink", () => {
  let provider: SquarePaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SquarePaymentProvider();
  });

  it("正常にcheckoutUrlを返す", async () => {
    defaultConfig();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payment_link: {
          id: "link_001",
          url: "https://square.link/pay/abc",
        },
      }),
    });

    const result = await provider.createCheckoutLink(defaultCheckoutParams());
    expect(result.checkoutUrl).toBe("https://square.link/pay/abc");
    expect(result.paymentLinkId).toBe("link_001");

    // fetchが正しいURLで呼ばれたか
    expect(mockFetch).toHaveBeenCalledWith(
      "https://connect.squareupsandbox.com/v2/online-checkout/payment-links",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("accessToken未設定→Errorをthrow", async () => {
    defaultConfig({ access_token: undefined });
    await expect(
      provider.createCheckoutLink(defaultCheckoutParams()),
    ).rejects.toThrow("Square configuration missing");
  });

  it("APIがエラーレスポンス→Errorをthrow", async () => {
    defaultConfig();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    await expect(
      provider.createCheckoutLink(defaultCheckoutParams()),
    ).rejects.toThrow("Failed to create Square checkout link");
  });

  it("payment_noteにメタデータが埋め込まれる", async () => {
    defaultConfig();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payment_link: { id: "link_002", url: "https://square.link/pay/xyz" },
      }),
    });

    await provider.createCheckoutLink(defaultCheckoutParams());

    // fetchに渡されたbodyを検証
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.payment_note).toBe("PID:P001;Product:ED-SET (initial);Reorder:R100");
  });
});

describe("SquarePaymentProvider — verifyWebhook", () => {
  let provider: SquarePaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SquarePaymentProvider();
  });

  it("payment.createdイベントを正しくパースする", async () => {
    defaultConfig({ webhook_signature_key: undefined });
    const eventBody = {
      type: "payment.created",
      data: {
        object: {
          payment: {
            id: "PAY_001",
            order_id: "ORD_001",
            amount_money: { amount: 5000, currency: "JPY" },
          },
        },
      },
    };
    const req = new Request("https://example.com/webhook", {
      method: "POST",
      body: JSON.stringify(eventBody),
    });

    const result = await provider.verifyWebhook(req);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("payment.created");
    expect(result!.paymentId).toBe("PAY_001");
    expect(result!.orderId).toBe("ORD_001");
    expect(result!.amount).toBe(5000);
    expect(result!.currency).toBe("JPY");
  });

  it("refund.createdイベントを正しくパースする", async () => {
    defaultConfig({ webhook_signature_key: undefined });
    const eventBody = {
      type: "refund.created",
      data: {
        object: {
          refund: {
            payment_id: "PAY_002",
            amount_money: { amount: 3000, currency: "JPY" },
          },
        },
      },
    };
    const req = new Request("https://example.com/webhook", {
      method: "POST",
      body: JSON.stringify(eventBody),
    });

    const result = await provider.verifyWebhook(req);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("refund.created");
    expect(result!.paymentId).toBe("PAY_002");
    expect(result!.amount).toBe(3000);
  });

  it("正しい署名で検証成功→イベントを返す", async () => {
    const signatureKey = "whsec_test_key_123";
    const notificationUrl = "https://example.com/api/square/webhook";
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = notificationUrl;
    defaultConfig({ webhook_signature_key: signatureKey });

    const eventBody = JSON.stringify({
      type: "payment.created",
      data: {
        object: {
          payment: {
            id: "PAY_SIG",
            order_id: "ORD_SIG",
            amount_money: { amount: 1000, currency: "JPY" },
          },
        },
      },
    });

    // 正しい署名を生成
    const hmac = crypto.createHmac("sha256", signatureKey);
    hmac.update(notificationUrl + eventBody);
    const validSignature = hmac.digest("base64");

    const req = new Request("https://example.com/webhook", {
      method: "POST",
      body: eventBody,
      headers: {
        "x-square-hmacsha256-signature": validSignature,
      },
    });

    const result = await provider.verifyWebhook(req);
    expect(result).not.toBeNull();
    expect(result!.paymentId).toBe("PAY_SIG");

    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  });

  it("署名不一致→nullを返す", async () => {
    const signatureKey = "whsec_test_key_123";
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = "https://example.com/api/square/webhook";
    defaultConfig({ webhook_signature_key: signatureKey });

    const eventBody = JSON.stringify({
      type: "payment.created",
      data: { object: { payment: { id: "PAY_BAD" } } },
    });

    const req = new Request("https://example.com/webhook", {
      method: "POST",
      body: eventBody,
      headers: {
        "x-square-hmacsha256-signature": "invalid-signature-base64",
      },
    });

    const result = await provider.verifyWebhook(req);
    expect(result).toBeNull();

    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  });

  it("未知のイベントタイプ→nullを返す", async () => {
    defaultConfig({ webhook_signature_key: undefined });
    const eventBody = {
      type: "catalog.version.updated",
      data: { object: {} },
    };
    const req = new Request("https://example.com/webhook", {
      method: "POST",
      body: JSON.stringify(eventBody),
    });

    const result = await provider.verifyWebhook(req);
    expect(result).toBeNull();
  });
});

describe("SquarePaymentProvider — processRefund", () => {
  let provider: SquarePaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SquarePaymentProvider();
  });

  it("全額返金（amount未指定）", async () => {
    defaultConfig();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        refund: { id: "REF_001", status: "COMPLETED" },
      }),
    });

    const result = await provider.processRefund("PAY_001");
    expect(result.success).toBe(true);
    expect(result.refundId).toBe("REF_001");
    expect(result.status).toBe("COMPLETED");

    // amount_moneyが含まれないことを確認
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.payment_id).toBe("PAY_001");
    expect(body.amount_money).toBeUndefined();
  });

  it("部分返金（amount指定）", async () => {
    defaultConfig();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        refund: { id: "REF_002", status: "PENDING" },
      }),
    });

    const result = await provider.processRefund("PAY_002", 2000);
    expect(result.success).toBe(true);
    expect(result.refundId).toBe("REF_002");

    // amount_moneyが含まれることを確認
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.amount_money).toEqual({ amount: 2000, currency: "JPY" });
  });

  it("accessToken未設定→{success:false}を返す", async () => {
    defaultConfig({ access_token: undefined });
    const result = await provider.processRefund("PAY_003");
    expect(result.success).toBe(false);
    expect(result.status).toContain("not configured");
    // fetchは呼ばれない
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
