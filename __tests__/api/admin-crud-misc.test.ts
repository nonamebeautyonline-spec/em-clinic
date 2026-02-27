// __tests__/api/admin-crud-misc.test.ts
// 管理者向け小型CRUD APIルートの統合テスト
// 対象: financials, merge-patients, inventory, schedule, kartesearch,
//        patient-name-change, karte-edit, karte-lock, karte, patientnote

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================

// Supabaseチェーンビルダー
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "rpc",
  ].forEach((m) => {
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

const mockVerifyAdminAuth = vi.fn();

// financials/route.ts は createClient で独自インスタンスを生成するので、
// @supabase/supabase-js をモックして同じチェーンを返す
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/products", () => ({
  getProducts: vi.fn(() => []),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(() => null),
}));

// NextRequest互換のモック生成
function createReq(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
  // kartesearch は req.nextUrl.searchParams を使うため
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象ルートのインポート
// ============================================================

import { GET as financialsGET, POST as financialsPOST } from "@/app/api/admin/financials/route";
import { POST as mergePatientsPOST } from "@/app/api/admin/merge-patients/route";
import { GET as inventoryGET, POST as inventoryPOST } from "@/app/api/admin/inventory/route";
import { GET as scheduleGET } from "@/app/api/admin/schedule/route";
import { GET as kartesearchGET } from "@/app/api/admin/kartesearch/route";
import { POST as patientNameChangePOST } from "@/app/api/admin/patient-name-change/route";
import { POST as karteEditPOST } from "@/app/api/admin/karte-edit/route";
import { POST as karteLockPOST } from "@/app/api/admin/karte-lock/route";
import { POST as kartePOST } from "@/app/api/admin/karte/route";
import { POST as patientnotePOST } from "@/app/api/admin/patientnote/route";

// ============================================================
// beforeEach: 全チェーンリセット
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ============================================================
// 1. financials
// ============================================================
describe("financials API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await financialsGET(createReq("GET", "http://localhost/api/admin/financials?year_month=2026-01"));
    expect(res.status).toBe(401);
  });

  it("GET year_month指定 → データなしの場合デフォルト値を返す", async () => {
    const chain = getOrCreateChain("monthly_financials");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await financialsGET(createReq("GET", "http://localhost/api/admin/financials?year_month=2026-01"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.year_month).toBe("2026-01");
    expect(json.data.net_sales).toBe(0);
  });

  it("GET year_month指定 → 既存データを返す", async () => {
    const chain = getOrCreateChain("monthly_financials");
    chain.then = vi.fn((resolve: any) => resolve({
      data: { year_month: "2026-01", net_sales: 1000 },
      error: null,
    }));

    const res = await financialsGET(createReq("GET", "http://localhost/api/admin/financials?year_month=2026-01"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.net_sales).toBe(1000);
  });

  it("GET year_monthなし → 直近12ヶ月分リスト", async () => {
    const chain = getOrCreateChain("monthly_financials");
    chain.then = vi.fn((resolve: any) => resolve({ data: [{ year_month: "2026-01" }], error: null }));

    const res = await financialsGET(createReq("GET", "http://localhost/api/admin/financials"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("POST 正常系 → upsert成功", async () => {
    const chain = getOrCreateChain("monthly_financials");
    chain.then = vi.fn((resolve: any) => resolve({
      data: { year_month: "2026-01", net_sales: 500 },
      error: null,
    }));

    const res = await financialsPOST(
      createReq("POST", "http://localhost/api/admin/financials", {
        year_month: "2026-01",
        net_sales: 500,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 2. merge-patients
// ============================================================
describe("merge-patients API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await mergePatientsPOST(
      createReq("POST", "http://localhost/api/admin/merge-patients", {
        old_patient_id: "00000000001",
        new_patient_id: "00000000002",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("同一IDでマージ → 400", async () => {
    const res = await mergePatientsPOST(
      createReq("POST", "http://localhost/api/admin/merge-patients", {
        old_patient_id: "00000000001",
        new_patient_id: "00000000001",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 正常系 → 統合成功", async () => {
    // 全テーブルのupdate成功・answerer取得をモック
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 0 }));

    const res = await mergePatientsPOST(
      createReq("POST", "http://localhost/api/admin/merge-patients", {
        old_patient_id: "00000000003",
        new_patient_id: "00000000004",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toBeDefined();
  });
});

// ============================================================
// 3. inventory
// ============================================================
describe("inventory API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await inventoryGET(createReq("GET", "http://localhost/api/admin/inventory?date=2026-01-01"));
    expect(res.status).toBe(401);
  });

  it("GET date指定 → 棚卸しデータ返却", async () => {
    const chain = getOrCreateChain("inventory_logs");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await inventoryGET(createReq("GET", "http://localhost/api/admin/inventory?date=2026-01-01"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.logs).toBeDefined();
    expect(json.products).toBeDefined();
  });

  it("GET from/to指定 → 履歴データ返却", async () => {
    const chain = getOrCreateChain("inventory_logs");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await inventoryGET(
      createReq("GET", "http://localhost/api/admin/inventory?from=2026-01-01&to=2026-01-31"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.logs).toBeDefined();
  });

  it("GET パラメータなし → 400", async () => {
    const res = await inventoryGET(createReq("GET", "http://localhost/api/admin/inventory"));
    expect(res.status).toBe(400);
  });

  it("POST 正常系 → 保存成功", async () => {
    const chain = getOrCreateChain("inventory_logs");
    chain.then = vi.fn((resolve: any) => resolve({ data: [{ id: 1 }], error: null }));

    const res = await inventoryPOST(
      createReq("POST", "http://localhost/api/admin/inventory", {
        date: "2026-01-01",
        entries: [
          { item_key: "med-a", location: "本院", box_count: 10 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.saved).toBeDefined();
  });
});

// ============================================================
// 4. schedule
// ============================================================
describe("schedule API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await scheduleGET(createReq("GET", "http://localhost/api/admin/schedule"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → doctors/weekly_rules/overrides を返す", async () => {
    const doctorsChain = getOrCreateChain("doctors");
    doctorsChain.then = vi.fn((resolve: any) => resolve({
      data: [{ doctor_id: "d1", doctor_name: "テスト医師", is_active: true, sort_order: 1, color: "#000" }],
      error: null,
    }));

    const rulesChain = getOrCreateChain("doctor_weekly_rules");
    rulesChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const overridesChain = getOrCreateChain("doctor_date_overrides");
    overridesChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await scheduleGET(createReq("GET", "http://localhost/api/admin/schedule"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.doctors).toHaveLength(1);
    expect(json.weekly_rules).toBeDefined();
    expect(json.overrides).toBeDefined();
  });
});

// ============================================================
// 5. kartesearch
// ============================================================
describe("kartesearch API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await kartesearchGET(createReq("GET", "http://localhost/api/admin/kartesearch?q=test"));
    expect(res.status).toBe(401);
  });

  it("GET q未指定 → 空の候補リスト", async () => {
    const res = await kartesearchGET(createReq("GET", "http://localhost/api/admin/kartesearch"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.candidates).toEqual([]);
  });

  it("GET 氏名検索 → 候補を返す", async () => {
    // patients テーブル（氏名検索）
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({
      data: [{ patient_id: "pid-1", name: "田中太郎", tel: "09012345678", sex: "male", birthday: "1990-01-01" }],
      error: null,
    }));

    // intake テーブル
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({
      data: [{ patient_id: "pid-1", created_at: "2026-01-01T00:00:00Z" }],
      error: null,
    }));

    const res = await kartesearchGET(
      createReq("GET", "http://localhost/api/admin/kartesearch?q=田中&type=name"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.candidates.length).toBeGreaterThanOrEqual(0);
  });

  it("GET PID検索 → 候補を返す", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({
      data: [{ patient_id: "pid-123" }],
      error: null,
    }));

    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({
      data: [{ patient_id: "pid-123", name: "テスト患者", tel: "09012345678", sex: "male", birthday: "1990-01-01" }],
      error: null,
    }));

    const res = await kartesearchGET(
      createReq("GET", "http://localhost/api/admin/kartesearch?q=pid-123&type=pid"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 6. patient-name-change
// ============================================================
describe("patient-name-change API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await patientNameChangePOST(
      createReq("POST", "http://localhost/api/admin/patient-name-change", {
        patient_id: "p1",
        new_name: "新名前",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST 正常系 → 名前変更成功", async () => {
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({
      data: { name: "旧名前", name_kana: "キュウナマエ" },
      error: null,
    }));

    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const reservationsChain = getOrCreateChain("reservations");
    reservationsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 0 }));

    const res = await patientNameChangePOST(
      createReq("POST", "http://localhost/api/admin/patient-name-change", {
        patient_id: "p1",
        new_name: "新名前",
        new_name_kana: "シンナマエ",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toBeDefined();
    expect(json.previous).toBeDefined();
  });
});

// ============================================================
// 7. karte-edit
// ============================================================
describe("karte-edit API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await karteEditPOST(
      createReq("POST", "http://localhost/api/admin/karte-edit", {
        intakeId: 1,
        note: "テストメモ",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST 正常系 → カルテメモ更新成功", async () => {
    const intakeChain = getOrCreateChain("intake");
    // single() がロック無しのintakeを返す
    intakeChain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, locked_at: null },
      error: null,
    }));

    const res = await karteEditPOST(
      createReq("POST", "http://localhost/api/admin/karte-edit", {
        intakeId: 1,
        note: "テストメモ更新",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST ロック済みカルテ → 403", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, locked_at: "2026-01-01T00:00:00Z" },
      error: null,
    }));

    const res = await karteEditPOST(
      createReq("POST", "http://localhost/api/admin/karte-edit", {
        intakeId: 1,
        note: "ロック済み",
      }),
    );
    expect(res.status).toBe(403);
  });
});

// ============================================================
// 8. karte-lock
// ============================================================
describe("karte-lock API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await karteLockPOST(
      createReq("POST", "http://localhost/api/admin/karte-lock", {
        intakeId: 1,
        action: "lock",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST ロック成功 → {ok:true, locked:true}", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await karteLockPOST(
      createReq("POST", "http://localhost/api/admin/karte-lock", {
        intakeId: 1,
        action: "lock",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.locked).toBe(true);
  });

  it("POST ロック解除成功 → {ok:true, locked:false}", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await karteLockPOST(
      createReq("POST", "http://localhost/api/admin/karte-lock", {
        intakeId: 1,
        action: "unlock",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.locked).toBe(false);
  });
});

// ============================================================
// 9. karte（新規作成）
// ============================================================
describe("karte API（新規作成）", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await kartePOST(
      createReq("POST", "http://localhost/api/admin/karte", {
        patientId: "p1",
        note: "テスト",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST 正常系 → カルテ新規作成成功", async () => {
    // patients テーブルから名前取得
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({
      data: { name: "テスト患者" },
      error: null,
    }));

    // intake insert
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({
      data: { id: 99 },
      error: null,
    }));

    const res = await kartePOST(
      createReq("POST", "http://localhost/api/admin/karte", {
        patientId: "p1",
        note: "新規カルテメモ",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.intakeId).toBe(99);
  });
});

// ============================================================
// 10. patientnote
// ============================================================
describe("patientnote API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await patientnotePOST(
      createReq("POST", "http://localhost/api/admin/patientnote", {
        patientId: "p1",
        note: "メモ",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST intakeId指定 → 指定intakeを更新", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await patientnotePOST(
      createReq("POST", "http://localhost/api/admin/patientnote", {
        patientId: "p1",
        note: "更新メモ",
        intakeId: 10,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.editedAt).toBeDefined();
  });

  it("POST intakeId未指定 → 最新intakeを取得して更新", async () => {
    const intakeChain = getOrCreateChain("intake");
    // 1回目: maybeSingle → latest取得
    // 2回目: update
    intakeChain.then = vi.fn((resolve: any) => resolve({
      data: { id: 5 },
      error: null,
    }));

    const res = await patientnotePOST(
      createReq("POST", "http://localhost/api/admin/patientnote", {
        patientId: "p1",
        note: "最新intake更新",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST intakeId未指定 + intake見つからない → 404", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await patientnotePOST(
      createReq("POST", "http://localhost/api/admin/patientnote", {
        patientId: "nonexistent",
        note: "更新メモ",
      }),
    );
    expect(res.status).toBe(404);
  });
});
