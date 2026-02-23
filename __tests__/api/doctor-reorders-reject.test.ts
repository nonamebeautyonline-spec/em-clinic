// __tests__/api/doctor-reorders-reject.test.ts
// 再処方却下 API (app/api/doctor/reorders/reject/route.ts) のテスト
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

const { mockVerifyAdminAuth, mockInvalidateCache } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockInvalidateCache: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: mockInvalidateCache,
}));

// --- ヘルパー ---
function createMockRequest(body: any) {
  return new Request("http://localhost/api/doctor/reorders/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

import { POST } from "@/app/api/doctor/reorders/reject/route";

describe("POST /api/doctor/reorders/reject", () => {
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
    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // -------------------------------------------
  // バリデーションテスト
  // -------------------------------------------
  it("id がない場合は 400 を返す", async () => {
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/doctor/reorders/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON",
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // 再処方が見つからない場合
  // -------------------------------------------
  it("reorder が見つからない場合は 404 を返す", async () => {
    tableChains["reorders"] = createChain({ data: null, error: { message: "not found" } });
    const req = createMockRequest({ id: 999 });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("reorder_not_found");
  });

  // -------------------------------------------
  // ステータスが pending でない場合
  // -------------------------------------------
  it("ステータスが pending でない場合は 400 を返す", async () => {
    tableChains["reorders"] = createChain({
      data: { id: 1, patient_id: "P001", status: "confirmed" },
      error: null,
    });
    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("invalid_status");
  });

  it("ステータスが rejected の場合も 400 を返す", async () => {
    tableChains["reorders"] = createChain({
      data: { id: 1, patient_id: "P001", status: "rejected" },
      error: null,
    });
    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // DB更新エラー
  // -------------------------------------------
  it("DB更新エラー時は 500 を返す", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const updateChain = createChain({ data: null, error: { message: "update failed" } });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return selectChain;
        return updateChain;
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("db_error");
  });

  // -------------------------------------------
  // 正常系テスト
  // -------------------------------------------
  it("正常に却下して 200 を返す", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return selectChain;
        return updateChain;
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("正常却下時にキャッシュ無効化が呼ばれる", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return selectChain;
        return updateChain;
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: 1 });
    await POST(req);
    expect(mockInvalidateCache).toHaveBeenCalledWith("P001");
  });

  it("patient_id がない場合はキャッシュ無効化しない", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: null, status: "pending" },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return selectChain;
        return updateChain;
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: 1 });
    await POST(req);
    expect(mockInvalidateCache).not.toHaveBeenCalled();
  });

  it("id が文字列でも正常に処理できる", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return selectChain;
        return updateChain;
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: "42" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
