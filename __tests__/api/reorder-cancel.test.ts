// __tests__/api/reorder-cancel.test.ts
// 再処方キャンセル API のテスト
// 対象: app/api/reorder/cancel/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyPatientSession } from "@/lib/patient-session";

import type { Mock } from "vitest";

// --- チェーンモック ---
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-value"),
}));

// parseBody をモック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

// cookies モック
let mockCookies: Record<string, string | undefined> = {};
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      const val = mockCookies[name];
      return val ? { value: val } : undefined;
    }),
  })),
}));

vi.mock("@/lib/patient-session", () => ({
  verifyPatientSession: vi.fn().mockResolvedValue({ patientId: "p1", lineUserId: "U123" }),
  createPatientToken: vi.fn().mockResolvedValue("mock-jwt"),
  patientSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 31536000 }),
}));

function createMockRequest(method: string, url: string, body?: Record<string, unknown>) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as unknown as Request;
}

import { POST } from "@/app/api/reorder/cancel/route";
import { parseBody } from "@/lib/validations/helpers";
import { invalidateDashboardCache } from "@/lib/redis";

describe("再処方キャンセルAPI (reorder/cancel/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockCookies = {};
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      text: async () => "{}",
    }));
  });

  // ========================================
  // 認証テスト（Cookie）
  // ========================================
  it("patient_id Cookie なし → 401", async () => {
    vi.mocked(verifyPatientSession).mockResolvedValueOnce(null as any);
    mockCookies = {}; // クッキーなし
    const req = createMockRequest("POST", "http://localhost/api/reorder/cancel");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ========================================
  // バリデーション
  // ========================================
  it("バリデーション失敗 → parseBody のエラーレスポンス", async () => {
    mockCookies = { patient_id: "p1" };
    const mockErrorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
    vi.mocked(parseBody).mockResolvedValue({ error: mockErrorResponse });

    const req = createMockRequest("POST", "http://localhost/api/reorder/cancel");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ========================================
  // 正常系
  // ========================================
  it("pending のキャンセル → 成功", async () => {
    mockCookies = { patient_id: "p1" };
    vi.mocked(parseBody).mockResolvedValue({ data: { reorder_id: 1 } });

    // reorders: キャンセル対象あり
    tableChains["reorders"] = createChain({
      data: { id: 1, reorder_number: 101, status: "pending", product_code: "AGA-001" },
      error: null,
    });

    const req = createMockRequest("POST", "http://localhost/api/reorder/cancel");
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(invalidateDashboardCache).toHaveBeenCalledWith("p1");
    // LINE通知が呼ばれる
    expect(fetch).toHaveBeenCalled();
  });

  it("confirmed のキャンセル → 成功", async () => {
    mockCookies = { patient_id: "p1" };
    vi.mocked(parseBody).mockResolvedValue({ data: { reorder_id: 2 } });

    tableChains["reorders"] = createChain({
      data: { id: 2, reorder_number: 102, status: "confirmed", product_code: "ED-001" },
      error: null,
    });

    const req = createMockRequest("POST", "http://localhost/api/reorder/cancel");
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  // ========================================
  // 対象なし
  // ========================================
  it("キャンセル対象なし → 400 not_found", async () => {
    mockCookies = { patient_id: "p1" };
    vi.mocked(parseBody).mockResolvedValue({ data: { reorder_id: 999 } });

    // reorders: 対象なし
    tableChains["reorders"] = createChain({ data: null, error: null });

    const req = createMockRequest("POST", "http://localhost/api/reorder/cancel");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("not_found");
  });

  // ========================================
  // DBエラー
  // ========================================
  it("reorders SELECT エラー → 500", async () => {
    mockCookies = { patient_id: "p1" };
    vi.mocked(parseBody).mockResolvedValue({ data: { reorder_id: 1 } });

    tableChains["reorders"] = createChain({ data: null, error: { message: "DB error" } });

    const req = createMockRequest("POST", "http://localhost/api/reorder/cancel");
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("db_error");
  });

  // ========================================
  // __Host-patient_id Cookie
  // ========================================
  it("__Host-patient_id Cookie で認証できる", async () => {
    vi.mocked(verifyPatientSession).mockResolvedValueOnce({ patientId: "p2", lineUserId: "U456" });
    mockCookies = { "__Host-patient_id": "p2" };
    vi.mocked(parseBody).mockResolvedValue({ data: { reorder_id: 3 } });

    tableChains["reorders"] = createChain({
      data: { id: 3, reorder_number: 103, status: "pending", product_code: "AGA-001" },
      error: null,
    });

    const req = createMockRequest("POST", "http://localhost/api/reorder/cancel");
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(invalidateDashboardCache).toHaveBeenCalledWith("p2");
  });
});
