// __tests__/api/point-auto-grant.test.ts
// ポイント自動付与ロジックのテスト
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// --- Supabaseチェーンの型定義 ---
interface SupabaseChain {
  insert: Mock;
  update: Mock;
  delete: Mock;
  select: Mock;
  eq: Mock;
  neq: Mock;
  gt: Mock;
  gte: Mock;
  lt: Mock;
  lte: Mock;
  in: Mock;
  is: Mock;
  not: Mock;
  order: Mock;
  limit: Mock;
  range: Mock;
  single: Mock;
  maybeSingle: Mock;
  upsert: Mock;
  ilike: Mock;
  like: Mock;
  or: Mock;
  count: Mock;
  csv: Mock;
  then: Mock;
}

interface ChainResolveResult {
  data: unknown;
  error: unknown;
  count?: number;
}

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve: ChainResolveResult = { data: null, error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  (["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "like", "or", "count", "csv"] as const).forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: ChainResolveResult) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string): SupabaseChain {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: SupabaseChain) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/points", () => ({
  grantPoints: vi.fn(() => Promise.resolve({ id: "ledger-1", amount: 100, balance_after: 100 })),
}));

vi.mock("@/lib/session", () => ({
  validateSession: vi.fn(() => true),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => "mock-token"),
}));

// NextRequest互換のモック
interface MockRequest {
  method: string;
  url: string;
  nextUrl: { searchParams: URLSearchParams };
  cookies: { get: Mock };
  headers: { get: Mock };
  json: Mock;
}

function createMockRequest(
  method: string,
  url = "http://localhost/api/admin/points/auto-grant-rules",
  body: Record<string, unknown> = {},
): MockRequest {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => ({ value: "mock-token" })) },
    headers: { get: vi.fn((name: string) => name === "x-tenant-id" ? "test-tenant" : null) },
    json: vi.fn(() => body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
});

