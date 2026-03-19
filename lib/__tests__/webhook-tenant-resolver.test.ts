// lib/__tests__/webhook-tenant-resolver.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Supabaseモック
const mockSelect = vi.fn();
const mockEq1 = vi.fn();
const mockEq2 = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

// cryptoモック（decrypt）
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((val: string) => {
    // テスト用: "enc:" プレフィックス付きは復号、それ以外はそのまま
    if (val.startsWith("enc:")) return val.slice(4);
    throw new Error("not encrypted");
  }),
}));

import {
  resolveWebhookTenant,
  resolveLineTenantBySignature,
  resolveSquareTenantBySignatureKey,
  clearWebhookTenantCache,
} from "@/lib/webhook-tenant-resolver";
import { supabaseAdmin } from "@/lib/supabase";

describe("webhook-tenant-resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWebhookTenantCache();

    // デフォルトのチェーン設定
    mockSelect.mockReturnValue({ eq: mockEq1 });
    mockEq1.mockReturnValue({ eq: mockEq2 });
  });

  describe("resolveWebhookTenant", () => {
    it("値が一致するテナントIDを返す", async () => {
      mockEq2.mockResolvedValue({
        data: [
          { tenant_id: "tenant-a", value: "enc:shop-a" },
          { tenant_id: "tenant-b", value: "enc:shop-b" },
        ],
        error: null,
      });

      const result = await resolveWebhookTenant("gmo", "shop_id", "shop-b");
      expect(result).toBe("tenant-b");
    });

    it("一致しない場合はnullを返す", async () => {
      mockEq2.mockResolvedValue({
        data: [
          { tenant_id: "tenant-a", value: "enc:shop-a" },
        ],
        error: null,
      });

      const result = await resolveWebhookTenant("gmo", "shop_id", "shop-unknown");
      expect(result).toBeNull();
    });

    it("空のmatchValueではnullを返す", async () => {
      const result = await resolveWebhookTenant("gmo", "shop_id", "");
      expect(result).toBeNull();
      // DBクエリは実行されない
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
    });

    it("暗号化されていない値もフォールバックで比較する", async () => {
      mockEq2.mockResolvedValue({
        data: [
          { tenant_id: "tenant-plain", value: "plain-shop-id" },
        ],
        error: null,
      });

      const result = await resolveWebhookTenant("gmo", "shop_id", "plain-shop-id");
      expect(result).toBe("tenant-plain");
    });

    it("キャッシュが効いて2回目はDBクエリしない", async () => {
      mockEq2.mockResolvedValue({
        data: [{ tenant_id: "tenant-a", value: "enc:shop-a" }],
        error: null,
      });

      await resolveWebhookTenant("gmo", "shop_id", "shop-a");
      await resolveWebhookTenant("gmo", "shop_id", "shop-a");

      // from()は1回のみ呼ばれるべき（2回目はキャッシュ）
      expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
    });

    it("DBエラー時はnullを返す", async () => {
      mockEq2.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const result = await resolveWebhookTenant("gmo", "shop_id", "shop-a");
      expect(result).toBeNull();
    });
  });

  describe("resolveLineTenantBySignature", () => {
    it("正しいsecretで署名が一致するテナントを返す", async () => {
      const secret = "test-channel-secret";
      const body = '{"events":[]}';
      const sig = crypto.createHmac("sha256", secret).update(body).digest("base64");

      // messaging secretのクエリ
      mockEq2.mockResolvedValueOnce({
        data: [
          { tenant_id: "tenant-line-a", value: "enc:" + secret },
        ],
        error: null,
      });
      // notify secretのクエリ
      mockEq2.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await resolveLineTenantBySignature(body, sig);
      expect(result).toBe("tenant-line-a");
    });

    it("署名が一致しない場合はnullを返す", async () => {
      mockEq2.mockResolvedValueOnce({
        data: [
          { tenant_id: "tenant-line-a", value: "enc:wrong-secret" },
        ],
        error: null,
      });
      mockEq2.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await resolveLineTenantBySignature('{"events":[]}', "invalid-sig");
      expect(result).toBeNull();
    });

    it("空のrawBodyではnullを返す", async () => {
      const result = await resolveLineTenantBySignature("", "some-sig");
      expect(result).toBeNull();
    });

    it("notify_channel_secretでもマッチする", async () => {
      const secret = "notify-secret";
      const body = '{"events":[]}';
      const sig = crypto.createHmac("sha256", secret).update(body).digest("base64");

      // messaging secretのクエリ（マッチなし）
      mockEq2.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      // notify secretのクエリ
      mockEq2.mockResolvedValueOnce({
        data: [
          { tenant_id: "tenant-notify", value: "enc:" + secret },
        ],
        error: null,
      });

      const result = await resolveLineTenantBySignature(body, sig);
      expect(result).toBe("tenant-notify");
    });
  });

  describe("resolveSquareTenantBySignatureKey", () => {
    it("accounts JSON内のwebhook_signature_keyで署名一致するテナントを返す", async () => {
      const sigKey = "square-sig-key";
      const body = '{"type":"payment.completed"}';
      const notificationUrl = "https://example.com/api/square/webhook";
      const payload = notificationUrl + body;
      const expected = crypto.createHmac("sha256", sigKey).update(payload, "utf8").digest("base64");

      // accounts JSONクエリ
      mockEq2.mockResolvedValueOnce({
        data: [
          {
            tenant_id: "tenant-sq",
            value: "enc:" + JSON.stringify([{ webhook_signature_key: sigKey, id: "acc1" }]),
          },
        ],
        error: null,
      });

      const result = await resolveSquareTenantBySignatureKey(body, expected, notificationUrl);
      expect(result).toBe("tenant-sq");
    });

    it("旧形式の個別キーでもマッチする", async () => {
      const sigKey = "legacy-sig-key";
      const body = '{"type":"payment.completed"}';
      const notificationUrl = "https://example.com/api/square/webhook";
      const payload = notificationUrl + body;
      const expected = crypto.createHmac("sha256", sigKey).update(payload, "utf8").digest("base64");

      // accounts JSONクエリ（マッチなし）
      mockEq2.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      // 旧形式のwebhook_signature_keyクエリ
      mockEq2.mockResolvedValueOnce({
        data: [
          { tenant_id: "tenant-legacy", value: "enc:" + sigKey },
        ],
        error: null,
      });

      const result = await resolveSquareTenantBySignatureKey(body, expected, notificationUrl);
      expect(result).toBe("tenant-legacy");
    });

    it("空のsignatureHeaderではnullを返す", async () => {
      const result = await resolveSquareTenantBySignatureKey('{"body":true}', "", "https://example.com");
      expect(result).toBeNull();
    });
  });

  describe("clearWebhookTenantCache", () => {
    it("キャッシュクリア後はDBクエリが再実行される", async () => {
      mockEq2.mockResolvedValue({
        data: [{ tenant_id: "tenant-a", value: "enc:val" }],
        error: null,
      });

      await resolveWebhookTenant("gmo", "shop_id", "val");
      expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);

      clearWebhookTenantCache();

      await resolveWebhookTenant("gmo", "shop_id", "val");
      expect(supabaseAdmin.from).toHaveBeenCalledTimes(2);
    });
  });
});
