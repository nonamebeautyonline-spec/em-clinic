// __tests__/api/line-callback.test.ts
// LINEログインコールバック API のテスト
// 対象: app/api/line/callback/route.ts

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// === Supabaseチェーンモック ===
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv","like","head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
let tableCallCounts: Record<string, number> = {};
let tableChainsList: Record<string, SupabaseChain[]> = {};

function setChainForTable(table: string, chain: SupabaseChain) {
  tableChains[table] = chain;
}

function setChainsForTable(table: string, chains: SupabaseChain[]) {
  tableChainsList[table] = chains;
  tableCallCounts[table] = 0;
}

function getChainForTable(table: string): SupabaseChain {
  if (tableChainsList[table] && tableChainsList[table].length > 0) {
    const idx = tableCallCounts[table] || 0;
    tableCallCounts[table] = idx + 1;
    return tableChainsList[table][Math.min(idx, tableChainsList[table].length - 1)];
  }
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getChainForTable(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: SupabaseChain) => q),
  strictWithTenant: vi.fn((q: SupabaseChain) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockGetSettingOrEnv = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: unknown[]) => mockGetSettingOrEnv(...args),
}));

vi.mock("@/lib/lifecycle-actions", () => ({
  executeActionSteps: vi.fn().mockResolvedValue({ actionDetails: [] }),
}));

const mockCreatePatientToken = vi.fn().mockResolvedValue("mock-jwt-token");
vi.mock("@/lib/patient-session", () => ({
  createPatientToken: (...args: unknown[]) => mockCreatePatientToken(...args),
  patientSessionCookieOptions: vi.fn(() => ({
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })),
}));

// グローバルfetchモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET } from "@/app/api/line/callback/route";

// LINE IDトークンを作る（JWTモック: ヘッダー.ペイロード.署名）
function makeIdToken(sub: string) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64");
  return `${header}.${payload}.mock-signature`;
}

describe("GET /api/line/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    tableChainsList = {};
    tableCallCounts = {};

    // デフォルトの設定値
    mockGetSettingOrEnv.mockImplementation((_cat: string, _key: string, envKey: string) => {
      const map: Record<string, string> = {
        APP_BASE_URL: "https://example.com",
        LINE_CHANNEL_ID: "channel-123",
        LINE_CHANNEL_SECRET: "secret-456",
        LINE_REDIRECT_URI: "https://example.com/api/line/callback",
      };
      return Promise.resolve(map[envKey] || "");
    });
  });

  function makeReq(params: Record<string, string> = {}) {
    const url = new URL("http://localhost/api/line/callback");
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return new NextRequest(url.toString(), { method: "GET" });
  }

  // ── code パラメータなし → login-errorにリダイレクト ──
  it("code未指定時はlogin-errorにリダイレクトする", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login-error");
  });

  // ── LINEトークンAPI失敗 → login-errorにリダイレクト ──
  it("LINEトークンAPI失敗時はlogin-errorにリダイレクトする", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("error"),
    });
    const res = await GET(makeReq({ code: "valid-code" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login-error");
  });

  // ── 正常系: 既知患者 → mypage ──
  it("既知患者はmypageにリダイレクトし、JWTクッキーを設定する", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id_token: makeIdToken("U-known-user") }),
    });

    // patients: 既知の患者
    setChainForTable("patients", createChain({ data: { patient_id: "p-001", tel: "09012345678" }, error: null, count: 0 }));

    const res = await GET(makeReq({ code: "valid-code" }));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("https://example.com/mypage");

    // JWTクッキー設定確認
    expect(mockCreatePatientToken).toHaveBeenCalledWith("p-001", "U-known-user", "test-tenant");
  });

  // ── 正常系: 未知患者 → register ──
  it("未知患者はregisterにリダイレクトし、クッキーをクリアする", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id_token: makeIdToken("U-unknown-user") }),
    });

    // patients: 該当なし
    setChainForTable("patients", createChain({ data: null, error: null, count: 0 }));

    const res = await GET(makeReq({ code: "valid-code" }));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("https://example.com/register");

    // JWT未発行（未知患者）
    expect(mockCreatePatientToken).not.toHaveBeenCalled();
  });

  // ── stateからreturnUrlを復元 ──
  it("stateにreturnUrlが含まれていれば、そのURLにリダイレクトする", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id_token: makeIdToken("U-known-user") }),
    });

    setChainForTable("patients", createChain({ data: { patient_id: "p-001", tel: "09012345678" }, error: null, count: 0 }));

    const state = Buffer.from(JSON.stringify({ returnUrl: "/mypage/orders", tenantId: "test-tenant" })).toString("base64url");
    const res = await GET(makeReq({ code: "valid-code", state }));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("https://example.com/mypage/orders");
  });

  // ── line_user_id cookieが設定される ──
  it("line_user_id cookieが必ず設定される", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id_token: makeIdToken("U-test-user") }),
    });

    setChainForTable("patients", createChain({ data: null, error: null, count: 0 }));

    const res = await GET(makeReq({ code: "valid-code" }));
    const setCookieHeaders = res.headers.getSetCookie();
    const lineUserIdCookie = setCookieHeaders.find((c: string) => c.startsWith("line_user_id="));
    expect(lineUserIdCookie).toBeDefined();
    expect(lineUserIdCookie).toContain("U-test-user");
  });
});
