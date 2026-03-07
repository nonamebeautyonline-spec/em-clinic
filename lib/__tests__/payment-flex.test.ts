// lib/__tests__/payment-flex.test.ts
// 決済案内Flexメッセージのビルド・送信テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_FLEX_CONFIG } from "@/lib/flex-message/types";

// --- モック ---
vi.mock("@/lib/flex-message/config", () => ({
  getFlexConfig: vi.fn().mockResolvedValue(DEFAULT_FLEX_CONFIG),
}));

const mockInsert = vi.fn().mockReturnValue({ error: null });
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({ insert: mockInsert })),
  },
}));

const mockPushMessage = vi.fn();
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tid: string | null) => ({ tenant_id: tid || null }),
}));

// --- テスト ---
describe("payment-flex: buildPaymentFlex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bubble構造（type:bubble, header, body）を生成する", async () => {
    const { buildPaymentFlex } = await import("@/lib/payment-flex");

    const result = await buildPaymentFlex();

    expect(result.type).toBe("flex");
    expect(result.altText).toContain(DEFAULT_FLEX_CONFIG.payment.header);

    const bubble = result.contents;
    expect(bubble.type).toBe("bubble");
    expect(bubble.header).toBeDefined();
    expect(bubble.body).toBeDefined();
  });

  it("ヘッダーにpayment.headerが表示される", async () => {
    const { buildPaymentFlex } = await import("@/lib/payment-flex");

    const result = await buildPaymentFlex();
    const bubble = result.contents as Record<string, unknown>;
    const header = bubble.header as { contents: { text: string }[] };
    expect(header.contents[0].text).toBe(DEFAULT_FLEX_CONFIG.payment.header);
  });

  it("bodyにpayment.bodyが含まれる", async () => {
    const { buildPaymentFlex } = await import("@/lib/payment-flex");

    const result = await buildPaymentFlex();
    const bubble = result.contents as Record<string, unknown>;
    const body = bubble.body as { contents: { text: string }[] };
    expect(body.contents[0].text).toBe(DEFAULT_FLEX_CONFIG.payment.body);
  });
});

describe("payment-flex: sendPaymentNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pushMessage成功 → status=sent でログ記録", async () => {
    mockPushMessage.mockResolvedValue({ ok: true });
    const { sendPaymentNotification } = await import("@/lib/payment-flex");

    const result = await sendPaymentNotification({
      patientId: "p-123",
      lineUid: "U123abc",
    });

    expect(result.ok).toBe(true);
    expect(mockPushMessage).toHaveBeenCalledWith("U123abc", expect.any(Array), undefined);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "p-123",
        line_uid: "U123abc",
        message_type: "payment_notify",
        status: "sent",
      }),
    );
  });

  it("pushMessage失敗（ok:false） → status=failed でログ記録", async () => {
    mockPushMessage.mockResolvedValue({ ok: false });
    const { sendPaymentNotification } = await import("@/lib/payment-flex");

    const result = await sendPaymentNotification({
      patientId: "p-456",
      lineUid: "U456def",
    });

    expect(result.ok).toBe(false);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message_type: "payment_notify",
        status: "failed",
      }),
    );
  });

  it("pushMessage例外 → failed ログ記録 + ok:false", async () => {
    mockPushMessage.mockRejectedValue(new Error("network error"));
    const { sendPaymentNotification } = await import("@/lib/payment-flex");

    const result = await sendPaymentNotification({
      patientId: "p-789",
      lineUid: "U789ghi",
    });

    expect(result.ok).toBe(false);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: expect.stringContaining("network error"),
      }),
    );
  });

  it("tenantId渡し → pushMessageとログに反映される", async () => {
    mockPushMessage.mockResolvedValue({ ok: true });
    const { sendPaymentNotification } = await import("@/lib/payment-flex");

    await sendPaymentNotification({
      patientId: "p-t1",
      lineUid: "Ut1",
      tenantId: "tenant-abc",
    });

    expect(mockPushMessage).toHaveBeenCalledWith("Ut1", expect.any(Array), "tenant-abc");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-abc",
      }),
    );
  });
});
