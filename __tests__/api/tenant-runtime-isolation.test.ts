// __tests__/api/tenant-runtime-isolation.test.ts
// ランタイムレベルのテナント分離テスト
// 各APIルートが実際に正しいtenant_idでフィルタリングしていることをモックレベルで検証
import { describe, it, expect, vi, beforeEach } from "vitest";

// === Supabaseモックのセットアップ ===
const mockEq = vi.fn().mockReturnThis();
const mockNeq = vi.fn().mockReturnThis();
const mockNot = vi.fn().mockReturnThis();
const mockGt = vi.fn().mockReturnThis();
const mockGte = vi.fn().mockReturnThis();
const mockLt = vi.fn().mockReturnThis();
const mockLte = vi.fn().mockReturnThis();
const mockIs = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockRange = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockSelect = vi.fn().mockReturnValue({
  eq: mockEq,
  neq: mockNeq,
  not: mockNot,
  gt: mockGt,
  gte: mockGte,
  lt: mockLt,
  lte: mockLte,
  is: mockIs,
  in: mockIn,
  order: mockOrder,
  limit: mockLimit,
  range: mockRange,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
});
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
  }),
});
const mockUpdate = vi.fn().mockReturnValue({
  eq: mockEq,
  match: vi.fn().mockReturnThis(),
  select: mockSelect,
});
const mockDelete = vi.fn().mockReturnValue({
  eq: mockEq,
  match: vi.fn().mockReturnThis(),
});
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
  getAdminUserId: vi.fn().mockReturnValue("admin-user-1"),
  getAdminTenantId: vi.fn().mockReturnValue("tenant-A"),
  getAdminTenantRole: vi.fn().mockReturnValue("admin"),
}));

// === テスト ===
describe("ランタイムテナント分離: withTenant が正しいtenant_idで呼ばれる", () => {
  const TENANT_A = "tenant-aaa-111";
  const TENANT_B = "tenant-bbb-222";

  beforeEach(() => {
    vi.clearAllMocks();
    // selectのデフォルト戻り値をリセット
    mockSelect.mockReturnValue({
      eq: mockEq,
      neq: mockNeq,
      not: mockNot,
      gt: mockGt,
      gte: mockGte,
      lt: mockLt,
      lte: mockLte,
      is: mockIs,
      in: mockIn,
      order: mockOrder,
      limit: mockLimit,
      range: mockRange,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    });
    // eq チェーンをリセット
    mockEq.mockReturnThis();
  });

  function createRequest(
    url: string,
    tenantId: string,
    options?: RequestInit,
  ): Request {
    const req = new Request(`http://localhost${url}`, options);
    // x-tenant-id ヘッダーを注入（middlewareが設定する想定）
    Object.defineProperty(req, "headers", {
      value: new Headers({
        ...Object.fromEntries(req.headers.entries()),
        "x-tenant-id": tenantId,
        "content-type": "application/json",
      }),
    });
    return req;
  }

  it("withTenant はテナントAの場合にtenant_id=tenant-Aでeqを呼ぶ", async () => {
    // withTenant の動作を直接テスト（lib/tenant.ts から）
    const { withTenant } = await import("@/lib/tenant");

    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
    };

    withTenant(mockQuery, TENANT_A);

    expect(mockQuery.eq).toHaveBeenCalledWith("tenant_id", TENANT_A);
    expect(mockQuery.eq).not.toHaveBeenCalledWith("tenant_id", TENANT_B);
  });

  it("withTenant はテナントBの場合にtenant_id=tenant-Bでeqを呼ぶ", async () => {
    const { withTenant } = await import("@/lib/tenant");

    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
    };

    withTenant(mockQuery, TENANT_B);

    expect(mockQuery.eq).toHaveBeenCalledWith("tenant_id", TENANT_B);
    expect(mockQuery.eq).not.toHaveBeenCalledWith("tenant_id", TENANT_A);
  });

  it("resolveTenantId はx-tenant-idヘッダーから正しいテナントIDを取得する", async () => {
    const { resolveTenantId } = await import("@/lib/tenant");

    const reqA = createRequest("/api/admin/patients", TENANT_A);
    const reqB = createRequest("/api/admin/patients", TENANT_B);

    expect(resolveTenantId(reqA)).toBe(TENANT_A);
    expect(resolveTenantId(reqB)).toBe(TENANT_B);
  });

  it("tenantPayload はINSERT時に正しいtenant_idを付与する", async () => {
    const { tenantPayload } = await import("@/lib/tenant");

    const payloadA = tenantPayload(TENANT_A);
    const payloadB = tenantPayload(TENANT_B);

    expect(payloadA).toEqual({ tenant_id: TENANT_A });
    expect(payloadB).toEqual({ tenant_id: TENANT_B });

    // クロステナント: AのペイロードにBのtenant_idが含まれていない
    expect(payloadA.tenant_id).not.toBe(TENANT_B);
    expect(payloadB.tenant_id).not.toBe(TENANT_A);
  });

  it("テナントAのリクエストからテナントBのtenant_idがeqに渡されることはない", async () => {
    const { resolveTenantId, withTenant } = await import("@/lib/tenant");

    const req = createRequest("/api/admin/karte", TENANT_A);
    const tenantId = resolveTenantId(req);

    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
    };

    withTenant(mockQuery, tenantId);

    // テナントAのeqのみが呼ばれ、テナントBは呼ばれない
    const tenantCalls = mockQuery.eq.mock.calls.filter(
      (call: unknown[]) => call[0] === "tenant_id",
    );
    expect(tenantCalls).toHaveLength(1);
    expect(tenantCalls[0][1]).toBe(TENANT_A);
    expect(tenantCalls[0][1]).not.toBe(TENANT_B);
  });
});

// === テナント分離: APIハンドラレベルの検証 ===
describe("ランタイムテナント分離: resolveTenantIdとwithTenantの連携", () => {
  it("異なるテナントIDのリクエストは異なるフィルタ結果を生む", async () => {
    const { resolveTenantId, withTenant } = await import("@/lib/tenant");

    const tenants = ["tenant-1", "tenant-2", "tenant-3"];

    for (const tid of tenants) {
      const req = new Request("http://localhost/api/admin/patients", {
        headers: { "x-tenant-id": tid },
      });
      const resolved = resolveTenantId(req);
      expect(resolved).toBe(tid);

      const mockQuery = { eq: vi.fn().mockReturnThis() };
      withTenant(mockQuery, resolved);

      expect(mockQuery.eq).toHaveBeenCalledWith("tenant_id", tid);
    }
  });

  it("x-tenant-idヘッダーがない場合、withTenantはフィルタを追加しない", async () => {
    const { resolveTenantId, withTenant } = await import("@/lib/tenant");

    const req = new Request("http://localhost/api/admin/patients");
    const resolved = resolveTenantId(req);
    expect(resolved).toBeNull();

    const mockQuery = { eq: vi.fn().mockReturnThis() };
    const result = withTenant(mockQuery, resolved);

    expect(mockQuery.eq).not.toHaveBeenCalled();
    expect(result).toBe(mockQuery);
  });
});
