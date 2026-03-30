// __tests__/api/stripe-webhook-advanced.test.ts
// Stripe Webhook の高度テスト: 例外処理・markFailed・テナント解決・通知・不明イベント
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Supabase モック ---
function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = [
    "from", "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
    "like", "ilike", "contains", "containedBy", "filter", "or",
    "order", "limit", "range", "single", "maybeSingle", "match",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) =>
    resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

let mockFromChains: Record<string, ReturnType<typeof createMockChain>> = {};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (!mockFromChains[table]) mockFromChains[table] = createMockChain();
      return mockFromChains[table];
    }),
  },
}));

vi.mock("@/lib/stripe", () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/idempotency", () => ({
  checkIdempotency: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
}));

vi.mock("@/lib/webhook-tenant-resolver", () => ({
  resolveWebhookTenant: vi.fn(),
}));

vi.mock("@/lib/webhook-handlers/stripe", () => ({
  processStripeEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/webhook-failure", () => ({
  notifyWebhookFailure: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/stripe/webhook/route";
import { verifyWebhookSignature } from "@/lib/stripe";
import { checkIdempotency } from "@/lib/idempotency";
import { resolveTenantId } from "@/lib/tenant";
import { resolveWebhookTenant } from "@/lib/webhook-tenant-resolver";
import { processStripeEvent } from "@/lib/webhook-handlers/stripe";
import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";
import { supabaseAdmin } from "@/lib/supabase";

function createRequest(body: string = "{}", sig: string | null = "test_sig"): NextRequest {
  const headers: Record<string, string> = {};
  if (sig !== null) headers["stripe-signature"] = sig;
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  });
}

function setupDefaultMocks(tenantId = "tenant_001") {
  vi.mocked(verifyWebhookSignature).mockResolvedValue({
    id: "evt_default",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_001", amount: 13000 } },
  });
  vi.mocked(resolveTenantId).mockReturnValue(null);
  vi.mocked(resolveWebhookTenant).mockResolvedValue(tenantId);
  vi.mocked(processStripeEvent).mockResolvedValue(undefined);
  vi.mocked(notifyWebhookFailure).mockResolvedValue(undefined);

  const markCompleted = vi.fn().mockResolvedValue(undefined);
  const markFailed = vi.fn().mockResolvedValue(undefined);
  vi.mocked(checkIdempotency).mockResolvedValue({
    duplicate: false,
    markCompleted,
    markFailed,
  });
}

describe("Stripe Webhook 高度テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromChains = {};
    setupDefaultMocks();
  });

  // === processStripeEvent の例外処理 ===
  describe("processStripeEvent の例外処理", () => {
    it("processStripeEventの例外で500を返す", async () => {
      vi.mocked(processStripeEvent).mockRejectedValue(new Error("Stripe処理エラー"));

      const res = await POST(createRequest());
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error).toContain("処理エラー");
    });

    it("processStripeEventの非Errorオブジェクト例外でも500を返す", async () => {
      vi.mocked(processStripeEvent).mockRejectedValue("文字列例外");

      const res = await POST(createRequest());
      expect(res.status).toBe(500);
    });

    it("processStripeEvent成功後にmarkCompletedが呼ばれる", async () => {
      const markCompleted = vi.fn().mockResolvedValue(undefined);
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted,
        markFailed: vi.fn(),
      });

      await POST(createRequest());
      expect(markCompleted).toHaveBeenCalled();
    });

    it("processStripeEvent成功時にmarkFailedは呼ばれない", async () => {
      const markFailed = vi.fn();
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted: vi.fn().mockResolvedValue(undefined),
        markFailed,
      });

      await POST(createRequest());
      expect(markFailed).not.toHaveBeenCalled();
    });
  });

  // === markFailed の呼び出し確認 ===
  describe("markFailed の呼び出し確認", () => {
    it("Error例外時にmarkFailedにエラーメッセージが渡される", async () => {
      const markFailed = vi.fn().mockResolvedValue(undefined);
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted: vi.fn(),
        markFailed,
      });
      vi.mocked(processStripeEvent).mockRejectedValue(new Error("DB接続タイムアウト"));

      await POST(createRequest());
      expect(markFailed).toHaveBeenCalledWith("DB接続タイムアウト");
    });

    it("非Error例外時にmarkFailedに'unknown error'が渡される", async () => {
      const markFailed = vi.fn().mockResolvedValue(undefined);
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted: vi.fn(),
        markFailed,
      });
      vi.mocked(processStripeEvent).mockRejectedValue(42);

      await POST(createRequest());
      expect(markFailed).toHaveBeenCalledWith("unknown error");
    });

    it("markFailed自体がエラーを投げるとawaitされているため伝播する", async () => {
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted: vi.fn(),
        markFailed: vi.fn().mockRejectedValue(new Error("markFailed crash")),
      });
      vi.mocked(processStripeEvent).mockRejectedValue(new Error("元エラー"));

      // await idem.markFailed() がrejectするとPOST自体もrejectする
      await expect(POST(createRequest())).rejects.toThrow("markFailed crash");
    });
  });

  // === テナント解決 (resolveWebhookTenant) 失敗時 ===
  describe("テナント解決失敗", () => {
    it("テナント解決失敗時はwebhook_eventsに記録して200を返す", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue(null);

      const webhookEventsChain = createMockChain(null, null);
      mockFromChains["webhook_events"] = webhookEventsChain;

      const res = await POST(createRequest());
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.received).toBe(true);

      // webhook_eventsにINSERT
      expect(supabaseAdmin.from).toHaveBeenCalledWith("webhook_events");
      expect(webhookEventsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_source: "stripe",
          status: "failed",
          payload: expect.objectContaining({
            event_type: "payment_intent.succeeded",
            event_id: "evt_default",
          }),
        }),
      );
    });

    it("テナント解決失敗 + DB記録エラーでも200を返す", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue(null);

      const failChain = createMockChain(null, null);
      failChain.insert = vi.fn().mockRejectedValue(new Error("DB unavailable"));
      mockFromChains["webhook_events"] = failChain;

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });

    it("テナント解決失敗時はprocessStripeEventは呼ばれない", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue(null);

      await POST(createRequest());
      expect(processStripeEvent).not.toHaveBeenCalled();
    });

    it("テナント解決失敗時はcheckIdempotencyは呼ばれない", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue(null);

      await POST(createRequest());
      expect(checkIdempotency).not.toHaveBeenCalled();
    });

    it("ヘッダーのテナントIDが優先される", async () => {
      vi.mocked(resolveTenantId).mockReturnValue("header_tenant");

      await POST(createRequest());

      // resolveWebhookTenantは呼ばれない
      expect(resolveWebhookTenant).not.toHaveBeenCalled();
      expect(checkIdempotency).toHaveBeenCalledWith(
        "stripe",
        "evt_default",
        "header_tenant",
        expect.any(Object),
      );
    });

    it("ヘッダーなし・逆引き成功時のテナントIDで冪等チェック", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue("resolved_tenant");

      await POST(createRequest());

      expect(checkIdempotency).toHaveBeenCalledWith(
        "stripe",
        "evt_default",
        "resolved_tenant",
        expect.any(Object),
      );
    });
  });

  // === notifyWebhookFailure の呼び出し条件 ===
  describe("notifyWebhookFailure の呼び出し条件", () => {
    it("processStripeEvent例外時にnotifyWebhookFailureが呼ばれる", async () => {
      const error = new Error("処理失敗");
      vi.mocked(processStripeEvent).mockRejectedValue(error);

      await POST(createRequest());

      expect(notifyWebhookFailure).toHaveBeenCalledWith(
        "stripe",
        "evt_default",
        error,
        "tenant_001",
      );
    });

    it("正常処理時にnotifyWebhookFailureは呼ばれない", async () => {
      await POST(createRequest());
      expect(notifyWebhookFailure).not.toHaveBeenCalled();
    });

    it("重複イベント時にnotifyWebhookFailureは呼ばれない", async () => {
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: true,
        markCompleted: vi.fn(),
        markFailed: vi.fn(),
      });

      await POST(createRequest());
      expect(notifyWebhookFailure).not.toHaveBeenCalled();
    });

    it("notifyWebhookFailureがrejectしてもレスポンスに影響しない（fire-and-forget）", async () => {
      vi.mocked(processStripeEvent).mockRejectedValue(new Error("error"));
      vi.mocked(notifyWebhookFailure).mockRejectedValue(new Error("通知失敗"));

      const res = await POST(createRequest());
      // notifyWebhookFailure は .catch(() => {}) で握りつぶされるので500が返る
      expect(res.status).toBe(500);
    });
  });

  // === 不明イベント型の処理 ===
  describe("不明イベント型の処理", () => {
    it("不明なイベント型でもprocessStripeEventに渡され200を返す", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        id: "evt_unknown",
        type: "completely.unknown.event.type",
        data: { object: {} },
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);

      expect(processStripeEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "completely.unknown.event.type" }),
      );
    });

    it("checkout.session.completed イベントが処理される", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        id: "evt_checkout",
        type: "checkout.session.completed",
        data: { object: { id: "cs_001", payment_intent: "pi_001" } },
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
      expect(processStripeEvent).toHaveBeenCalled();
    });

    it("charge.refunded イベントが処理される", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        id: "evt_refund",
        type: "charge.refunded",
        data: { object: { id: "ch_001", amount_refunded: 5000 } },
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
      expect(processStripeEvent).toHaveBeenCalled();
    });
  });

  // === 署名関連の追加テスト ===
  describe("署名検証の追加ケース", () => {
    it("署名ヘッダーなしで400を返す", async () => {
      const req = createRequest("{}", null);
      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("署名");
    });

    it("署名検証失敗（null返却）で400を返す", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue(null);

      const res = await POST(createRequest());
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain("署名検証失敗");
    });

    it("署名検証失敗時はprocessStripeEventは呼ばれない", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue(null);

      await POST(createRequest());
      expect(processStripeEvent).not.toHaveBeenCalled();
      expect(checkIdempotency).not.toHaveBeenCalled();
    });
  });

  // === 冪等性の追加テスト ===
  describe("冪等性チェックの追加ケース", () => {
    it("冪等チェックにイベントIDとペイロードが正しく渡される", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue({
        id: "evt_specific",
        type: "invoice.paid",
        data: { object: { id: "inv_001", amount_paid: 17000 } },
      });

      await POST(createRequest());

      expect(checkIdempotency).toHaveBeenCalledWith(
        "stripe",
        "evt_specific",
        "tenant_001",
        {
          type: "invoice.paid",
          data: { id: "inv_001", amount_paid: 17000 },
        },
      );
    });

    it("重複イベントでduplicate:trueのレスポンス", async () => {
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: true,
        markCompleted: vi.fn(),
        markFailed: vi.fn(),
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.received).toBe(true);
      expect(body.duplicate).toBe(true);
    });

    it("重複イベント時にprocessStripeEventは呼ばれない", async () => {
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: true,
        markCompleted: vi.fn(),
        markFailed: vi.fn(),
      });

      await POST(createRequest());
      expect(processStripeEvent).not.toHaveBeenCalled();
    });
  });

  // === resolveWebhookTenantの呼び出し引数 ===
  describe("resolveWebhookTenant の呼び出し", () => {
    it("paymentカテゴリ + stripe_webhook_secret + signatureで逆引き", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);

      const req = createRequest("{}", "whsec_test_signature");
      await POST(req);

      expect(resolveWebhookTenant).toHaveBeenCalledWith(
        "payment",
        "stripe_webhook_secret",
        "whsec_test_signature",
      );
    });
  });
});
