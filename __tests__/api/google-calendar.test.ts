// __tests__/api/google-calendar.test.ts
// Google Calendar API のテスト
// 認証、OAuth2フロー、同期APIのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseLimit = vi.fn();
const mockSupabaseGte = vi.fn();
const mockSupabaseLte = vi.fn();
const mockSupabaseNeq = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      mockSupabaseFrom(table);
      return {
        select: (...args: any[]) => {
          mockSupabaseSelect(...args);
          return {
            eq: (...eqArgs: any[]) => {
              mockSupabaseEq(...eqArgs);
              return {
                eq: (...eqArgs2: any[]) => {
                  mockSupabaseEq(...eqArgs2);
                  return {
                    single: () => {
                      mockSupabaseSingle();
                      return { data: null, error: null };
                    },
                    limit: (n: number) => {
                      mockSupabaseLimit(n);
                      return { data: [], error: null };
                    },
                  };
                },
                single: () => {
                  mockSupabaseSingle();
                  return { data: null, error: null };
                },
                limit: (n: number) => {
                  mockSupabaseLimit(n);
                  return { data: [], error: null };
                },
              };
            },
            gte: (...args2: any[]) => {
              mockSupabaseGte(...args2);
              return {
                lte: (...args3: any[]) => {
                  mockSupabaseLte(...args3);
                  return {
                    neq: (...args4: any[]) => {
                      mockSupabaseNeq(...args4);
                      return { data: [], error: null };
                    },
                  };
                },
              };
            },
            in: () => ({ data: [], error: null }),
          };
        },
        update: (...args: any[]) => {
          mockSupabaseUpdate(...args);
          return {
            eq: (...eqArgs: any[]) => {
              mockSupabaseEq(...eqArgs);
              return {
                eq: () => ({ data: null, error: null }),
              };
            },
          };
        },
        insert: (...args: any[]) => {
          mockSupabaseInsert(...args);
          return { data: null, error: null };
        },
      };
    },
  },
}));

// admin-auth モック
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

// tenant モック
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue("test-tenant-id"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

// google-calendar モック
vi.mock("@/lib/google-calendar", () => ({
  getAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?mock=true"),
  exchangeCode: vi.fn().mockResolvedValue({
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    token_type: "Bearer",
    scope: "https://www.googleapis.com/auth/calendar",
  }),
  decodeState: vi.fn().mockReturnValue({ tenantId: "test-tenant-id", doctorId: "dr_test" }),
  calculateTokenExpiry: vi.fn().mockReturnValue("2026-02-27T19:00:00.000Z"),
  listEvents: vi.fn().mockResolvedValue([]),
  insertEvent: vi.fn().mockResolvedValue({ id: "event-1" }),
  refreshAccessToken: vi.fn().mockResolvedValue({
    access_token: "new-access-token",
    expires_in: 3600,
  }),
}));

// セッション検証をモック
vi.mock("@/lib/session", () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}));

// NextRequest互換のモック（Requestオブジェクトのheadersは読み取り専用なのでプレーンオブジェクトを使用）
function createMockRequest(url: string, options?: { method?: string; body?: string }) {
  const parsedUrl = new URL(url);
  return {
    method: options?.method || "GET",
    nextUrl: parsedUrl,
    url,
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: options?.body ? async () => JSON.parse(options.body!) : async () => ({}),
  } as any;
}

