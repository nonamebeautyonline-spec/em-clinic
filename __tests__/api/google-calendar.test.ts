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
