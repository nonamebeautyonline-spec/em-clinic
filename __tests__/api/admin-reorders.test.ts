// __tests__/api/admin-reorders.test.ts
// 再処方管理 API のテスト
// - GET  app/api/admin/reorders/route.ts（一覧取得）
// - POST app/api/admin/reorders/approve/route.ts（承認）
// - POST app/api/admin/reorders/reject/route.ts（却下）
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

const {
  mockVerifyAdminAuth, mockInvalidateCache, mockPushMessage,
  mockGetSettingOrEnv, mockLogAudit, mockEvaluateMenuRules,
  mockExtractDose, mockBuildKarteNote, mockFormatProductCode,
} = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockInvalidateCache: vi.fn().mockResolvedValue(undefined),
  mockPushMessage: vi.fn().mockResolvedValue({ ok: true }),
  mockGetSettingOrEnv: vi.fn().mockResolvedValue("token-or-value"),
  mockLogAudit: vi.fn(),
  mockEvaluateMenuRules: vi.fn().mockResolvedValue(undefined),
  mockExtractDose: vi.fn().mockReturnValue(2.5),
  mockBuildKarteNote: vi.fn().mockReturnValue("テストカルテメモ"),
  mockFormatProductCode: vi.fn().mockReturnValue("マンジャロ2.5mg"),
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

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: mockGetSettingOrEnv,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: mockEvaluateMenuRules,
}));

vi.mock("@/lib/reorder-karte", () => ({
  extractDose: mockExtractDose,
  buildKarteNote: mockBuildKarteNote,
}));

vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: mockFormatProductCode,
}));

// fetchモック（pushToGroup で使われる）
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

// =============================================
// GET /api/admin/reorders（一覧取得）
// =============================================
import { GET } from "@/app/api/admin/reorders/route";