describe("Google Calendar Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みの管理者がOAuth2認証URLを取得できる", async () => {
    const { GET } = await import("@/app/api/admin/google-calendar/auth/route");
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as any).mockResolvedValue(true);

    const req = createMockRequest(
      "http://localhost:3000/api/admin/google-calendar/auth?doctor_id=dr_001"
    );

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.authUrl).toContain("https://accounts.google.com");
  });

  it("未認証の場合は401を返す", async () => {
    const { GET } = await import("@/app/api/admin/google-calendar/auth/route");
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as any).mockResolvedValue(false);

    const req = createMockRequest(
      "http://localhost:3000/api/admin/google-calendar/auth?doctor_id=dr_001"
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("doctor_idがない場合は400を返す", async () => {
    const { GET } = await import("@/app/api/admin/google-calendar/auth/route");
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as any).mockResolvedValue(true);

    const req = createMockRequest(
      "http://localhost:3000/api/admin/google-calendar/auth"
    );

    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("Google Calendar Callback API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証拒否時はエラーパラメータ付きでリダイレクトする", async () => {
    const { GET } = await import("@/app/api/admin/google-calendar/callback/route");

    const req = createMockRequest(
      "http://localhost:3000/api/admin/google-calendar/callback?error=access_denied"
    );

    const res = await GET(req);
    // リダイレクトレスポンスの検証
    expect(res.status).toBe(307); // NextResponse.redirect のデフォルト
    const location = res.headers.get("location") || "";
    expect(location).toContain("/admin/reservations");
    expect(location).toContain("gcal_error=auth_denied");
  });

  it("codeとstateが欠如している場合はエラーリダイレクトする", async () => {
    const { GET } = await import("@/app/api/admin/google-calendar/callback/route");

    const req = createMockRequest(
      "http://localhost:3000/api/admin/google-calendar/callback"
    );

    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("gcal_error=missing_params");
  });

  it("正常なコールバックで成功リダイレクトする", async () => {
    const { GET } = await import("@/app/api/admin/google-calendar/callback/route");

    const state = Buffer.from(
      JSON.stringify({ tenantId: "test-tenant-id", doctorId: "dr_test" })
    ).toString("base64url");

    const req = createMockRequest(
      `http://localhost:3000/api/admin/google-calendar/callback?code=test-code&state=${state}`
    );

    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/admin/reservations");
    expect(location).toContain("gcal_success=true");
  });
});

describe("Google Calendar Sync API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合は401を返す", async () => {
    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as any).mockResolvedValue(false);

    const req = createMockRequest(
      "http://localhost:3000/api/admin/google-calendar/sync",
      { method: "POST", body: JSON.stringify({ doctor_id: "dr_001" }) }
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("doctor_idがない場合は400を返す", async () => {
    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as any).mockResolvedValue(true);

    const req = createMockRequest(
      "http://localhost:3000/api/admin/google-calendar/sync",
      { method: "POST", body: JSON.stringify({}) }
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("Google Calendar 連携フロー統合テスト", () => {
  it("OAuth2 stateのエンコード・デコードが往復一致する", () => {
    const tenantId = "tenant-uuid-123";
    const doctorId = "dr_tanaka";

    const state = Buffer.from(
      JSON.stringify({ tenantId, doctorId })
    ).toString("base64url");

    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    );

    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.doctorId).toBe(doctorId);
  });

  it("トークン有効期限が正しく計算される", () => {
    const now = Date.now();
    const expiresIn = 3600; // 1時間
    const expiresAt = new Date(now + expiresIn * 1000).toISOString();
    const expiresDate = new Date(expiresAt);

    // 1時間後であること（±10秒の許容）
    expect(expiresDate.getTime() - now).toBeGreaterThan(3590000);
    expect(expiresDate.getTime() - now).toBeLessThan(3610000);
  });
});

// =============================================
// Google Calendar Sync 詳細テスト（+10ケース）
// =============================================
describe("Google Calendar Sync 詳細テスト", () => {
  // sync 用に Supabase モックを上書きするヘルパー
  // テストごとに from() の振る舞いを細かく制御する
  let mockFromBehavior: (table: string) => any;

  async function setupSupabaseMock(behavior: (table: string) => any) {
    mockFromBehavior = behavior;
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin as any).from = (table: string) => {
      mockSupabaseFrom(table);
      return mockFromBehavior(table);
    };
  }

  // テーブルごとのデフォルトチェーンビルダー
  function chainBuilder(overrides: Record<string, any> = {}) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({ data: overrides.limitData ?? [], error: null }),
      single: vi.fn().mockReturnValue({ data: overrides.singleData ?? null, error: overrides.singleError ?? null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({ data: null, error: overrides.insertError ?? null }),
      in: vi.fn().mockReturnValue({ data: [], error: null }),
    };
    return chain;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);

    const { resolveTenantId } = await import("@/lib/tenant");
    vi.mocked(resolveTenantId).mockReturnValue("test-tenant-id");

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.listEvents).mockResolvedValue([]);
    vi.mocked(gcal.insertEvent).mockResolvedValue({ id: "event-1" } as any);
    vi.mocked(gcal.refreshAccessToken).mockResolvedValue({
      access_token: "new-access-token",
      expires_in: 3600,
    } as any);
    vi.mocked(gcal.calculateTokenExpiry).mockReturnValue("2026-02-27T19:00:00.000Z");
  });

  it("医師が見つからない場合は404を返す", async () => {
    await setupSupabaseMock((table) => {
      return chainBuilder({ singleData: null, singleError: { message: "not found" } });
    });

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_unknown" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("医師が見つかりません");
  });

  it("google_refresh_tokenがない場合は400を返す", async () => {
    await setupSupabaseMock((table) => {
      return chainBuilder({
        singleData: {
          doctor_id: "dr_001",
          doctor_name: "テスト医師",
          google_calendar_id: null,
          google_access_token: "token",
          google_refresh_token: null,
          google_token_expires_at: null,
        },
      });
    });

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Googleカレンダーが連携されていません");
  });

  it("トークンリフレッシュ失敗時は401を返す", async () => {
    await setupSupabaseMock((table) => {
      return chainBuilder({
        singleData: {
          doctor_id: "dr_001",
          doctor_name: "テスト医師",
          google_calendar_id: null,
          google_access_token: "old-token",
          google_refresh_token: "refresh-token",
          google_token_expires_at: "2020-01-01T00:00:00.000Z", // 期限切れ
        },
      });
    });

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.refreshAccessToken).mockRejectedValue(new Error("refresh failed"));

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("リフレッシュに失敗");
  });

  it("listEvents失敗時は502を返す", async () => {
    // 未来の有効期限でリフレッシュ不要にする
    await setupSupabaseMock((table) => {
      return chainBuilder({
        singleData: {
          doctor_id: "dr_001",
          doctor_name: "テスト医師",
          google_calendar_id: "primary",
          google_access_token: "valid-token",
          google_refresh_token: "refresh-token",
          google_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      });
    });

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.listEvents).mockRejectedValue(new Error("API error"));

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("イベント取得に失敗");
  });

  it("正常同期（Googleイベント→em-clinic）は200を返す", async () => {
    const doctorData = {
      doctor_id: "dr_001",
      doctor_name: "テスト医師",
      google_calendar_id: "primary",
      google_access_token: "valid-token",
      google_refresh_token: "refresh-token",
      google_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    await setupSupabaseMock((table) => {
      if (table === "doctors") {
        return chainBuilder({ singleData: doctorData });
      }
      if (table === "doctor_date_overrides") {
        return chainBuilder({ limitData: [] }); // 既存overrideなし→新規挿入
      }
      if (table === "reservations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.listEvents).mockResolvedValue([
      {
        id: "google-evt-1",
        status: "confirmed",
        summary: "外部予定テスト",
        start: { dateTime: "2026-03-01T10:00:00+09:00" },
        end: { dateTime: "2026-03-01T11:00:00+09:00" },
      },
    ] as any);

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.sync.google_to_clinic.events_found).toBe(1);
  });

  it("cancelledイベントは除外される", async () => {
    const doctorData = {
      doctor_id: "dr_001",
      doctor_name: "テスト医師",
      google_calendar_id: "primary",
      google_access_token: "valid-token",
      google_refresh_token: "refresh-token",
      google_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    await setupSupabaseMock((table) => {
      if (table === "doctors") {
        return chainBuilder({ singleData: doctorData });
      }
      if (table === "reservations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder({ limitData: [] });
    });

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.listEvents).mockResolvedValue([
      { id: "evt-1", status: "cancelled", summary: "キャンセル済", start: { dateTime: "2026-03-01T10:00:00+09:00" }, end: { dateTime: "2026-03-01T11:00:00+09:00" } },
      { id: "evt-2", status: "confirmed", summary: "有効な予定", start: { dateTime: "2026-03-02T10:00:00+09:00" }, end: { dateTime: "2026-03-02T11:00:00+09:00" } },
    ] as any);

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    // 2イベント取得されたがcancelledを除外して overrides_created は1以下
    expect(data.sync.google_to_clinic.events_found).toBe(2);
    expect(data.sync.google_to_clinic.overrides_created).toBeLessThanOrEqual(1);
  });

  it("既存オーバーライドはUPDATEされる", async () => {
    const doctorData = {
      doctor_id: "dr_001",
      doctor_name: "テスト医師",
      google_calendar_id: "primary",
      google_access_token: "valid-token",
      google_refresh_token: "refresh-token",
      google_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ data: null, error: null }) });

    await setupSupabaseMock((table) => {
      if (table === "doctors") {
        return chainBuilder({ singleData: doctorData });
      }
      if (table === "doctor_date_overrides") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue({ data: [{ id: "override-1" }], error: null }),
          update: updateMock,
          insert: vi.fn().mockReturnValue({ data: null, error: null }),
        };
      }
      if (table === "reservations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.listEvents).mockResolvedValue([
      { id: "evt-1", status: "confirmed", summary: "更新予定", start: { dateTime: "2026-03-01T10:00:00+09:00" }, end: { dateTime: "2026-03-01T11:00:00+09:00" } },
    ] as any);

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    // 既存overrideがあるので overrides_created は 0
    expect(data.sync.google_to_clinic.overrides_created).toBe(0);
    expect(updateMock).toHaveBeenCalled();
  });

  it("em-clinic予約がGoogleカレンダーに挿入される", async () => {
    const doctorData = {
      doctor_id: "dr_001",
      doctor_name: "テスト医師",
      google_calendar_id: "primary",
      google_access_token: "valid-token",
      google_refresh_token: "refresh-token",
      google_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    await setupSupabaseMock((table) => {
      if (table === "doctors") {
        return chainBuilder({ singleData: doctorData });
      }
      if (table === "reservations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnValue({
            data: [
              { reserve_id: "rsv-001", patient_name: "田中太郎", reserved_date: "2026-03-01", reserved_time: "10:00", status: "confirmed", prescription_menu: "AGA" },
              { reserve_id: "rsv-002", patient_name: "山田花子", reserved_date: "2026-03-02", reserved_time: "14:00", status: "confirmed", prescription_menu: "ED" },
            ],
            error: null,
          }),
        };
      }
      return chainBuilder({ limitData: [] });
    });

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.listEvents).mockResolvedValue([]); // Googleイベントなし
    vi.mocked(gcal.insertEvent).mockResolvedValue({ id: "new-event" } as any);

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sync.clinic_to_google.events_created).toBe(2);
    expect(gcal.insertEvent).toHaveBeenCalledTimes(2);
  });

  it("insertEvent個別失敗時は続行する", async () => {
    const doctorData = {
      doctor_id: "dr_001",
      doctor_name: "テスト医師",
      google_calendar_id: "primary",
      google_access_token: "valid-token",
      google_refresh_token: "refresh-token",
      google_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    await setupSupabaseMock((table) => {
      if (table === "doctors") {
        return chainBuilder({ singleData: doctorData });
      }
      if (table === "reservations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnValue({
            data: [
              { reserve_id: "rsv-001", patient_name: "田中太郎", reserved_date: "2026-03-01", reserved_time: "10:00", status: "confirmed", prescription_menu: "AGA" },
              { reserve_id: "rsv-002", patient_name: "山田花子", reserved_date: "2026-03-02", reserved_time: "14:00", status: "confirmed", prescription_menu: "ED" },
            ],
            error: null,
          }),
        };
      }
      return chainBuilder({ limitData: [] });
    });

    const gcal = await import("@/lib/google-calendar");
    vi.mocked(gcal.listEvents).mockResolvedValue([]);
    // 1件目失敗、2件目成功
    vi.mocked(gcal.insertEvent)
      .mockRejectedValueOnce(new Error("API limit"))
      .mockResolvedValueOnce({ id: "new-event" } as any);

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    // 1件失敗、1件成功
    expect(data.sync.clinic_to_google.events_created).toBe(1);
  });

  it("同期結果のカウントが正しい", async () => {
    const doctorData = {
      doctor_id: "dr_001",
      doctor_name: "テスト医師",
      google_calendar_id: "cal-123",
      google_access_token: "valid-token",
      google_refresh_token: "refresh-token",
      google_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    await setupSupabaseMock((table) => {
      if (table === "doctors") {
        return chainBuilder({ singleData: doctorData });
      }
      if (table === "reservations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnValue({
            data: [
              { reserve_id: "rsv-001", patient_name: "A", reserved_date: "2026-03-01", reserved_time: "10:00", status: "confirmed", prescription_menu: "X" },
            ],
            error: null,
          }),
        };
      }
      return chainBuilder({ limitData: [] });
    });

    const gcal = await import("@/lib/google-calendar");
    // 3イベント: 1キャンセル、2有効
    vi.mocked(gcal.listEvents).mockResolvedValue([
      { id: "e1", status: "cancelled", summary: "C", start: { dateTime: "2026-03-01T10:00:00+09:00" }, end: {} },
      { id: "e2", status: "confirmed", summary: "A", start: { dateTime: "2026-03-01T10:00:00+09:00" }, end: {} },
      { id: "e3", status: "confirmed", summary: "B", start: { date: "2026-03-02" }, end: {}, description: "reserve_id:rsv-001" },
    ] as any);
    vi.mocked(gcal.insertEvent).mockResolvedValue({ id: "new" } as any);

    const { POST } = await import("@/app/api/admin/google-calendar/sync/route");
    const req = createMockRequest("http://localhost:3000/api/admin/google-calendar/sync", {
      method: "POST",
      body: JSON.stringify({ doctor_id: "dr_001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.doctor_id).toBe("dr_001");
    expect(data.sync.google_to_clinic.events_found).toBe(3);
    // rsv-001はGoogleに既存のためスキップ
    expect(data.sync.clinic_to_google.already_synced).toBe(1);
    expect(data.sync.clinic_to_google.events_created).toBe(0);
    expect(data.sync.clinic_to_google.reservations_found).toBe(1);
  });
});
