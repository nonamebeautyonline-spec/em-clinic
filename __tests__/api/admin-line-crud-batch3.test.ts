// __tests__/api/admin-line-crud-batch3.test.ts
// LINE管理系CRUDルートの統合テスト（バッチ3 — ブランチカバレッジ強化）
// 対象: coupons, keyword-replies

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

vi.mock("@/lib/validations/line-common", () => ({
  createCouponSchema: {},
  keywordReplySchema: {},
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
import { GET as couponsGET, POST as couponsPOST, PUT as couponsPUT, DELETE as couponsDELETE } from "@/app/api/admin/line/coupons/route";
import { GET as kwGET, POST as kwPOST, PUT as kwPUT, DELETE as kwDELETE } from "@/app/api/admin/line/keyword-replies/route";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ============================================================
// 1. coupons
// ============================================================
describe("coupons API", () => {
  // -- GET --
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await couponsGET(createReq("GET", "http://localhost/api/admin/line/coupons") as any);
    expect(res.status).toBe(401);
  });

  it("GET 一覧 → 200（enriched）", async () => {
    const couponsChain = createChain({ data: [{ id: 1, name: "テスト" }], error: null });
    tableChains["coupons"] = couponsChain;
    const issuesChain = createChain({ data: null, error: null, count: 5 });
    tableChains["coupon_issues"] = issuesChain;

    const res = await couponsGET(createReq("GET", "http://localhost/api/admin/line/coupons") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.coupons).toBeDefined();
    expect(json.coupons[0].issued_count).toBeDefined();
  });

  it("GET DBエラー → 500", async () => {
    const couponsChain = createChain({ data: null, error: { message: "DB error" } });
    tableChains["coupons"] = couponsChain;

    const res = await couponsGET(createReq("GET", "http://localhost/api/admin/line/coupons") as any);
    expect(res.status).toBe(500);
  });

  // -- POST --
  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await couponsPOST(createReq("POST", "http://localhost/api/admin/line/coupons", { name: "test", code: "TEST", discount_value: 10 }) as any);
    expect(res.status).toBe(401);
  });

  it("POST コード重複 → 400", async () => {
    const couponsChain = createChain({ data: [{ id: 1 }], error: null });
    tableChains["coupons"] = couponsChain;

    const res = await couponsPOST(createReq("POST", "http://localhost/api/admin/line/coupons", {
      name: "テスト", code: "EXIST", discount_type: "fixed", discount_value: 500,
    }) as any);
    expect(res.status).toBe(400);
  });

  it("POST 正常作成 → 200", async () => {
    const couponsChain = createChain({ data: { id: 2, name: "新規" }, error: null });
    tableChains["coupons"] = couponsChain;
    // 重複チェック: 空結果
    couponsChain.then = vi.fn()
      .mockImplementationOnce((resolve: (val: unknown) => unknown) => resolve({ data: [], error: null })) // select (重複チェック)
      .mockImplementation((resolve: (val: unknown) => unknown) => resolve({ data: { id: 2 }, error: null })); // insert

    const res = await couponsPOST(createReq("POST", "http://localhost/api/admin/line/coupons", {
      name: "新規クーポン", code: "NEW1", discount_type: "percent", discount_value: 10,
      min_purchase: 1000, max_uses: 100, max_uses_per_patient: 1,
      valid_from: "2026-01-01", valid_until: "2026-12-31",
      description: "テスト", audience_type: "all",
    }) as any);
    expect(res.status).toBe(200);
  });

  it("POST デフォルト値で正常作成", async () => {
    const couponsChain = createChain({ data: { id: 3 }, error: null });
    tableChains["coupons"] = couponsChain;
    couponsChain.then = vi.fn()
      .mockImplementationOnce((resolve: (val: unknown) => unknown) => resolve({ data: [], error: null }))
      .mockImplementation((resolve: (val: unknown) => unknown) => resolve({ data: { id: 3 }, error: null }));

    const res = await couponsPOST(createReq("POST", "http://localhost/api/admin/line/coupons", {
      name: "テスト", code: "MIN", discount_value: 100,
    }) as any);
    expect(res.status).toBe(200);
  });

  // -- PUT --
  it("PUT 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await couponsPUT(createReq("PUT", "http://localhost/api/admin/line/coupons", { id: 1, name: "更新" }) as any);
    expect(res.status).toBe(401);
  });

  it("PUT idなし → 400", async () => {
    const res = await couponsPUT(createReq("PUT", "http://localhost/api/admin/line/coupons", { name: "更新" }) as any);
    expect(res.status).toBe(400);
  });

  it("PUT 正常更新 → 200", async () => {
    const couponsChain = createChain({ data: null, error: null });
    tableChains["coupons"] = couponsChain;

    const res = await couponsPUT(createReq("PUT", "http://localhost/api/admin/line/coupons", {
      id: 1, name: "更新", code: "UPD", discount_type: "percent", discount_value: 20,
      min_purchase: 500, max_uses: 50, max_uses_per_patient: 2,
      valid_from: "2026-01-01", valid_until: "2026-06-30",
      is_active: true, description: "更新テスト",
      audience_type: "specific", audience_patient_ids: ["p1"], audience_rules: { tag: 1 },
    }) as any);
    expect(res.status).toBe(200);
  });

  it("PUT デフォルト値で更新", async () => {
    const couponsChain = createChain({ data: null, error: null });
    tableChains["coupons"] = couponsChain;

    const res = await couponsPUT(createReq("PUT", "http://localhost/api/admin/line/coupons", {
      id: 1, name: "最小", code: "MIN", discount_value: 0,
    }) as any);
    expect(res.status).toBe(200);
  });

  it("PUT is_active=false → 無効化", async () => {
    const couponsChain = createChain({ data: null, error: null });
    tableChains["coupons"] = couponsChain;

    const res = await couponsPUT(createReq("PUT", "http://localhost/api/admin/line/coupons", {
      id: 1, name: "無効", code: "OFF", is_active: false,
    }) as any);
    expect(res.status).toBe(200);
  });

  // -- DELETE --
  it("DELETE 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await couponsDELETE(createReq("DELETE", "http://localhost/api/admin/line/coupons?id=1") as any);
    expect(res.status).toBe(401);
  });

  it("DELETE idなし → 400", async () => {
    const res = await couponsDELETE(createReq("DELETE", "http://localhost/api/admin/line/coupons") as any);
    expect(res.status).toBe(400);
  });

  it("DELETE 正常 → 200", async () => {
    const couponsChain = createChain({ data: null, error: null });
    tableChains["coupons"] = couponsChain;

    const res = await couponsDELETE(createReq("DELETE", "http://localhost/api/admin/line/coupons?id=1") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE DBエラー → 500", async () => {
    const couponsChain = createChain({ data: null, error: { message: "FK error" } });
    tableChains["coupons"] = couponsChain;

    const res = await couponsDELETE(createReq("DELETE", "http://localhost/api/admin/line/coupons?id=1") as any);
    expect(res.status).toBe(500);
  });
});