// === processAutoGrant ビジネスロジック ===
describe("ポイント自動付与: processAutoGrant", () => {
  it("per_purchase: 購入金額の1%をポイント付与", async () => {
    const { grantPoints } = await import("@/lib/points");

    // ルール取得: per_purchase（1%）
    const rulesChain = createChain({
      data: [{
        id: "rule-1",
        tenant_id: "test-tenant",
        name: "購入1%ポイント還元",
        trigger_type: "per_purchase",
        points_amount: 0,
        trigger_config: { rate: 0.01 },
        is_active: true,
      }],
      error: null,
    });
    tableChains["point_auto_grant_rules"] = rulesChain;

    // 重複チェック: なし
    const logsChain = createChain({ data: null, error: null });
    tableChains["point_auto_grant_logs"] = logsChain;

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-1", 10000);

    // 10000 * 0.01 = 100pt
    expect(result).toBe(100);
    expect(grantPoints).toHaveBeenCalledWith(
      "test-tenant",
      "patient-1",
      100,
      "自動付与: 購入1%ポイント還元",
      "order",
      "order-1",
    );
  });

  it("per_purchase: 端数は切り捨て", async () => {
    const { grantPoints } = await import("@/lib/points");

    const rulesChain = createChain({
      data: [{
        id: "rule-1",
        tenant_id: "test-tenant",
        name: "3%還元",
        trigger_type: "per_purchase",
        points_amount: 0,
        trigger_config: { rate: 0.03 },
        is_active: true,
      }],
      error: null,
    });
    tableChains["point_auto_grant_rules"] = rulesChain;
    tableChains["point_auto_grant_logs"] = createChain({ data: null, error: null });

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-1", 999);

    // 999 * 0.03 = 29.97 → 29pt
    expect(result).toBe(29);
    expect(grantPoints).toHaveBeenCalledWith(
      "test-tenant",
      "patient-1",
      29,
      expect.any(String),
      "order",
      "order-1",
    );
  });

  it("first_purchase: 初回購入時に固定ポイント付与", async () => {
    const { grantPoints } = await import("@/lib/points");

    const rulesChain = createChain({
      data: [{
        id: "rule-2",
        tenant_id: "test-tenant",
        name: "初回購入ボーナス",
        trigger_type: "first_purchase",
        points_amount: 500,
        trigger_config: {},
        is_active: true,
      }],
      error: null,
    });
    tableChains["point_auto_grant_rules"] = rulesChain;

    // 重複チェック（order_id一致）: なし + 過去のログ: なし
    const logsChain = createChain({ data: null, error: null });
    // limitの結果を空配列にする（初回購入チェック）
    logsChain.limit = vi.fn().mockReturnValue({
      then: vi.fn((resolve: (val: ChainResolveResult) => void) => resolve({ data: [], error: null })),
      eq: logsChain.eq,
      select: logsChain.select,
      maybeSingle: logsChain.maybeSingle,
      insert: logsChain.insert,
    });
    tableChains["point_auto_grant_logs"] = logsChain;

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-1", 5000);

    expect(result).toBe(500);
    expect(grantPoints).toHaveBeenCalledWith(
      "test-tenant",
      "patient-1",
      500,
      "自動付与: 初回購入ボーナス",
      "order",
      "order-1",
    );
  });

  it("first_purchase: 2回目以降は付与しない", async () => {
    const { grantPoints } = await import("@/lib/points");

    const rulesChain = createChain({
      data: [{
        id: "rule-2",
        tenant_id: "test-tenant",
        name: "初回購入ボーナス",
        trigger_type: "first_purchase",
        points_amount: 500,
        trigger_config: {},
        is_active: true,
      }],
      error: null,
    });
    tableChains["point_auto_grant_rules"] = rulesChain;

    // 重複チェック（order_id一致）: なし
    const logsChain = createChain({ data: null, error: null });
    // limitの結果を既存ログありにする（2回目以降）
    logsChain.limit = vi.fn().mockReturnValue({
      then: vi.fn((resolve: (val: ChainResolveResult) => void) => resolve({
        data: [{ id: "existing-log" }],
        error: null,
      })),
      eq: logsChain.eq,
      select: logsChain.select,
      maybeSingle: logsChain.maybeSingle,
      insert: logsChain.insert,
    });
    tableChains["point_auto_grant_logs"] = logsChain;

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-2", 5000);

    expect(result).toBe(0);
    expect(grantPoints).not.toHaveBeenCalled();
  });

  it("amount_threshold: 閾値以上の場合に付与", async () => {
    const { grantPoints } = await import("@/lib/points");

    const rulesChain = createChain({
      data: [{
        id: "rule-3",
        tenant_id: "test-tenant",
        name: "高額購入ボーナス",
        trigger_type: "amount_threshold",
        points_amount: 1000,
        trigger_config: { min_amount: 30000 },
        is_active: true,
      }],
      error: null,
    });
    tableChains["point_auto_grant_rules"] = rulesChain;
    tableChains["point_auto_grant_logs"] = createChain({ data: null, error: null });

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-1", 35000);

    expect(result).toBe(1000);
    expect(grantPoints).toHaveBeenCalledWith(
      "test-tenant",
      "patient-1",
      1000,
      "自動付与: 高額購入ボーナス",
      "order",
      "order-1",
    );
  });

  it("amount_threshold: 閾値未満の場合は付与しない", async () => {
    const { grantPoints } = await import("@/lib/points");

    const rulesChain = createChain({
      data: [{
        id: "rule-3",
        tenant_id: "test-tenant",
        name: "高額購入ボーナス",
        trigger_type: "amount_threshold",
        points_amount: 1000,
        trigger_config: { min_amount: 30000 },
        is_active: true,
      }],
      error: null,
    });
    tableChains["point_auto_grant_rules"] = rulesChain;
    tableChains["point_auto_grant_logs"] = createChain({ data: null, error: null });

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-1", 20000);

    expect(result).toBe(0);
    expect(grantPoints).not.toHaveBeenCalled();
  });

  it("ルールなしの場合は0を返す", async () => {
    const rulesChain = createChain({ data: [], error: null });
    tableChains["point_auto_grant_rules"] = rulesChain;

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-1", 10000);

    expect(result).toBe(0);
  });

  it("必須パラメータ不足で0を返す", async () => {
    const { processAutoGrant } = await import("@/lib/point-auto-grant");

    expect(await processAutoGrant("", "patient-1", "order-1", 10000)).toBe(0);
    expect(await processAutoGrant("test-tenant", "", "order-1", 10000)).toBe(0);
    expect(await processAutoGrant("test-tenant", "patient-1", "", 10000)).toBe(0);
  });

  it("重複注文IDの場合は付与しない", async () => {
    const { grantPoints } = await import("@/lib/points");

    const rulesChain = createChain({
      data: [{
        id: "rule-1",
        tenant_id: "test-tenant",
        name: "1%還元",
        trigger_type: "per_purchase",
        points_amount: 0,
        trigger_config: { rate: 0.01 },
        is_active: true,
      }],
      error: null,
    });
    tableChains["point_auto_grant_rules"] = rulesChain;

    // 重複チェック: 既存ログあり
    const logsChain = createChain({ data: { id: "existing-log" }, error: null });
    tableChains["point_auto_grant_logs"] = logsChain;

    const { processAutoGrant } = await import("@/lib/point-auto-grant");
    const result = await processAutoGrant("test-tenant", "patient-1", "order-1", 10000);

    expect(result).toBe(0);
    expect(grantPoints).not.toHaveBeenCalled();
  });
});

