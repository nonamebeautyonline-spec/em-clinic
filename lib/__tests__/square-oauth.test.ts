// lib/__tests__/square-oauth.test.ts — Square OAuthライブラリのテスト
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 環境変数セットアップ
const ORIG_ENV = { ...process.env };

beforeEach(() => {
  process.env.SQUARE_OAUTH_CLIENT_ID = "sq0idp-test-client-id";
  process.env.SQUARE_OAUTH_CLIENT_SECRET = "sq0csp-test-client-secret";
  process.env.SQUARE_OAUTH_REDIRECT_URI = "https://l-ope.jp/api/admin/square-oauth/callback";
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

describe("Square OAuth ライブラリ", () => {
  describe("getSquareAuthUrl", () => {
    it("正しい認可URLを生成する", async () => {
      const { getSquareAuthUrl } = await import("@/lib/square-oauth");
      const url = getSquareAuthUrl("test-tenant-id");

      expect(url).toContain("https://connect.squareup.com/oauth2/authorize");
      expect(url).toContain("client_id=sq0idp-test-client-id");
      expect(url).toContain("response_type=code");
      expect(url).toContain("PAYMENTS_WRITE");
      expect(url).toContain("MERCHANT_PROFILE_READ");
      expect(url).toContain("state=");
    });
  });

  describe("decodeSquareState", () => {
    it("正しいstateをデコードできる", async () => {
      const { decodeSquareState } = await import("@/lib/square-oauth");
      const state = Buffer.from(
        JSON.stringify({ tenantId: "tid-123", ts: Date.now() })
      ).toString("base64url");

      const decoded = decodeSquareState(state);
      expect(decoded.tenantId).toBe("tid-123");
      expect(decoded.ts).toBeGreaterThan(0);
    });

    it("期限切れのstateを拒否する", async () => {
      const { decodeSquareState } = await import("@/lib/square-oauth");
      const state = Buffer.from(
        JSON.stringify({ tenantId: "tid-123", ts: Date.now() - 11 * 60 * 1000 })
      ).toString("base64url");

      expect(() => decodeSquareState(state)).toThrow("有効期限切れ");
    });

    it("不正なstateを拒否する", async () => {
      const { decodeSquareState } = await import("@/lib/square-oauth");
      expect(() => decodeSquareState("invalid-base64")).toThrow();
    });
  });

  describe("exchangeSquareCode", () => {
    it("トークン交換が成功する", async () => {
      const mockResponse = {
        access_token: "sq0atp-test-token",
        token_type: "bearer",
        expires_at: "2026-04-18T00:00:00Z",
        merchant_id: "MERCHANT_123",
        refresh_token: "sq0atr-test-refresh",
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }));

      const { exchangeSquareCode } = await import("@/lib/square-oauth");
      const result = await exchangeSquareCode("test-auth-code");

      expect(result.access_token).toBe("sq0atp-test-token");
      expect(result.merchant_id).toBe("MERCHANT_123");
      expect(result.refresh_token).toBe("sq0atr-test-refresh");

      // fetchが正しいパラメータで呼ばれたか確認
      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall[0]).toBe("https://connect.squareup.com/oauth2/token");
      const body = JSON.parse((fetchCall[1] as RequestInit).body as string);
      expect(body.grant_type).toBe("authorization_code");
      expect(body.code).toBe("test-auth-code");
    });

    it("トークン交換が失敗した場合エラーをthrow", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("invalid_grant"),
      }));

      const { exchangeSquareCode } = await import("@/lib/square-oauth");
      await expect(exchangeSquareCode("bad-code")).rejects.toThrow("トークン交換エラー");
    });
  });

  describe("refreshSquareToken", () => {
    it("トークンリフレッシュが成功する", async () => {
      const mockResponse = {
        access_token: "sq0atp-new-token",
        token_type: "bearer",
        expires_at: "2026-05-18T00:00:00Z",
        merchant_id: "MERCHANT_123",
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }));

      const { refreshSquareToken } = await import("@/lib/square-oauth");
      const result = await refreshSquareToken("sq0atr-old-refresh");

      expect(result.access_token).toBe("sq0atp-new-token");

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
      expect(body.grant_type).toBe("refresh_token");
      expect(body.refresh_token).toBe("sq0atr-old-refresh");
    });
  });

  describe("fetchSquareLocations", () => {
    it("アクティブなロケーションのみ返す", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          locations: [
            { id: "LOC_1", name: "本店", status: "ACTIVE" },
            { id: "LOC_2", name: "支店", status: "INACTIVE" },
            { id: "LOC_3", name: "新店", status: "ACTIVE" },
          ],
        }),
      }));

      const { fetchSquareLocations } = await import("@/lib/square-oauth");
      const locations = await fetchSquareLocations("test-token");

      expect(locations).toHaveLength(2);
      expect(locations[0].id).toBe("LOC_1");
      expect(locations[1].id).toBe("LOC_3");
    });
  });

  describe("getSquareApplicationId", () => {
    it("クライアントIDを返す", async () => {
      const { getSquareApplicationId } = await import("@/lib/square-oauth");
      expect(getSquareApplicationId()).toBe("sq0idp-test-client-id");
    });
  });
});
