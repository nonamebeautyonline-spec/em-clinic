// __tests__/api/doctor-callstatus.test.ts
// 通話ステータス更新 API (app/api/doctor/callstatus/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const { mockVerifyAdminAuth } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

// --- ヘルパー ---
function createMockRequest(body: any) {
  return new Request("http://localhost/api/doctor/callstatus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

import { POST } from "@/app/api/doctor/callstatus/route";

describe("POST /api/doctor/callstatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  // -------------------------------------------
  // 認証テスト
  // -------------------------------------------
  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest({ reserveId: "R001", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // -------------------------------------------
  // バリデーションテスト
  // -------------------------------------------
  it("reserveId がない場合は 400 を返す", async () => {
    const req = createMockRequest({ callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reserveId が空文字の場合は 400 を返す", async () => {
    const req = createMockRequest({ reserveId: "", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/doctor/callstatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON",
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // DB更新エラー
  // -------------------------------------------
  it("DB更新エラー時は 500 を返す", async () => {
    tableChains["intake"] = createChain({ data: null, error: { message: "DB error" } });

    const req = createMockRequest({ reserveId: "R001", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB_ERROR");
  });

  // -------------------------------------------
  // 正常系テスト
  // -------------------------------------------
  it("正常に call_status を更新して 200 を返す", async () => {
    tableChains["intake"] = createChain({ data: null, error: null });

    const req = createMockRequest({ reserveId: "R001", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.updated_at).toBeDefined();
  });

  it("callStatus が空でもデフォルト値で更新できる", async () => {
    tableChains["intake"] = createChain({ data: null, error: null });

    const req = createMockRequest({ reserveId: "R001" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("intake の update が正しい引数で呼ばれる", async () => {
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ reserveId: "R001", callStatus: "completed" });
    await POST(req);

    // update が call_status と call_status_updated_at で呼ばれる
    expect(intakeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        call_status: "completed",
        call_status_updated_at: expect.any(String),
      })
    );
    // eq が reserve_id で呼ばれる
    expect(intakeChain.eq).toHaveBeenCalledWith("reserve_id", "R001");
  });

  it("reserveId の前後の空白が trim される", async () => {
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ reserveId: "  R001  ", callStatus: "calling" });
    await POST(req);

    expect(intakeChain.eq).toHaveBeenCalledWith("reserve_id", "R001");
  });

  it("callStatus の前後の空白が trim される", async () => {
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ reserveId: "R001", callStatus: "  calling  " });
    await POST(req);

    expect(intakeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ call_status: "calling" })
    );
  });
});
