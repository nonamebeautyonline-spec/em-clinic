// __tests__/lib/google-calendar.test.ts
// Google Calendar ライブラリのユニットテスト
// REST API呼び出しのモック、トークンリフレッシュテスト

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 環境変数をモック
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/admin/google-calendar/callback");

// globalのfetchをモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("google-calendar ライブラリ", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAuthUrl", () => {
    it("正しいOAuth2認証URLを生成する", async () => {
      const { getAuthUrl } = await import("@/lib/google-calendar");

      const url = getAuthUrl("tenant-123", "doctor-456");

      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=");
      expect(url).toContain("access_type=offline");
      expect(url).toContain("prompt=consent");
      expect(url).toContain("state=");
    });

    it("stateにテナントIDと医師IDがエンコードされている", async () => {
      const { getAuthUrl, decodeState } = await import("@/lib/google-calendar");

      const url = getAuthUrl("tenant-abc", "doctor-xyz");
      const stateParam = new URL(url).searchParams.get("state");
      expect(stateParam).toBeTruthy();

      const decoded = decodeState(stateParam!);
      expect(decoded.tenantId).toBe("tenant-abc");
      expect(decoded.doctorId).toBe("doctor-xyz");
    });
  });

  describe("decodeState", () => {
    it("正しいstateをデコードできる", async () => {
      const { decodeState } = await import("@/lib/google-calendar");

      const state = Buffer.from(
        JSON.stringify({ tenantId: "t1", doctorId: "d1" })
      ).toString("base64url");

      const result = decodeState(state);
      expect(result.tenantId).toBe("t1");
      expect(result.doctorId).toBe("d1");
    });

    it("不正なstateでエラーを投げる", async () => {
      const { decodeState } = await import("@/lib/google-calendar");

      expect(() => decodeState("invalid-base64")).toThrow("stateのデコードに失敗しました");
    });

    it("tenantIdがないstateでエラーを投げる", async () => {
      const { decodeState } = await import("@/lib/google-calendar");

      const state = Buffer.from(
        JSON.stringify({ doctorId: "d1" })
      ).toString("base64url");

      expect(() => decodeState(state)).toThrow("tenantIdまたはdoctorIdがありません");
    });
  });

  describe("exchangeCode", () => {
    it("認証コードをトークンに交換できる", async () => {
      const { exchangeCode } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "https://www.googleapis.com/auth/calendar",
        }),
      });

      const result = await exchangeCode("test-auth-code");

      expect(result.access_token).toBe("mock-access-token");
      expect(result.refresh_token).toBe("mock-refresh-token");
      expect(result.expires_in).toBe(3600);

      // fetchが正しいパラメータで呼ばれたか確認
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect(options.method).toBe("POST");
      expect(options.body.toString()).toContain("code=test-auth-code");
      expect(options.body.toString()).toContain("grant_type=authorization_code");
    });

    it("トークン交換失敗時にエラーを投げる", async () => {
      const { exchangeCode } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"error": "invalid_grant"}',
      });

      await expect(exchangeCode("invalid-code")).rejects.toThrow("Google OAuth2 トークン交換エラー");
    });
  });

  describe("refreshAccessToken", () => {
    it("リフレッシュトークンでアクセストークンを更新できる", async () => {
      const { refreshAccessToken } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "https://www.googleapis.com/auth/calendar",
        }),
      });

      const result = await refreshAccessToken("mock-refresh-token");

      expect(result.access_token).toBe("new-access-token");
      expect(result.expires_in).toBe(3600);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect(options.body.toString()).toContain("refresh_token=mock-refresh-token");
      expect(options.body.toString()).toContain("grant_type=refresh_token");
    });

    it("リフレッシュ失敗時にエラーを投げる", async () => {
      const { refreshAccessToken } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"error": "invalid_grant"}',
      });

      await expect(refreshAccessToken("expired-token")).rejects.toThrow("Google OAuth2 トークンリフレッシュエラー");
    });
  });

  describe("listEvents", () => {
    it("カレンダーイベント一覧を取得できる", async () => {
      const { listEvents } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "event-1",
              summary: "ミーティング",
              start: { dateTime: "2026-02-27T10:00:00+09:00" },
              end: { dateTime: "2026-02-27T11:00:00+09:00" },
              status: "confirmed",
            },
            {
              id: "event-2",
              summary: "ランチ",
              start: { dateTime: "2026-02-27T12:00:00+09:00" },
              end: { dateTime: "2026-02-27T13:00:00+09:00" },
              status: "confirmed",
            },
          ],
        }),
      });

      const events = await listEvents(
        "mock-token",
        "primary",
        "2026-02-27T00:00:00+09:00",
        "2026-02-28T00:00:00+09:00"
      );

      expect(events).toHaveLength(2);
      expect(events[0].summary).toBe("ミーティング");
      expect(events[1].summary).toBe("ランチ");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("calendars/primary/events");
      expect(url).toContain("singleEvents=true");
      expect(url).toContain("orderBy=startTime");
    });

    it("ページネーション対応でイベントを取得できる", async () => {
      const { listEvents } = await import("@/lib/google-calendar");

      // ページ1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: "event-1", summary: "イベント1", start: {}, end: {} }],
          nextPageToken: "page2token",
        }),
      });

      // ページ2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: "event-2", summary: "イベント2", start: {}, end: {} }],
        }),
      });

      const events = await listEvents(
        "mock-token",
        "primary",
        "2026-02-27T00:00:00+09:00",
        "2026-02-28T00:00:00+09:00"
      );

      expect(events).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // 2回目のfetchにpageTokenが含まれている
      const [url2] = mockFetch.mock.calls[1];
      expect(url2).toContain("pageToken=page2token");
    });

    it("API呼び出し失敗時にエラーを投げる", async () => {
      const { listEvents } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"error": "unauthorized"}',
      });

      await expect(
        listEvents("invalid-token", "primary", "2026-02-27T00:00:00+09:00", "2026-02-28T00:00:00+09:00")
      ).rejects.toThrow("Google Calendar イベント取得エラー");
    });
  });

  describe("insertEvent", () => {
    it("イベントを追加できる", async () => {
      const { insertEvent } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "new-event-id",
          summary: "[予約] 田中太郎",
          start: { dateTime: "2026-02-27T10:00:00+09:00" },
          end: { dateTime: "2026-02-27T10:30:00+09:00" },
          status: "confirmed",
        }),
      });

      const result = await insertEvent("mock-token", "primary", {
        summary: "[予約] 田中太郎",
        start: { dateTime: "2026-02-27T10:00:00+09:00", timeZone: "Asia/Tokyo" },
        end: { dateTime: "2026-02-27T10:30:00+09:00", timeZone: "Asia/Tokyo" },
      });

      expect(result.id).toBe("new-event-id");
      expect(result.summary).toBe("[予約] 田中太郎");

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("calendars/primary/events");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("イベント追加失敗時にエラーを投げる", async () => {
      const { insertEvent } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => '{"error": "forbidden"}',
      });

      await expect(
        insertEvent("mock-token", "primary", {
          summary: "テスト",
          start: { dateTime: "2026-02-27T10:00:00+09:00" },
          end: { dateTime: "2026-02-27T10:30:00+09:00" },
        })
      ).rejects.toThrow("Google Calendar イベント追加エラー");
    });
  });

  describe("deleteEvent", () => {
    it("イベントを削除できる", async () => {
      const { deleteEvent } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      // エラーなしで正常終了することを確認
      await expect(deleteEvent("mock-token", "primary", "event-id")).resolves.toBeUndefined();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("calendars/primary/events/event-id");
      expect(options.method).toBe("DELETE");
    });

    it("既に削除済み（410 Gone）でもエラーにならない", async () => {
      const { deleteEvent } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
        text: async () => "Gone",
      });

      await expect(deleteEvent("mock-token", "primary", "deleted-event")).resolves.toBeUndefined();
    });

    it("その他のエラーではエラーを投げる", async () => {
      const { deleteEvent } = await import("@/lib/google-calendar");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '{"error": "internal_error"}',
      });

      await expect(deleteEvent("mock-token", "primary", "event-id")).rejects.toThrow(
        "Google Calendar イベント削除エラー"
      );
    });
  });

  describe("calculateTokenExpiry", () => {
    it("有効期限を正しく計算する", async () => {
      const { calculateTokenExpiry } = await import("@/lib/google-calendar");

      const now = Date.now();
      const expiresIn = 3600; // 1時間
      const result = calculateTokenExpiry(expiresIn);
      const resultDate = new Date(result).getTime();

      // 1時間後（±5秒の許容誤差）
      expect(resultDate).toBeGreaterThan(now + (expiresIn - 5) * 1000);
      expect(resultDate).toBeLessThan(now + (expiresIn + 5) * 1000);
    });
  });
});