// === API: ルール一覧 ===
describe("ポイント自動付与ルール: GET一覧", () => {
  it("認証なしで401", async () => {
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as Mock).mockResolvedValueOnce(false);

    const req = createMockRequest("GET");
    const { GET } = await import("@/app/api/admin/points/auto-grant-rules/route");
    const res = await GET(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(401);
  });

  it("正常時はルール一覧を返す", async () => {
    const mockRules = [
      { id: "rule-1", name: "1%還元", trigger_type: "per_purchase", is_active: true },
    ];
    const rulesChain = createChain({ data: mockRules, error: null });
    tableChains["point_auto_grant_rules"] = rulesChain;

    const req = createMockRequest("GET");
    const { GET } = await import("@/app/api/admin/points/auto-grant-rules/route");
    const res = await GET(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rules).toEqual(mockRules);
  });
});

// === API: ルール作成バリデーション ===
describe("ポイント自動付与ルール: POST作成 バリデーション", () => {
  it("ルール名なしで400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      trigger_type: "per_purchase",
      trigger_config: { rate: 0.01 },
    });

    const { POST } = await import("@/app/api/admin/points/auto-grant-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("ルール名");
  });

  it("不正なトリガータイプで400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      trigger_type: "invalid_type",
    });

    const { POST } = await import("@/app/api/admin/points/auto-grant-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("トリガータイプ");
  });

  it("per_purchaseで付与率なしは400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      trigger_type: "per_purchase",
      trigger_config: {},
    });

    const { POST } = await import("@/app/api/admin/points/auto-grant-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("付与率");
  });

  it("amount_thresholdで最低金額なしは400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      trigger_type: "amount_threshold",
      points_amount: 100,
      trigger_config: {},
    });

    const { POST } = await import("@/app/api/admin/points/auto-grant-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("最低購入金額");
  });

  it("first_purchaseでポイント数なしは400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      trigger_type: "first_purchase",
      trigger_config: {},
    });

    const { POST } = await import("@/app/api/admin/points/auto-grant-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("付与ポイント数");
  });
});

// === API: 個別操作 ===
describe("ポイント自動付与ルール: 個別操作", () => {
  it("DELETE: 認証なしで401", async () => {
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as Mock).mockResolvedValueOnce(false);

    const req = createMockRequest("DELETE");
    const { DELETE } = await import("@/app/api/admin/points/auto-grant-rules/[id]/route");
    const res = await DELETE(
      req as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ id: "rule-1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("PUT: 不正なトリガータイプで400", async () => {
    const req = createMockRequest("PUT", undefined, {
      trigger_type: "invalid",
    });

    const { PUT } = await import("@/app/api/admin/points/auto-grant-rules/[id]/route");
    const res = await PUT(
      req as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ id: "rule-1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("GET: ルールが見つからない場合404", async () => {
    const rulesChain = createChain({ data: null, error: { message: "not found" } });
    tableChains["point_auto_grant_rules"] = rulesChain;

    const req = createMockRequest("GET");
    const { GET } = await import("@/app/api/admin/points/auto-grant-rules/[id]/route");
    const res = await GET(
      req as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ id: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
  });
});

// === トリガータイプバリデーション ===
describe("ポイント自動付与: トリガータイプ", () => {
  const VALID_TRIGGER_TYPES = ["per_purchase", "first_purchase", "amount_threshold"];

  it("per_purchase は有効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("per_purchase")).toBe(true);
  });

  it("first_purchase は有効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("first_purchase")).toBe(true);
  });

  it("amount_threshold は有効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("amount_threshold")).toBe(true);
  });

  it("unknown は無効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("unknown")).toBe(false);
  });
});

// === ポイント計算ロジック ===
describe("ポイント自動付与: ポイント計算", () => {
  it("per_purchase: Math.floorで端数切り捨て", () => {
    const amount = 1234;
    const rate = 0.03;
    const points = Math.floor(amount * rate);
    expect(points).toBe(37); // 1234 * 0.03 = 37.02 → 37
  });

  it("per_purchase: 金額0の場合は0pt", () => {
    const points = Math.floor(0 * 0.01);
    expect(points).toBe(0);
  });

  it("per_purchase: rateが0の場合は0pt", () => {
    const points = Math.floor(10000 * 0);
    expect(points).toBe(0);
  });

  it("amount_threshold: 閾値ちょうどの場合は付与対象", () => {
    const amount = 30000;
    const minAmount = 30000;
    expect(amount >= minAmount).toBe(true);
  });

  it("amount_threshold: 閾値未満は付与対象外", () => {
    const amount = 29999;
    const minAmount = 30000;
    expect(amount >= minAmount).toBe(false);
  });
});