describe("GET /api/admin/reorders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  function createGetRequest(includeAll = false) {
    const url = includeAll
      ? "http://localhost/api/admin/reorders?include_all=true"
      : "http://localhost/api/admin/reorders";
    const req = new Request(url, { method: "GET" });
    // nextUrl.searchParams を追加
    (req as any).nextUrl = new URL(url);
    return req as any;
  }

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常に再処方一覧を返す（pendingのみ）", async () => {
    const reordersData = [
      {
        reorder_number: 1, patient_id: "P001", product_code: "MJ-2.5",
        status: "pending", timestamp: "2026-01-01T00:00:00Z",
        note: "テスト", line_uid: "U001", line_notify_result: null,
      },
    ];
    tableChains["reorders"] = createChain({ data: reordersData, error: null });

    // patients
    tableChains["patients"] = createChain({
      data: [{ patient_id: "P001", name: "テスト太郎" }],
      error: null,
    });

    // intake（answerer_id取得）
    tableChains["intake"] = createChain({
      data: [{ patient_id: "P001", answerer_id: "LSTEP001" }],
      error: null,
    });

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reorders).toHaveLength(1);
    expect(json.reorders[0].id).toBe("1");
    expect(json.reorders[0].patient_name).toBe("テスト太郎");
    expect(json.reorders[0].lstep_uid).toBe("LSTEP001");
  });

  it("include_all=true の場合は全件取得する", async () => {
    const reordersData = [
      {
        reorder_number: 1, patient_id: "P001", product_code: "MJ-2.5",
        status: "confirmed", timestamp: "2026-01-01T00:00:00Z",
        note: "", line_uid: "", line_notify_result: null,
      },
      {
        reorder_number: 2, patient_id: "P001", product_code: "MJ-5.0",
        status: "pending", timestamp: "2026-01-02T00:00:00Z",
        note: "", line_uid: "", line_notify_result: null,
      },
    ];
    tableChains["reorders"] = createChain({ data: reordersData, error: null });
    tableChains["patients"] = createChain({
      data: [{ patient_id: "P001", name: "テスト太郎" }],
      error: null,
    });
    tableChains["intake"] = createChain({ data: [], error: null });

    const req = createGetRequest(true);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reorders).toHaveLength(2);
  });

  it("再処方がない場合は空配列を返す", async () => {
    tableChains["reorders"] = createChain({ data: [], error: null });

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reorders).toEqual([]);
  });

  it("DB取得エラー時は 500 を返す", async () => {
    tableChains["reorders"] = createChain({ data: null, error: { message: "DB error" } });

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("ステータスの逆マッピングが正しい（approved→confirmed）", async () => {
    tableChains["reorders"] = createChain({
      data: [{
        reorder_number: 1, patient_id: "P001", product_code: "MJ-2.5",
        status: "approved", timestamp: "2026-01-01T00:00:00Z",
        note: "", line_uid: "", line_notify_result: null,
      }],
      error: null,
    });
    tableChains["patients"] = createChain({
      data: [{ patient_id: "P001", name: "テスト" }],
      error: null,
    });
    tableChains["intake"] = createChain({ data: [], error: null });

    const req = createGetRequest(true);
    const res = await GET(req);
    const json = await res.json();
    expect(json.reorders[0].status).toBe("confirmed");
  });

  it("タイムスタンプがJST形式に変換される", async () => {
    tableChains["reorders"] = createChain({
      data: [{
        reorder_number: 1, patient_id: "P001", product_code: "MJ-2.5",
        status: "pending", timestamp: "2026-01-15T03:30:00Z", // UTC 3:30 → JST 12:30
        note: "", line_uid: "", line_notify_result: null,
      }],
      error: null,
    });
    tableChains["patients"] = createChain({
      data: [{ patient_id: "P001", name: "テスト" }],
      error: null,
    });
    tableChains["intake"] = createChain({ data: [], error: null });

    const req = createGetRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(json.reorders[0].timestamp).toBe("2026/01/15 12:30");
  });

  it("タイムスタンプが null の場合は '-' を返す", async () => {
    tableChains["reorders"] = createChain({
      data: [{
        reorder_number: 1, patient_id: "P001", product_code: "MJ-2.5",
        status: "pending", timestamp: null,
        note: "", line_uid: "", line_notify_result: null,
      }],
      error: null,
    });
    tableChains["patients"] = createChain({
      data: [{ patient_id: "P001", name: "テスト" }],
      error: null,
    });
    tableChains["intake"] = createChain({ data: [], error: null });

    const req = createGetRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(json.reorders[0].timestamp).toBe("-");
  });
});

// =============================================
// POST /api/admin/reorders/approve（承認）
// =============================================
import { POST as approvePOST } from "@/app/api/admin/reorders/approve/route";

