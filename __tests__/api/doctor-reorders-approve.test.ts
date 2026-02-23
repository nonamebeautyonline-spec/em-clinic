// __tests__/api/doctor-reorders-approve.test.ts
// 再処方承認 API (app/api/doctor/reorders/approve/route.ts) のテスト
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

const { mockVerifyAdminAuth, mockInvalidateCache, mockPushMessage, mockEvaluateMenuRules } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockInvalidateCache: vi.fn().mockResolvedValue(undefined),
  mockPushMessage: vi.fn().mockResolvedValue({ ok: true }),
  mockEvaluateMenuRules: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/lib/line-push", () => ({
  pushMessage: mockPushMessage,
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: mockEvaluateMenuRules,
}));

// --- ヘルパー ---
function createMockRequest(body: any) {
  return new Request("http://localhost/api/doctor/reorders/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

import { POST } from "@/app/api/doctor/reorders/approve/route";

describe("POST /api/doctor/reorders/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockInvalidateCache.mockResolvedValue(undefined);
    mockPushMessage.mockResolvedValue({ ok: true });
  });

  // -------------------------------------------
  // 認証テスト
  // -------------------------------------------
  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    expect(res.status).toBe(401);
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
    const req = new Request("http://localhost/api/doctor/reorders/approve", {
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

  // -------------------------------------------
  // DB更新エラー
  // -------------------------------------------
  it("DB更新エラー時は 500 を返す", async () => {
    // select は成功（pending）、update はエラー
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const updateChain = createChain({ data: null, error: { message: "update failed" } });

    let callCount = 0;
    tableChains["reorders"] = new Proxy({}, {
      get: (_, prop) => {
        // 最初のfromはselect用、次はupdate用
        if (prop === "select") {
          return (...args: any[]) => {
            callCount++;
            return selectChain.select(...args);
          };
        }
        if (prop === "update") {
          return (...args: any[]) => {
            return updateChain.update(...args);
          };
        }
        return selectChain[prop as string];
      }
    });

    // reordersチェーンを単純化: from が呼ばれる度に別チェーンを返す
    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return selectChain; // select
        return updateChain; // update
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
  it("正常に承認して 200 を返す（LINE通知成功）", async () => {
    // reorders: select → pending, update → 成功
    const reorderSelectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const reorderUpdateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return reorderSelectChain;
        return reorderUpdateChain;
      }
      if (table === "patients") {
        return createChain({ data: { line_id: "U_LINE_001" }, error: null });
      }
      if (table === "message_log") {
        return createChain();
      }
      return getOrCreateChain(table);
    });

    mockPushMessage.mockResolvedValue({ ok: true });

    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.lineNotify).toBe("sent");
  });

  it("正常承認時にキャッシュ無効化が呼ばれる", async () => {
    const reorderSelectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const reorderUpdateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return reorderSelectChain;
        return reorderUpdateChain;
      }
      if (table === "patients") {
        return createChain({ data: { line_id: "U_LINE_001" }, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: 1 });
    await POST(req);
    expect(mockInvalidateCache).toHaveBeenCalledWith("P001");
  });

  it("患者の LINE UID がない場合は lineNotify が no_uid", async () => {
    const reorderSelectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const reorderUpdateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return reorderSelectChain;
        return reorderUpdateChain;
      }
      if (table === "patients") {
        // line_id が null
        return createChain({ data: { line_id: null }, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.lineNotify).toBe("no_uid");
  });

  it("LINE送信失敗時は lineNotify が failed", async () => {
    const reorderSelectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const reorderUpdateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return reorderSelectChain;
        return reorderUpdateChain;
      }
      if (table === "patients") {
        return createChain({ data: { line_id: "U_LINE_001" }, error: null });
      }
      return getOrCreateChain(table);
    });

    mockPushMessage.mockRejectedValue(new Error("LINE API error"));

    const req = createMockRequest({ id: 1 });
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.lineNotify).toBe("failed");
  });

  it("リッチメニュー自動切替が呼ばれる", async () => {
    const reorderSelectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const reorderUpdateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return reorderSelectChain;
        return reorderUpdateChain;
      }
      if (table === "patients") {
        return createChain({ data: { line_id: null }, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: 1 });
    await POST(req);
    expect(mockEvaluateMenuRules).toHaveBeenCalledWith("P001", "test-tenant");
  });

  it("id が文字列でも正常に処理できる", async () => {
    const reorderSelectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending" },
      error: null,
    });
    const reorderUpdateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return reorderSelectChain;
        return reorderUpdateChain;
      }
      if (table === "patients") {
        return createChain({ data: { line_id: null }, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ id: "42" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
