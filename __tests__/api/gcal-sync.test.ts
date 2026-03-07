// __tests__/api/gcal-sync.test.ts
// Google Calendar 双方向同期のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================
// モック設定
// =============================================

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// テーブルごとの結果ストア
let tableResults: Record<string, { data: unknown; error: unknown }> = {};

/**
 * Supabaseチェインモック
 * 全メソッドが自身を返し（thenableとして機能）、
 * await時に tableResults から結果を返す
 */
function buildChain(tableName: string) {
  const getResult = () =>
    tableResults[tableName] ?? { data: null, error: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};

  // 全チェインメソッド → 自身を返す
  for (const m of [
    "select", "insert", "update", "delete",
    "eq", "neq", "not", "gte", "lte", "lt", "gt",
    "limit", "maybeSingle", "single",
    "is", "in",
  ]) {
    chain[m] = vi.fn(() => chain);
  }

  // thenable対応: await chain → getResult()
  chain.then = (resolve: (v: unknown) => void) => {
    resolve(getResult());
    return chain;
  };

  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => buildChain(table)),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: <T>(query: T): T => query,
  tenantPayload: (tenantId: string | null) => ({
    tenant_id: tenantId || "00000000-0000-0000-0000-000000000001",
  }),
  resolveTenantId: () => "test-tenant-id",
  DEFAULT_TENANT_ID: "00000000-0000-0000-0000-000000000001",
}));

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn(() => ({ acquired: true, release: vi.fn() })),
}));

const mockInsertEvent = vi.fn(() =>
  Promise.resolve({
    id: "gcal-event-123",
    summary: "[予約] テスト患者",
    start: { dateTime: "2026-03-10T10:00:00+09:00" },
    end: { dateTime: "2026-03-10T10:30:00+09:00" },
  })
);
const mockDeleteEvent = vi.fn(() => Promise.resolve());

vi.mock("@/lib/google-calendar", () => ({
  refreshAccessToken: vi.fn(() =>
    Promise.resolve({
      access_token: "new-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/calendar",
    })
  ),
  calculateTokenExpiry: vi.fn(() => "2026-03-08T12:00:00.000Z"),
  insertEvent: (...args: unknown[]) => mockInsertEvent(...args),
  deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args),
}));

vi.mock("@/lib/api-error", () => ({
  unauthorized: vi.fn(() =>
    new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
      status: 401,
    })
  ),
  serverError: vi.fn((msg: string) =>
    new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 })
  ),
  badRequest: vi.fn((msg: string) =>
    new Response(JSON.stringify({ ok: false, error: msg }), { status: 400 })
  ),
}));

// =============================================
// テスト用定数
// =============================================

const TEST_TENANT_ID = "test-tenant-id";
const TEST_DOCTOR = {
  doctor_id: "doc-001",
  google_calendar_id: "primary",
  google_access_token: "valid-access-token",
  google_refresh_token: "valid-refresh-token",
  google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
};

// =============================================
// テスト
// =============================================