describe("POST /api/admin/reorders/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockPushMessage.mockResolvedValue({ ok: true });
    mockInvalidateCache.mockResolvedValue(undefined);
    (globalThis.fetch as any).mockResolvedValue({ ok: true });
  });

  function createApproveRequest(body: any) {
    return new Request("http://localhost/api/admin/reorders/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as any;
  }

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createApproveRequest({ id: 1 });
    const res = await approvePOST(req);
    expect(res.status).toBe(401);
  });

  it("id がない場合は 400 を返す", async () => {
    const req = createApproveRequest({});
    const res = await approvePOST(req);
    expect(res.status).toBe(400);
  });

  it("reorder が見つからない場合は 404 を返す", async () => {
    tableChains["reorders"] = createChain({ data: null, error: { message: "not found" } });
    const req = createApproveRequest({ id: 999 });
    const res = await approvePOST(req);
    expect(res.status).toBe(404);
  });

  it("既に処理済みの場合は ok: true と message を返す", async () => {
    tableChains["reorders"] = createChain({
      data: { id: 1, patient_id: "P001", status: "confirmed", product_code: "MJ-2.5" },
      error: null,
    });
    const req = createApproveRequest({ id: 1 });
    const res = await approvePOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain("既に処理済み");
  });

  it("DB更新エラー時は 500 を返す", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending", product_code: "MJ-2.5" },
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

    const req = createApproveRequest({ id: 1 });
    const res = await approvePOST(req);
    expect(res.status).toBe(500);
  });

  it("正常に承認して ok: true を返す", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending", product_code: "MJ-2.5" },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let reorderCallCount = 0;
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reorders") {
        reorderCallCount++;
        if (reorderCallCount === 1) return selectChain;
        return updateChain; // status更新、karte_note更新、line_notify_result更新
      }
      if (table === "patients") {
        return createChain({ data: { line_id: "U_LINE_001" }, error: null });
      }
      if (table === "message_log") return createChain();
      return getOrCreateChain(table);
    });

    const req = createApproveRequest({ id: 1 });
    const res = await approvePOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("承認後にキャッシュ無効化が呼ばれる", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending", product_code: "MJ-2.5" },
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
      if (table === "patients") {
        return createChain({ data: { line_id: null }, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createApproveRequest({ id: 1 });
    await approvePOST(req);
    expect(mockInvalidateCache).toHaveBeenCalledWith("P001");
  });

  it("承認後に監査ログが記録される", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending", product_code: "MJ-2.5" },
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
      if (table === "patients") {
        return createChain({ data: { line_id: null }, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createApproveRequest({ id: 1 });
    await approvePOST(req);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.anything(),
      "reorder.approve",
      "reorder",
      "1",
      expect.objectContaining({ patient_id: "P001" })
    );
  });

  it("リッチメニュー自動切替が呼ばれる", async () => {
    const selectChain = createChain({
      data: { id: 1, patient_id: "P001", status: "pending", product_code: "MJ-2.5" },
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
      if (table === "patients") {
        return createChain({ data: { line_id: null }, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createApproveRequest({ id: 1 });
    await approvePOST(req);
    expect(mockEvaluateMenuRules).toHaveBeenCalled();
  });
});

// =============================================
// POST /api/admin/reorders/reject（却下）
// =============================================
import { POST as rejectPOST } from "@/app/api/admin/reorders/reject/route";

describe("POST /api/admin/reorders/reject", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockInvalidateCache.mockResolvedValue(undefined);
    (globalThis.fetch as any).mockResolvedValue({ ok: true });
    // approve テストで mockImplementation が上書きされるのでリセット
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.from as any).mockImplementation((table: string) => getOrCreateChain(table));
  });

  function createRejectRequest(body: any) {
    return new Request("http://localhost/api/admin/reorders/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as any;
  }

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRejectRequest({ id: 1 });
    const res = await rejectPOST(req);
    expect(res.status).toBe(401);
  });

  it("id がない場合は 400 を返す", async () => {
    const req = createRejectRequest({});
    const res = await rejectPOST(req);
    expect(res.status).toBe(400);
  });

  it("reorder が見つからない場合は 404 を返す", async () => {
    tableChains["reorders"] = createChain({ data: null, error: { message: "not found" } });
    const req = createRejectRequest({ id: 999 });
    const res = await rejectPOST(req);
    expect(res.status).toBe(404);
  });

  it("既に処理済みの場合は ok: true と message を返す", async () => {
    tableChains["reorders"] = createChain({
      data: { id: 1, patient_id: "P001", status: "confirmed" },
      error: null,
    });
    const req = createRejectRequest({ id: 1 });
    const res = await rejectPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain("既に処理済み");
  });

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

    const req = createRejectRequest({ id: 1 });
    const res = await rejectPOST(req);
    expect(res.status).toBe(500);
  });

  it("正常に却下して ok: true を返す", async () => {
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

    const req = createRejectRequest({ id: 1 });
    const res = await rejectPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("却下後にキャッシュ無効化が呼ばれる", async () => {
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

    const req = createRejectRequest({ id: 1 });
    await rejectPOST(req);
    expect(mockInvalidateCache).toHaveBeenCalledWith("P001");
  });

  it("却下後に監査ログが記録される", async () => {
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

    const req = createRejectRequest({ id: 1 });
    await rejectPOST(req);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.anything(),
      "reorder.reject",
      "reorder",
      "1"
    );
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

    const req = createRejectRequest({ id: 1 });
    await rejectPOST(req);
    expect(mockInvalidateCache).not.toHaveBeenCalled();
  });
});
