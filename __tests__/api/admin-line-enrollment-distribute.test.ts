// __tests__/api/admin-line-enrollment-distribute.test.ts
// クーポン配布 + ステップ配信登録者管理の統合テスト
// 対象: coupons/[id]/distribute, step-scenarios/[id]/enrollments

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "count", "csv", "rpc",
  ].forEach((m) => {
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

const mockVerifyAdminAuth = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((tid: unknown) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request, _schema: unknown) => {
    const body = await req.clone().json();
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/line-management", () => ({
  distributeCouponSchema: {},
  enrollStepSchema: {},
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn(() => ({ ok: true })),
}));

// resolveTargetsをモック（broadcast routeからexportされている）
vi.mock("@/app/api/admin/line/broadcast/route", () => ({
  resolveTargets: vi.fn(() => []),
}));

vi.mock("@/lib/step-enrollment", () => ({
  enrollPatient: vi.fn(),
}));

// NextRequest互換
function createReq(method: string, url: string, body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as Request & { nextUrl: URL };
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象インポート
// ============================================================
import { POST as distributePOST } from "@/app/api/admin/line/coupons/[id]/distribute/route";
import { GET as enrollmentsGET, POST as enrollmentsPOST, DELETE as enrollmentsDELETE } from "@/app/api/admin/line/step-scenarios/[id]/enrollments/route";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ============================================================
// 1. クーポン配布（coupons/[id]/distribute）
// ============================================================
describe("coupons/[id]/distribute API", () => {
  const makeParams = () => Promise.resolve({ id: "1" });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await distributePOST(
      createReq("POST", "http://localhost/api/admin/line/coupons/1/distribute", { filter_rules: {} }) as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(401);
  });

  it("POST クーポン不存在 → 404", async () => {
    // couponsチェーンがエラーまたはデータなし
    const couponsChain = createChain({ data: null, error: { message: "not found" } });
    tableChains["coupons"] = couponsChain;

    const res = await distributePOST(
      createReq("POST", "http://localhost/api/admin/line/coupons/999/distribute", { filter_rules: {} }) as any,
      { params: Promise.resolve({ id: "999" }) },
    );
    expect(res.status).toBe(404);
  });

  it("POST 対象者0人 → distributed=0", async () => {
    const couponsChain = createChain({
      data: { id: 1, name: "テストクーポン", code: "TEST", discount_type: "percent", discount_value: 10 },
      error: null,
    });
    tableChains["coupons"] = couponsChain;

    // resolveTargets → 空配列（モックのデフォルト）

    const res = await distributePOST(
      createReq("POST", "http://localhost/api/admin/line/coupons/1/distribute", { filter_rules: {} }) as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.distributed).toBe(0);
  });

  it("POST 対象者あり → 配布実行", async () => {
    const couponsChain = createChain({
      data: { id: 1, name: "テストクーポン", code: "TEST", discount_type: "percent", discount_value: 10, valid_until: null },
      error: null,
    });
    tableChains["coupons"] = couponsChain;

    const couponIssuesChain = createChain({ data: [], error: null });
    tableChains["coupon_issues"] = couponIssuesChain;

    const messageLogChain = createChain({ data: null, error: null });
    tableChains["message_log"] = messageLogChain;

    // resolveTargets モック更新
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");
    (resolveTargets as ReturnType<typeof vi.fn>).mockResolvedValue([
      { patient_id: "p1", line_id: "U001" },
      { patient_id: "p2", line_id: "U002" },
    ]);

    const res = await distributePOST(
      createReq("POST", "http://localhost/api/admin/line/coupons/1/distribute", { filter_rules: {} }) as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.distributed).toBe(2);
    expect(json.sent).toBe(2);
  });
});

// ============================================================
// 2. ステップ配信登録者管理（step-scenarios/[id]/enrollments）
// ============================================================
describe("step-scenarios/[id]/enrollments API", () => {
  const makeParams = () => Promise.resolve({ id: "10" });

  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await enrollmentsGET(
      createReq("GET", "http://localhost/api/admin/line/step-scenarios/10/enrollments") as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(401);
  });

  it("GET 登録者一覧 → 200", async () => {
    const enrollChain = createChain({ data: [{ id: 1, patient_id: "p1", status: "active" }], error: null });
    tableChains["step_enrollments"] = enrollChain;
    const patientsChain = createChain({ data: [{ patient_id: "p1", name: "テスト太郎" }], error: null });
    tableChains["patients"] = patientsChain;

    const res = await enrollmentsGET(
      createReq("GET", "http://localhost/api/admin/line/step-scenarios/10/enrollments") as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enrollments).toBeDefined();
    expect(json.enrollments[0].patient_name).toBe("テスト太郎");
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await enrollmentsPOST(
      createReq("POST", "http://localhost/api/admin/line/step-scenarios/10/enrollments", { patient_ids: ["p1"] }) as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(401);
  });

  it("POST 手動登録 → enrolled数を返す", async () => {
    const patientsChain = createChain({ data: { line_id: "U001" }, error: null });
    tableChains["patients"] = patientsChain;

    const res = await enrollmentsPOST(
      createReq("POST", "http://localhost/api/admin/line/step-scenarios/10/enrollments", { patient_ids: ["p1", "p2"] }) as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.enrolled).toBe(2);
  });

  it("DELETE 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await enrollmentsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/step-scenarios/10/enrollments?patient_id=p1") as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(401);
  });

  it("DELETE patient_idなし → 400", async () => {
    const res = await enrollmentsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/step-scenarios/10/enrollments") as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 正常 → 200", async () => {
    const enrollChain = createChain({ data: null, error: null });
    tableChains["step_enrollments"] = enrollChain;

    const res = await enrollmentsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/step-scenarios/10/enrollments?patient_id=p1") as any,
      { params: makeParams() },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