describe("Google Calendar 双方向同期", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockInsertEvent.mockClear();
    mockDeleteEvent.mockClear();

    tableResults = {
      doctors: { data: [TEST_DOCTOR], error: null },
      google_calendar_sync_tokens: { data: null, error: null },
      reservations: { data: null, error: null },
      tenants: { data: [{ id: TEST_TENANT_ID }], error: null },
    };

    process.env.CRON_SECRET = "test-cron-secret";
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI =
      "http://localhost:3000/api/admin/google-calendar/callback";
  });

  // =============================================
  // syncReservationToGcal
  // =============================================
  describe("syncReservationToGcal", () => {
    it("予約をGCalイベントとして作成する", async () => {
      const { syncReservationToGcal } = await import(
        "@/lib/google-calendar-sync"
      );

      const reservation = {
        reserve_id: "rsv-001",
        patient_name: "テスト患者",
        reserved_date: "2026-03-10",
        reserved_time: "10:00",
        status: "confirmed",
        prescription_menu: "GLP-1",
      };

      const eventId = await syncReservationToGcal(
        TEST_TENANT_ID,
        reservation
      );

      expect(eventId).toBe("gcal-event-123");
      expect(mockInsertEvent).toHaveBeenCalledWith(
        "valid-access-token",
        "primary",
        expect.objectContaining({
          summary: "[予約] テスト患者",
          description: expect.stringContaining("reserve_id:rsv-001"),
        })
      );
    });

    it("Google連携未設定の場合はnullを返す", async () => {
      tableResults.doctors = { data: [], error: null };

      const { syncReservationToGcal } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await syncReservationToGcal(TEST_TENANT_ID, {
        reserve_id: "rsv-002",
        reserved_date: "2026-03-10",
        reserved_time: "10:00",
      });

      expect(result).toBeNull();
    });

    it("既存のgcal_event_idがある場合はPATCHで更新する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "existing-event-id",
            summary: "[予約] 更新テスト",
          }),
      });

      const { syncReservationToGcal } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await syncReservationToGcal(TEST_TENANT_ID, {
        reserve_id: "rsv-003",
        patient_name: "更新テスト",
        reserved_date: "2026-03-10",
        reserved_time: "14:00",
        gcal_event_id: "existing-event-id",
      });

      expect(result).toBe("existing-event-id");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/events/existing-event-id"),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  // =============================================
  // deleteGcalEvent
  // =============================================
  describe("deleteGcalEvent", () => {
    it("GCalイベントを削除する", async () => {
      const { deleteGcalEvent } = await import(
        "@/lib/google-calendar-sync"
      );

      await deleteGcalEvent(TEST_TENANT_ID, "event-to-delete");

      expect(mockDeleteEvent).toHaveBeenCalledWith(
        "valid-access-token",
        "primary",
        "event-to-delete"
      );
    });

    it("Google連携未設定の場合は何もしない", async () => {
      tableResults.doctors = { data: [], error: null };

      const { deleteGcalEvent } = await import(
        "@/lib/google-calendar-sync"
      );

      await deleteGcalEvent(TEST_TENANT_ID, "event-to-delete");

      expect(mockDeleteEvent).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // processGcalChanges
  // =============================================
  describe("processGcalChanges", () => {
    it("GCalからのイベント変更を取得して処理する（初回フルスキャン）", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "gcal-event-1",
                summary: "[予約] テスト患者",
                description: "reserve_id:rsv-100",
                start: { dateTime: "2026-03-10T10:00:00+09:00" },
                end: { dateTime: "2026-03-10T10:30:00+09:00" },
                status: "confirmed",
              },
            ],
            nextSyncToken: "new-sync-token-abc",
          }),
      });

      tableResults.reservations = {
        data: {
          reserve_id: "rsv-100",
          reserved_date: "2026-03-10",
          reserved_time: "10:00",
          status: "confirmed",
        },
        error: null,
      };

      const { processGcalChanges } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await processGcalChanges(TEST_TENANT_ID);

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);
    });

    it("em-clinic由来でないイベントはスキップする", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "external-event",
                summary: "個人の予定",
                start: { dateTime: "2026-03-10T12:00:00+09:00" },
                end: { dateTime: "2026-03-10T13:00:00+09:00" },
                status: "confirmed",
              },
            ],
            nextSyncToken: "sync-token-2",
          }),
      });

      const { processGcalChanges } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await processGcalChanges(TEST_TENANT_ID);

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);
    });

    it("キャンセルされたGCalイベントは予約をキャンセルする", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "cancelled-event",
                summary: "[予約] キャンセル患者",
                description: "reserve_id:rsv-cancel",
                status: "cancelled",
              },
            ],
            nextSyncToken: "sync-token-cancel",
          }),
      });

      tableResults.reservations = {
        data: {
          reserve_id: "rsv-cancel",
          reserved_date: "2026-03-10",
          reserved_time: "10:00",
          status: "confirmed",
        },
        error: null,
      };

      const { processGcalChanges } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await processGcalChanges(TEST_TENANT_ID);

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);
    });

    it("Google連携未設定の場合は0件で返す", async () => {
      tableResults.doctors = { data: [], error: null };

      const { processGcalChanges } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await processGcalChanges(TEST_TENANT_ID);

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  // =============================================
  // setupWatchChannel
  // =============================================
  describe("setupWatchChannel", () => {
    it("push通知チャンネルを設定する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "gcal-sync-test-tenant-id-12345",
            expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }),
      });

      const { setupWatchChannel } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await setupWatchChannel(TEST_TENANT_ID);

      expect(result).not.toBeNull();
      expect(result?.channelId).toContain("gcal-sync-test-tenant-id");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/events/watch"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("Google連携未設定の場合はnullを返す", async () => {
      tableResults.doctors = { data: [], error: null };

      const { setupWatchChannel } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await setupWatchChannel(TEST_TENANT_ID);

      expect(result).toBeNull();
    });

    it("APIエラー時はnullを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });

      const { setupWatchChannel } = await import(
        "@/lib/google-calendar-sync"
      );

      const result = await setupWatchChannel(TEST_TENANT_ID);

      expect(result).toBeNull();
    });
  });

  // =============================================
  // Cron API
  // =============================================
  describe("Cron API: /api/cron/gcal-sync", () => {
    it("CRON_SECRET認証が通る場合は同期を実行", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [],
            nextSyncToken: "sync-token-cron",
          }),
      });

      tableResults.google_calendar_sync_tokens = {
        data: {
          channel_id: "existing-channel",
          channel_expiration: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        error: null,
      };

      const { GET } = await import("@/app/api/cron/gcal-sync/route");

      const req = new Request(
        "http://localhost:3000/api/cron/gcal-sync",
        {
          headers: { authorization: "Bearer test-cron-secret" },
        }
      );

      const res = await GET(
        req as unknown as import("next/server").NextRequest
      );
      const body = await res.json();

      expect(body.ok).toBe(true);
      expect(body.tenants).toBe(1);
    });

    it("CRON_SECRET不一致で401を返す", async () => {
      const { GET } = await import("@/app/api/cron/gcal-sync/route");

      const req = new Request(
        "http://localhost:3000/api/cron/gcal-sync",
        {
          headers: { authorization: "Bearer wrong-secret" },
        }
      );

      const res = await GET(
        req as unknown as import("next/server").NextRequest
      );

      expect(res.status).toBe(401);
    });
  });

  // =============================================
  // Webhook API
  // =============================================
  describe("Webhook API: /api/admin/google-calendar/webhook", () => {
    it("sync通知に200を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/google-calendar/webhook/route"
      );

      const req = new Request(
        "http://localhost:3000/api/admin/google-calendar/webhook",
        {
          method: "POST",
          headers: {
            "x-goog-channel-id": "test-channel",
            "x-goog-resource-state": "sync",
          },
        }
      );

      const res = await POST(
        req as unknown as import("next/server").NextRequest
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it("existsリソースの変更通知を処理する", async () => {
      tableResults.google_calendar_sync_tokens = {
        data: { tenant_id: TEST_TENANT_ID },
        error: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [],
            nextSyncToken: "updated-sync-token",
          }),
      });

      const { POST } = await import(
        "@/app/api/admin/google-calendar/webhook/route"
      );

      const req = new Request(
        "http://localhost:3000/api/admin/google-calendar/webhook",
        {
          method: "POST",
          headers: {
            "x-goog-channel-id": "test-channel-exists",
            "x-goog-resource-state": "exists",
          },
        }
      );

      const res = await POST(
        req as unknown as import("next/server").NextRequest
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it("チャンネルIDなしの場合400を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/google-calendar/webhook/route"
      );

      const req = new Request(
        "http://localhost:3000/api/admin/google-calendar/webhook",
        {
          method: "POST",
          headers: {
            "x-goog-resource-state": "exists",
          },
        }
      );

      const res = await POST(
        req as unknown as import("next/server").NextRequest
      );

      expect(res.status).toBe(400);
    });
  });
});
