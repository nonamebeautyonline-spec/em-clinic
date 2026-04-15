// __tests__/api/admin-line-crud-batch2.test.ts
// LINE管理系CRUDルートの統合テスト（バッチ2）
// 対象: action-folders, form-folders, menu-rules, backfill-stats

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
  createFolderSchema: {},
  updateFolderSchema: {},
  menuRuleSchema: {},
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  loadMenuRules: vi.fn(() => []),
  saveMenuRules: vi.fn(() => true),
  evaluateMenuRulesForMany: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => "mock-line-token"),
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
import { GET as actionFoldersGET, POST as actionFoldersPOST, PUT as actionFoldersPUT, DELETE as actionFoldersDELETE } from "@/app/api/admin/line/action-folders/route";
import { GET as formFoldersGET, POST as formFoldersPOST, PUT as formFoldersPUT, DELETE as formFoldersDELETE } from "@/app/api/admin/line/form-folders/route";
import { GET as menuRulesGET, POST as menuRulesPOST, DELETE as menuRulesDELETE, PUT as menuRulesPUT } from "@/app/api/admin/line/menu-rules/route";
import { GET as backfillStatsGET } from "@/app/api/admin/line/backfill-stats/route";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ============================================================
// 1. action-folders
// ============================================================
describe("action-folders API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await actionFoldersGET(createReq("GET", "http://localhost/api/admin/line/action-folders") as any);
    expect(res.status).toBe(401);
  });

  it("GET 一覧 → 200", async () => {
    const chain = createChain({ data: [{ id: 1, name: "テスト", actions: [{ count: 5 }] }], error: null });
    tableChains["action_folders"] = chain;

    const res = await actionFoldersGET(createReq("GET", "http://localhost/api/admin/line/action-folders") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.folders).toBeDefined();
  });

  it("POST フォルダ作成 → 200", async () => {
    const chain = createChain({ data: { id: 1, name: "新規" }, error: null });
    tableChains["action_folders"] = chain;

    const res = await actionFoldersPOST(createReq("POST", "http://localhost/api/admin/line/action-folders", { name: "新規フォルダ" }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await actionFoldersPOST(createReq("POST", "http://localhost/api/admin/line/action-folders", { name: "テスト" }) as any);
    expect(res.status).toBe(401);
  });

  it("PUT フォルダ名変更 → 200", async () => {
    const chain = createChain({ data: { id: 1, name: "変更後" }, error: null });
    tableChains["action_folders"] = chain;

    const res = await actionFoldersPUT(createReq("PUT", "http://localhost/api/admin/line/action-folders", { id: 1, name: "変更後" }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE idなし → 400", async () => {
    const res = await actionFoldersDELETE(createReq("DELETE", "http://localhost/api/admin/line/action-folders") as any);
    expect(res.status).toBe(400);
  });

  it("DELETE 正常 → 200", async () => {
    // 未分類フォルダが存在
    const chain = createChain({ data: { id: 99 }, error: null });
    tableChains["action_folders"] = chain;
    const actionsChain = createChain({ data: null, error: null });
    tableChains["actions"] = actionsChain;

    const res = await actionFoldersDELETE(createReq("DELETE", "http://localhost/api/admin/line/action-folders?id=1") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE 未分類フォルダ削除試行 → 400", async () => {
    const chain = createChain({ data: { id: 1 }, error: null });
    tableChains["action_folders"] = chain;

    const res = await actionFoldersDELETE(createReq("DELETE", "http://localhost/api/admin/line/action-folders?id=1") as any);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 2. form-folders
// ============================================================
describe("form-folders API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await formFoldersGET(createReq("GET", "http://localhost/api/admin/line/form-folders") as any);
    expect(res.status).toBe(401);
  });

  it("GET 一覧 → 200", async () => {
    const chain = createChain({ data: [{ id: 1, name: "テスト", forms: [{ count: 3 }] }], error: null });
    tableChains["form_folders"] = chain;

    const res = await formFoldersGET(createReq("GET", "http://localhost/api/admin/line/form-folders") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.folders).toBeDefined();
  });

  it("POST フォルダ作成 → 200", async () => {
    const chain = createChain({ data: { id: 1, name: "新規" }, error: null });
    tableChains["form_folders"] = chain;

    const res = await formFoldersPOST(createReq("POST", "http://localhost/api/admin/line/form-folders", { name: "新規" }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("PUT フォルダ名変更 → 200", async () => {
    const chain = createChain({ data: { id: 1, name: "変更" }, error: null });
    tableChains["form_folders"] = chain;

    const res = await formFoldersPUT(createReq("PUT", "http://localhost/api/admin/line/form-folders", { id: 1, name: "変更" }) as any);
    expect(res.status).toBe(200);
  });

  it("DELETE idなし → 400", async () => {
    const res = await formFoldersDELETE(createReq("DELETE", "http://localhost/api/admin/line/form-folders") as any);
    expect(res.status).toBe(400);
  });

  it("DELETE 正常 → 200", async () => {
    const chain = createChain({ data: { id: 99 }, error: null });
    tableChains["form_folders"] = chain;
    const formsChain = createChain({ data: null, error: null });
    tableChains["forms"] = formsChain;

    const res = await formFoldersDELETE(createReq("DELETE", "http://localhost/api/admin/line/form-folders?id=1") as any);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// 3. menu-rules
// ============================================================
describe("menu-rules API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await menuRulesGET(createReq("GET", "http://localhost/api/admin/line/menu-rules") as any);
    expect(res.status).toBe(401);
  });

  it("GET ルール一覧 → 200", async () => {
    const res = await menuRulesGET(createReq("GET", "http://localhost/api/admin/line/menu-rules") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toBeDefined();
  });

  it("POST 新規ルール作成 → 200", async () => {
    const res = await menuRulesPOST(createReq("POST", "http://localhost/api/admin/line/menu-rules", {
      rule: { name: "テストルール", target_menu_id: "menu-1", conditions: [] },
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await menuRulesPOST(createReq("POST", "http://localhost/api/admin/line/menu-rules", {
      rule: { name: "テスト", target_menu_id: "m1" },
    }) as any);
    expect(res.status).toBe(401);
  });

  it("DELETE idなし → 400", async () => {
    const res = await menuRulesDELETE(createReq("DELETE", "http://localhost/api/admin/line/menu-rules") as any);
    expect(res.status).toBe(400);
  });

  it("DELETE 正常 → 200", async () => {
    const res = await menuRulesDELETE(createReq("DELETE", "http://localhost/api/admin/line/menu-rules?id=rule-1") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("PUT 一括適用 → 200", async () => {
    const patientsChain = createChain({ data: [{ patient_id: "p1" }, { patient_id: "p2" }], error: null });
    tableChains["patients"] = patientsChain;

    const res = await menuRulesPUT(createReq("PUT", "http://localhost/api/admin/line/menu-rules") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.evaluated).toBe(2);
  });

  it("PUT 対象患者なし → evaluated=0", async () => {
    const patientsChain = createChain({ data: [], error: null });
    tableChains["patients"] = patientsChain;

    const res = await menuRulesPUT(createReq("PUT", "http://localhost/api/admin/line/menu-rules") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.evaluated).toBe(0);
  });
});

// ============================================================
// 4. backfill-stats
// ============================================================
describe("backfill-stats API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await backfillStatsGET(createReq("GET", "http://localhost/api/admin/line/backfill-stats") as any);
    expect(res.status).toBe(401);
  });

  it("GET LINEトークンなし → 500", async () => {
    const { getSettingOrEnv } = await import("@/lib/settings");
    (getSettingOrEnv as ReturnType<typeof vi.fn>).mockResolvedValue("");

    const res = await backfillStatsGET(createReq("GET", "http://localhost/api/admin/line/backfill-stats") as any);
    expect(res.status).toBe(500);
  });

  it("GET 正常（days=1, 既存データあり → skipped） → 200", async () => {
    const { getSettingOrEnv } = await import("@/lib/settings");
    (getSettingOrEnv as ReturnType<typeof vi.fn>).mockResolvedValue("mock-token");

    // line_daily_stats に既存データあり
    const statsChain = createChain({ data: { id: 1 }, error: null });
    tableChains["line_daily_stats"] = statsChain;

    const res = await backfillStatsGET(createReq("GET", "http://localhost/api/admin/line/backfill-stats?days=1") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toBeDefined();
    expect(json.results[0].status).toBe("skipped");
  });
});
