// __tests__/api/admin-crud-batch2.test.ts
// 管理者向けCRUD APIルートの統合テスト（バッチ2）
// 対象: stamp-cards, ec-subscriptions, dashboard-pie-charts, patient-subscriptions

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
    rpc: vi.fn(() => createChain({ data: { charts: [] }, error: null })),
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
import { GET as stampCardsGET, POST as stampCardsPOST } from "@/app/api/admin/stamp-cards/route";
import { GET as ecSubsGET, POST as ecSubsPOST } from "@/app/api/admin/ec-subscriptions/route";
import { GET as pieChartsGET } from "@/app/api/admin/dashboard-pie-charts/route";
import { GET as patSubsGET, POST as patSubsPOST, PUT as patSubsPUT } from "@/app/api/admin/patient-subscriptions/route";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ============================================================
// 1. stamp-cards
// ============================================================
describe("stamp-cards API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await stampCardsGET(createReq("GET", "http://localhost/api/admin/stamp-cards") as any);
    expect(res.status).toBe(401);
  });

  it("GET type=settings → 設定を返す", async () => {
    const settingsChain = createChain({ data: { stamps_required: 10, reward_type: "coupon" }, error: null });
    tableChains["stamp_card_settings"] = settingsChain;

    const res = await stampCardsGET(createReq("GET", "http://localhost/api/admin/stamp-cards?type=settings") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toBeDefined();
  });

  it("GET カード一覧 → 正常200", async () => {
    const cardsChain = createChain({ data: [], error: null, count: 0 });
    tableChains["stamp_cards"] = cardsChain;
    const settingsChain = createChain({ data: null, error: null });
    tableChains["stamp_card_settings"] = settingsChain;

    const res = await stampCardsGET(createReq("GET", "http://localhost/api/admin/stamp-cards") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cards).toBeDefined();
    expect(json.pagination).toBeDefined();
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await stampCardsPOST(createReq("POST", "http://localhost/api/admin/stamp-cards", { patient_id: 1 }) as any);
    expect(res.status).toBe(401);
  });

  it("POST スタンプ付与 → 新規カード作成", async () => {
    const settingsChain = createChain({ data: { stamps_required: 10 }, error: null });
    tableChains["stamp_card_settings"] = settingsChain;
    const cardsChain = createChain({ data: null, error: null });
    tableChains["stamp_cards"] = cardsChain;

    const res = await stampCardsPOST(createReq("POST", "http://localhost/api/admin/stamp-cards", { patient_id: 1 }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("completed");
  });
});

// ============================================================
// 2. ec-subscriptions
// ============================================================
describe("ec-subscriptions API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await ecSubsGET(createReq("GET", "http://localhost/api/admin/ec-subscriptions") as any);
    expect(res.status).toBe(401);
  });

  it("GET 一覧取得 → 正常200", async () => {
    const subsChain = createChain({ data: [], count: 0, error: null });
    tableChains["ec_subscriptions"] = subsChain;

    const res = await ecSubsGET(createReq("GET", "http://localhost/api/admin/ec-subscriptions") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.subscriptions).toBeDefined();
    expect(json.stats).toBeDefined();
  });

  it("GET statusフィルタ付き → 200", async () => {
    const subsChain = createChain({ data: [], count: 0, error: null });
    tableChains["ec_subscriptions"] = subsChain;

    const res = await ecSubsGET(createReq("GET", "http://localhost/api/admin/ec-subscriptions?status=active") as any);
    expect(res.status).toBe(200);
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await ecSubsPOST(createReq("POST", "http://localhost/api/admin/ec-subscriptions", { patient_id: 1, product_id: "prod-1" }) as any);
    expect(res.status).toBe(401);
  });

  it("POST patient_idなし → 400", async () => {
    const res = await ecSubsPOST(createReq("POST", "http://localhost/api/admin/ec-subscriptions", { product_id: "prod-1" }) as any);
    expect(res.status).toBe(400);
  });

  it("POST product_idなし → 400", async () => {
    const res = await ecSubsPOST(createReq("POST", "http://localhost/api/admin/ec-subscriptions", { patient_id: 1 }) as any);
    expect(res.status).toBe(400);
  });

  it("POST 正常 → 201", async () => {
    const subsChain = createChain({ data: { id: 1, status: "active" }, error: null });
    tableChains["ec_subscriptions"] = subsChain;

    const res = await ecSubsPOST(createReq("POST", "http://localhost/api/admin/ec-subscriptions", {
      patient_id: 1,
      product_id: "prod-1",
      interval: "monthly",
    }) as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST 不正interval → 400", async () => {
    const res = await ecSubsPOST(createReq("POST", "http://localhost/api/admin/ec-subscriptions", {
      patient_id: 1,
      product_id: "prod-1",
      interval: "weekly",
    }) as any);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 3. dashboard-pie-charts
// ============================================================
describe("dashboard-pie-charts API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await pieChartsGET(createReq("GET", "http://localhost/api/admin/dashboard-pie-charts") as any);
    expect(res.status).toBe(401);
  });

  it("GET 正常 → 200（RPCデータ返却）", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: { chart1: [], chart2: [] }, error: null }),
    );

    const res = await pieChartsGET(createReq("GET", "http://localhost/api/admin/dashboard-pie-charts?range=this_month") as any);
    expect(res.status).toBe(200);
  });

  it("GET カスタム日付範囲 → 200", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: {}, error: null }),
    );

    const res = await pieChartsGET(createReq("GET", "http://localhost/api/admin/dashboard-pie-charts?range=custom&start=2026-01-01&end=2026-01-31") as any);
    expect(res.status).toBe(200);
  });

  it("GET RPCエラー → 500", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: null, error: { message: "RPC failed" } }),
    );

    const res = await pieChartsGET(createReq("GET", "http://localhost/api/admin/dashboard-pie-charts") as any);
    expect(res.status).toBe(500);
  });
});

