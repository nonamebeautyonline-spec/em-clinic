// __tests__/api/doctor-update.test.ts
// 診察結果更新 API (app/api/doctor/update/route.ts) のテスト
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

// vi.hoisted でホイスト対象の値を先に定義
const { mockVerifyAdminAuth, mockInvalidateCache } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockInvalidateCache: vi.fn().mockResolvedValue(undefined),
}));

// doctor/update/route.ts は独自に createClient で supabaseAdmin を作成している
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: mockInvalidateCache,
}));

// --- ヘルパー ---
function createMockRequest(body: any) {
  return new Request("http://localhost/api/doctor/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

import { POST } from "@/app/api/doctor/update/route";

describe("POST /api/doctor/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockInvalidateCache.mockResolvedValue(undefined);
  });

  // -------------------------------------------
  // 認証テスト
  // -------------------------------------------
  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest({ reserveId: "R001", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // -------------------------------------------
  // バリデーションテスト
  // -------------------------------------------
  it("reserveId が空の場合は 400 を返す", async () => {
    const req = createMockRequest({ reserveId: "", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reserveId がない場合は 400 を返す", async () => {
    const req = createMockRequest({ status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/doctor/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON",
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // intake 未発見テスト
  // -------------------------------------------
  it("intake が見つからない場合は 404 を返す", async () => {
    tableChains["intake"] = createChain({ data: null, error: { message: "not found" } });

    const req = createMockRequest({ reserveId: "R001", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("INTAKE_NOT_FOUND");
  });

  // -------------------------------------------
  // 正常系テスト
  // -------------------------------------------
  it("正常にintakeとreservationsを更新して 200 を返す", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P001" }, error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });

    const req = createMockRequest({
      reserveId: "R001",
      status: "done",
      note: "テストメモ",
      prescriptionMenu: "マンジャロ2.5mg",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.patientId).toBe("P001");
  });

  it("正常時にキャッシュ無効化が呼ばれる", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P001" }, error: null });
    tableChains["reservations"] = createChain();

    const req = createMockRequest({ reserveId: "R001", status: "done" });
    await POST(req);
    expect(mockInvalidateCache).toHaveBeenCalledWith("P001");
  });

  // -------------------------------------------
  // キャッシュ無効化エラー（non-critical）
  // -------------------------------------------
  it("キャッシュ無効化が失敗しても 200 を返す", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P001" }, error: null });
    tableChains["reservations"] = createChain();
    mockInvalidateCache.mockRejectedValue(new Error("Redis down"));

    const req = createMockRequest({ reserveId: "R001", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  // -------------------------------------------
  // オプショナルフィールド
  // -------------------------------------------
  it("status, note, prescriptionMenu がなくても成功する", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P002" }, error: null });
    tableChains["reservations"] = createChain();

    const req = createMockRequest({ reserveId: "R002" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