// ============================================================
// 2. keyword-replies
// ============================================================
describe("keyword-replies API", () => {
  // -- GET --
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await kwGET(createReq("GET", "http://localhost/api/admin/line/keyword-replies") as any);
    expect(res.status).toBe(401);
  });

  it("GET ルール一覧 → 200", async () => {
    const kwChain = createChain({ data: [{ id: 1, name: "テスト", keyword: "こんにちは" }], error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwGET(createReq("GET", "http://localhost/api/admin/line/keyword-replies") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toBeDefined();
  });

  it("GET DBエラー → 500", async () => {
    const kwChain = createChain({ data: null, error: { message: "DB error" } });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwGET(createReq("GET", "http://localhost/api/admin/line/keyword-replies") as any);
    expect(res.status).toBe(500);
  });

  // -- POST --
  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await kwPOST(createReq("POST", "http://localhost/api/admin/line/keyword-replies", { name: "test", keyword: "kw" }) as any);
    expect(res.status).toBe(401);
  });

  it("POST 正常作成 → 200", async () => {
    const kwChain = createChain({ data: { id: 1, name: "新規" }, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwPOST(createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
      name: "挨拶", keyword: "こんにちは", match_type: "partial", priority: 1,
      is_enabled: true, reply_type: "text", reply_text: "こんにちは！",
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST デフォルト値で作成", async () => {
    const kwChain = createChain({ data: { id: 2 }, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwPOST(createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
      name: "最小", keyword: "test",
    }) as any);
    expect(res.status).toBe(200);
  });

  it("POST 正規表現タイプ → 正常作成", async () => {
    const kwChain = createChain({ data: { id: 3 }, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwPOST(createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
      name: "正規表現", keyword: "^test.*$", match_type: "regex",
      reply_type: "template", reply_template_id: "tpl-1",
    }) as any);
    expect(res.status).toBe(200);
  });

  it("POST 不正な正規表現 → 400", async () => {
    const res = await kwPOST(createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
      name: "不正", keyword: "[invalid", match_type: "regex",
    }) as any);
    expect(res.status).toBe(400);
  });

  it("POST アクション返信タイプ", async () => {
    const kwChain = createChain({ data: { id: 4 }, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwPOST(createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
      name: "アクション", keyword: "予約", match_type: "exact",
      reply_type: "action", reply_action_id: "act-1",
      condition_rules: [{ field: "tag", op: "eq", value: "VIP" }],
    }) as any);
    expect(res.status).toBe(200);
  });

  it("POST is_enabled=false → 無効状態で作成", async () => {
    const kwChain = createChain({ data: { id: 5 }, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwPOST(createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
      name: "無効", keyword: "test", is_enabled: false,
    }) as any);
    expect(res.status).toBe(200);
  });

  // -- PUT --
  it("PUT 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await kwPUT(createReq("PUT", "http://localhost/api/admin/line/keyword-replies", { id: "1", name: "更新", keyword: "kw" }) as any);
    expect(res.status).toBe(401);
  });

  it("PUT idなし → 400", async () => {
    const res = await kwPUT(createReq("PUT", "http://localhost/api/admin/line/keyword-replies", { name: "更新", keyword: "kw" }) as any);
    expect(res.status).toBe(400);
  });

  it("PUT 正常更新 → 200", async () => {
    const kwChain = createChain({ data: { id: 1, name: "更新済" }, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwPUT(createReq("PUT", "http://localhost/api/admin/line/keyword-replies", {
      id: "1", name: "更新済", keyword: "更新", match_type: "partial",
      priority: 5, is_enabled: true, reply_type: "text", reply_text: "更新しました",
    }) as any);
    expect(res.status).toBe(200);
  });

  it("PUT 正規表現更新（不正） → 400", async () => {
    const res = await kwPUT(createReq("PUT", "http://localhost/api/admin/line/keyword-replies", {
      id: "1", name: "不正", keyword: "(unclosed", match_type: "regex",
    }) as any);
    expect(res.status).toBe(400);
  });

  it("PUT デフォルト値で更新", async () => {
    const kwChain = createChain({ data: { id: 1 }, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwPUT(createReq("PUT", "http://localhost/api/admin/line/keyword-replies", {
      id: "1", name: "最小", keyword: "test",
    }) as any);
    expect(res.status).toBe(200);
  });

  // -- DELETE --
  it("DELETE 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await kwDELETE(createReq("DELETE", "http://localhost/api/admin/line/keyword-replies?id=1") as any);
    expect(res.status).toBe(401);
  });

  it("DELETE idなし → 400", async () => {
    const res = await kwDELETE(createReq("DELETE", "http://localhost/api/admin/line/keyword-replies") as any);
    expect(res.status).toBe(400);
  });

  it("DELETE 正常 → 200", async () => {
    const kwChain = createChain({ data: null, error: null });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwDELETE(createReq("DELETE", "http://localhost/api/admin/line/keyword-replies?id=1") as any);
    expect(res.status).toBe(200);
  });

  it("DELETE DBエラー → 500", async () => {
    const kwChain = createChain({ data: null, error: { message: "FK error" } });
    tableChains["keyword_auto_replies"] = kwChain;

    const res = await kwDELETE(createReq("DELETE", "http://localhost/api/admin/line/keyword-replies?id=1") as any);
    expect(res.status).toBe(500);
  });
});