// ============================================================
// 4. patient-subscriptions
// ============================================================
describe("patient-subscriptions API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await patSubsGET(createReq("GET", "http://localhost/api/admin/patient-subscriptions") as any);
    expect(res.status).toBe(401);
  });

  it("GET 一覧 → 200", async () => {
    const psChain = createChain({ data: [{ id: 1, status: "active" }], error: null });
    tableChains["patient_subscriptions"] = psChain;

    const res = await patSubsGET(createReq("GET", "http://localhost/api/admin/patient-subscriptions") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subscriptions).toBeDefined();
  });

  it("GET patient_idフィルタ → 200", async () => {
    const psChain = createChain({ data: [], error: null });
    tableChains["patient_subscriptions"] = psChain;

    const res = await patSubsGET(createReq("GET", "http://localhost/api/admin/patient-subscriptions?patient_id=123") as any);
    expect(res.status).toBe(200);
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await patSubsPOST(createReq("POST", "http://localhost/api/admin/patient-subscriptions", { patient_id: 1, plan_id: 1 }) as any);
    expect(res.status).toBe(401);
  });

  it("POST patient_id/plan_idなし → 400", async () => {
    const res = await patSubsPOST(createReq("POST", "http://localhost/api/admin/patient-subscriptions", {}) as any);
    expect(res.status).toBe(400);
  });

  it("POST プラン不存在 → 400", async () => {
    const planChain = createChain({ data: null, error: null });
    tableChains["subscription_plans"] = planChain;

    const res = await patSubsPOST(createReq("POST", "http://localhost/api/admin/patient-subscriptions", { patient_id: 1, plan_id: 999 }) as any);
    expect(res.status).toBe(400);
  });

  it("POST 正常 → 201", async () => {
    const planChain = createChain({ data: { id: 1, trial_days: 0, interval_months: 1, gateway: "square" }, error: null });
    tableChains["subscription_plans"] = planChain;
    const psChain = createChain({ data: { id: 10, status: "active" }, error: null });
    tableChains["patient_subscriptions"] = psChain;

    const res = await patSubsPOST(createReq("POST", "http://localhost/api/admin/patient-subscriptions", { patient_id: 1, plan_id: 1 }) as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.subscription).toBeDefined();
  });

  it("PUT 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await patSubsPUT(createReq("PUT", "http://localhost/api/admin/patient-subscriptions", { id: 1, status: "cancelled" }) as any);
    expect(res.status).toBe(401);
  });

  it("PUT idなし → 400", async () => {
    const res = await patSubsPUT(createReq("PUT", "http://localhost/api/admin/patient-subscriptions", {}) as any);
    expect(res.status).toBe(400);
  });

  it("PUT 正常 → 200", async () => {
    const psChain = createChain({ data: { id: 1, status: "cancelled" }, error: null });
    tableChains["patient_subscriptions"] = psChain;

    const res = await patSubsPUT(createReq("PUT", "http://localhost/api/admin/patient-subscriptions", { id: 1, status: "cancelled" }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subscription).toBeDefined();
  });
});
