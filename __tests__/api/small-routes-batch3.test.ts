// __tests__/api/small-routes-batch3.test.ts
// 小型APIルートのカバレッジ向上テスト（バッチ3）
// 対象: patients/[id]/tags, mark, fields, bulk/tags, bulk/fields, bulk/mark,
//        bulk/send, bulk/menu, shipping/share, shipping/today-shipped,
//        shipping/history, shipping/export-lstep-tags, shipping/update-tracking,
//        shipping/update-tracking/confirm, noname-master/bank-transfer,
//        noname-master/recreate-label, noname-master/update-tracking,
//        noname-master/square, noname-master/add-to-shipping, ehr/export-csv

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
    "ilike", "or", "count", "csv",
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

// createClient を使うルート用
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
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

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: vi.fn().mockResolvedValue(undefined),
  evaluateMenuRulesForMany: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(() => null),
  getSettingOrEnv: vi.fn(() => "test-token"),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

// iconv-lite モック
vi.mock("iconv-lite", () => ({
  encode: vi.fn((str: string) => Buffer.from(str, "utf-8")),
}));

// nanoid モック
vi.mock("nanoid", () => ({
  customAlphabet: vi.fn(() => vi.fn(() => "ABCD1234")),
}));

// jose モック
vi.mock("jose", () => ({
  jwtVerify: vi.fn().mockRejectedValue(new Error("invalid")),
}));

// EHR関連モック
vi.mock("@/lib/ehr/mapper", () => ({
  toEhrPatient: vi.fn((p: any) => ({ id: p?.patient_id || "p1", name: p?.name || "" })),
  toEhrKarte: vi.fn((i: any) => ({ id: i?.id || "k1", note: i?.note || "" })),
}));

vi.mock("@/lib/ehr/csv-adapter", () => ({
  generatePatientCsv: vi.fn(() => "patient_id,name\np1,test"),
  generateKarteCsv: vi.fn(() => "karte_id,note\nk1,test"),
}));

// global fetch モック
const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });
vi.stubGlobal("fetch", mockFetch);

// ============================================================
// リクエストヘルパー
// ============================================================
function createReq(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-admin-token",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
  req.nextUrl = new URL(url);
  req.cookies = { get: vi.fn(() => undefined) };
  return req;
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// テスト対象のインポート
// ============================================================
import {
  GET as tagsGET,
  POST as tagsPOST,
  DELETE as tagsDELETE,
} from "@/app/api/admin/patients/[id]/tags/route";
import {
  GET as markGET,
  PUT as markPUT,
} from "@/app/api/admin/patients/[id]/mark/route";
import {
  GET as fieldsGET,
  PUT as fieldsPUT,
} from "@/app/api/admin/patients/[id]/fields/route";
import { POST as bulkTagsPOST } from "@/app/api/admin/patients/bulk/tags/route";
import { POST as bulkFieldsPOST } from "@/app/api/admin/patients/bulk/fields/route";
import { POST as bulkMarkPOST } from "@/app/api/admin/patients/bulk/mark/route";
import { POST as bulkSendPOST } from "@/app/api/admin/patients/bulk/send/route";
import { POST as bulkMenuPOST } from "@/app/api/admin/patients/bulk/menu/route";
import { POST as sharePOST } from "@/app/api/admin/shipping/share/route";
import { GET as todayShippedGET } from "@/app/api/admin/shipping/today-shipped/route";
import { GET as historyGET } from "@/app/api/admin/shipping/history/route";
import { GET as exportLstepTagsGET } from "@/app/api/admin/shipping/export-lstep-tags/route";
import { POST as updateTrackingPOST } from "@/app/api/admin/shipping/update-tracking/route";
import { POST as updateTrackingConfirmPOST } from "@/app/api/admin/shipping/update-tracking/confirm/route";
import { GET as bankTransferGET } from "@/app/api/admin/noname-master/bank-transfer/route";
import { POST as recreateLabelPOST } from "@/app/api/admin/noname-master/recreate-label/route";
import { POST as nmUpdateTrackingPOST } from "@/app/api/admin/noname-master/update-tracking/route";
import { GET as squareGET } from "@/app/api/admin/noname-master/square/route";
import { POST as addToShippingPOST } from "@/app/api/admin/noname-master/add-to-shipping/route";
import { POST as ehrExportCsvPOST } from "@/app/api/admin/ehr/export-csv/route";

// ============================================================
// テスト本体
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });
});

// ==========================================
// 1. patients/[id]/tags
// ==========================================
describe("patients/[id]/tags", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await tagsGET(createReq("GET", "http://localhost/api/admin/patients/p1/tags"), createParams("p1"));
    expect(res.status).toBe(401);
  });

  it("GET: タグ一覧を返す", async () => {
    const chain = getOrCreateChain("patient_tags");
    chain.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ id: 1, tag_id: 10 }], error: null }));
    const res = await tagsGET(createReq("GET", "http://localhost/api/admin/patients/p1/tags"), createParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tags).toBeDefined();
  });

  it("POST: タグを付与", async () => {
    const chain = getOrCreateChain("patient_tags");
    chain.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null }));
    const res = await tagsPOST(
      createReq("POST", "http://localhost/api/admin/patients/p1/tags", { tag_id: 5 }),
      createParams("p1"),
    );
    expect(res.status).toBe(200);
  });

  it("DELETE: タグを解除", async () => {
    const chain = getOrCreateChain("patient_tags");
    chain.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null }));
    const res = await tagsDELETE(
      createReq("DELETE", "http://localhost/api/admin/patients/p1/tags?tag_id=5"),
      createParams("p1"),
    );
    expect(res.status).toBe(200);
  });
});

// ==========================================
// 2. patients/[id]/mark
// ==========================================
describe("patients/[id]/mark", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await markGET(createReq("GET", "http://localhost/api/admin/patients/p1/mark"), createParams("p1"));
    expect(res.status).toBe(401);
  });

  it("GET: マーク取得", async () => {
    const chain = getOrCreateChain("patient_marks");
    chain.then.mockImplementationOnce((resolve: any) => resolve({ data: { mark: "star", note: null }, error: null }));
    const res = await markGET(createReq("GET", "http://localhost/api/admin/patients/p1/mark"), createParams("p1"));
    expect(res.status).toBe(200);
  });

  it("PUT: マーク更新（none）", async () => {
    const markChain = getOrCreateChain("patient_marks");
    markChain.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null }));
    const res = await markPUT(
      createReq("PUT", "http://localhost/api/admin/patients/p1/mark", { mark: "none" }),
      createParams("p1"),
    );
    expect(res.status).toBe(200);
  });
});

// ==========================================
// 3. patients/[id]/fields
// ==========================================
describe("patients/[id]/fields", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await fieldsGET(createReq("GET", "http://localhost/api/admin/patients/p1/fields"), createParams("p1"));
    expect(res.status).toBe(401);
  });

  it("GET: フィールド一覧を返す", async () => {
    const chain = getOrCreateChain("friend_field_values");
    chain.then.mockImplementationOnce((resolve: any) => resolve({ data: [{ field_id: 1, value: "test" }], error: null }));
    const res = await fieldsGET(createReq("GET", "http://localhost/api/admin/patients/p1/fields"), createParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fields).toBeDefined();
  });

  it("PUT: フィールド更新", async () => {
    const chain = getOrCreateChain("friend_field_values");
    chain.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null }));
    const res = await fieldsPUT(
      createReq("PUT", "http://localhost/api/admin/patients/p1/fields", {
        values: [{ field_id: 1, value: "new_val" }],
      }),
      createParams("p1"),
    );
    expect(res.status).toBe(200);
  });
});

// ==========================================
// 4. patients/bulk/tags
// ==========================================
describe("patients/bulk/tags", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await bulkTagsPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/tags", {
        patient_ids: ["p1"], tag_id: 1, action: "add",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: 一括タグ追加", async () => {
    const chain = getOrCreateChain("patient_tags");
    chain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    const res = await bulkTagsPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/tags", {
        patient_ids: ["p1", "p2"], tag_id: 1, action: "add",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ==========================================
// 5. patients/bulk/fields
// ==========================================
describe("patients/bulk/fields", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await bulkFieldsPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/fields", {
        patient_ids: ["p1"], field_id: 1, value: "test",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: 一括フィールド更新", async () => {
    // friend_field_definitions の存在確認
    const defChain = getOrCreateChain("friend_field_definitions");
    defChain.then.mockImplementationOnce((resolve: any) => resolve({ data: { id: 1, name: "field1" }, error: null }));
    // friend_field_values upsert
    const valChain = getOrCreateChain("friend_field_values");
    valChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    const res = await bulkFieldsPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/fields", {
        patient_ids: ["p1", "p2"], field_id: 1, value: "test",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ==========================================
// 6. patients/bulk/mark
// ==========================================
describe("patients/bulk/mark", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await bulkMarkPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/mark", {
        patient_ids: ["p1"], mark: "star",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: 一括マーク更新", async () => {
    // mark_definitions 存在確認
    const markDefChain = getOrCreateChain("mark_definitions");
    markDefChain.then.mockImplementationOnce((resolve: any) => resolve({ data: { value: "star" }, error: null }));
    // patient_marks upsert
    const markChain = getOrCreateChain("patient_marks");
    markChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    const res = await bulkMarkPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/mark", {
        patient_ids: ["p1", "p2"], mark: "star",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ==========================================
// 7. patients/bulk/send
// ==========================================
describe("patients/bulk/send", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await bulkSendPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/send", {
        patient_ids: ["p1"], template_id: 1,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: テンプレートメッセージ一括送信", async () => {
    // テンプレート取得
    const tmplChain = getOrCreateChain("message_templates");
    tmplChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: { id: 1, name: "tmpl", content: "Hello {name}" }, error: null }),
    );
    // 患者LINE UID取得
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: [{ patient_id: "p1", line_id: "U001", name: "太郎" }], error: null }),
    );
    // message_log insert
    const logChain = getOrCreateChain("message_log");
    logChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

    const res = await bulkSendPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/send", {
        patient_ids: ["p1"], template_id: 1,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(1);
  });
});

// ==========================================
// 8. patients/bulk/menu
// ==========================================
describe("patients/bulk/menu", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await bulkMenuPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/menu", {
        patient_ids: ["p1"], rich_menu_id: 1,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: リッチメニュー一括割当", async () => {
    // リッチメニュー取得
    const menuChain = getOrCreateChain("rich_menus");
    menuChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: { id: 1, name: "menu1", line_rich_menu_id: "rm-001" }, error: null }),
    );
    // 患者LINE UID取得
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: [{ patient_id: "p1", line_id: "U001" }], error: null }),
    );
    // LINE API fetch成功
    mockFetch.mockResolvedValueOnce({ ok: true });

    const res = await bulkMenuPOST(
      createReq("POST", "http://localhost/api/admin/patients/bulk/menu", {
        patient_ids: ["p1"], rich_menu_id: 1,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ==========================================
// 9. shipping/share
// ==========================================
describe("shipping/share", () => {
  it("認証失敗で401（独自verifyAdminAuth）", async () => {
    // shipping/share は独自の verifyAdminAuth を使用（jose + Bearer）
    // ADMIN_TOKENを設定しないで認証失敗させる
    const origToken = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = "wrong-token-should-not-match";
    const reqNoAuth = new Request("http://localhost/api/admin/shipping/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ id: "1" }] }),
    }) as any;
    reqNoAuth.nextUrl = new URL("http://localhost/api/admin/shipping/share");
    reqNoAuth.cookies = { get: vi.fn(() => undefined) };
    const res = await sharePOST(reqNoAuth);
    expect(res.status).toBe(401);
    process.env.ADMIN_TOKEN = origToken;
  });

  it("POST: 共有リンク作成（Bearer認証）", async () => {
    // shipping/share は独自verifyAdminAuth（jose）を使うため、Bearerトークンで認証
    // 環境変数 ADMIN_TOKEN を設定してBearerトークン認証を通す
    const origToken = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = "test-admin-token";
    const chain = getOrCreateChain("shipping_shares");
    chain.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: null }));
    const res = await sharePOST(
      createReq("POST", "http://localhost/api/admin/shipping/share", { data: [{ id: "1" }] }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.shareId).toBeDefined();
    process.env.ADMIN_TOKEN = origToken;
  });
});

// ==========================================
// 10. shipping/today-shipped
// ==========================================
describe("shipping/today-shipped", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await todayShippedGET(createReq("GET", "http://localhost/api/admin/shipping/today-shipped"));
    expect(res.status).toBe(401);
  });

  it("GET: 注文がない場合は空を返す", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null }));
    const res = await todayShippedGET(createReq("GET", "http://localhost/api/admin/shipping/today-shipped"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries).toEqual([]);
    expect(json.summary.total).toBe(0);
  });
});

// ==========================================
// 11. shipping/history
// ==========================================
describe("shipping/history", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await historyGET(
      createReq("GET", "http://localhost/api/admin/shipping/history?from=2026-01-01&to=2026-01-31"),
    );
    expect(res.status).toBe(401);
  });

  it("GET: from/to パラメータ必須で400", async () => {
    // mockVerifyAdminAuth は beforeEach で true に設定済み
    const res = await historyGET(
      createReq("GET", "http://localhost/api/admin/shipping/history"),
    );
    expect(res.status).toBe(400);
  });

  it("GET: 正常系（空データ）", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null }));
    const res = await historyGET(
      createReq("GET", "http://localhost/api/admin/shipping/history?from=2026-01-01&to=2026-01-31"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.days).toEqual([]);
  });
});

// ==========================================
// 12. shipping/export-lstep-tags
// ==========================================
describe("shipping/export-lstep-tags", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await exportLstepTagsGET(createReq("GET", "http://localhost/api/admin/shipping/export-lstep-tags"));
    expect(res.status).toBe(401);
  });

  it("GET: 注文がない場合は404", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null }));
    const res = await exportLstepTagsGET(createReq("GET", "http://localhost/api/admin/shipping/export-lstep-tags"));
    expect(res.status).toBe(404);
  });
});

// ==========================================
// 13. shipping/update-tracking
// ==========================================
describe("shipping/update-tracking", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await updateTrackingPOST(
      createReq("POST", "http://localhost/api/admin/shipping/update-tracking", {
        csvContent: "test",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: CSVが短すぎる場合は400", async () => {
    const res = await updateTrackingPOST(
      createReq("POST", "http://localhost/api/admin/shipping/update-tracking", {
        csvContent: "header_only",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST: 正常なCSV処理", async () => {
    const csvContent = "お客様管理番号\t伝票番号\nORD-001\t1234567890";
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [{ id: "ORD-001", patient_id: "p1" }], error: null }),
    );
    const res = await updateTrackingPOST(
      createReq("POST", "http://localhost/api/admin/shipping/update-tracking", { csvContent }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBeGreaterThanOrEqual(0);
  });
});

// ==========================================
// 14. shipping/update-tracking/confirm
// ==========================================
describe("shipping/update-tracking/confirm", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await updateTrackingConfirmPOST(
      createReq("POST", "http://localhost/api/admin/shipping/update-tracking/confirm", {
        entries: [{ payment_id: "ORD-001", patient_name: "test", tracking_number: "123", matched: true }],
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: 正常に追跡番号を確定", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [{ id: "ORD-001", patient_id: "p1" }], error: null }),
    );
    // キャッシュ無効化のfetchモック
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });
    const res = await updateTrackingConfirmPOST(
      createReq("POST", "http://localhost/api/admin/shipping/update-tracking/confirm", {
        entries: [{ payment_id: "ORD-001", patient_name: "test", tracking_number: "123", matched: true }],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ==========================================
// 15. noname-master/bank-transfer
// ==========================================
describe("noname-master/bank-transfer", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await bankTransferGET(
      createReq("GET", "http://localhost/api/admin/noname-master/bank-transfer"),
    );
    expect(res.status).toBe(401);
  });

  it("GET: 銀行振込注文一覧（空）", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
    const res = await bankTransferGET(
      createReq("GET", "http://localhost/api/admin/noname-master/bank-transfer"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orders).toEqual([]);
  });
});

// ==========================================
// 16. noname-master/recreate-label
// ==========================================
describe("noname-master/recreate-label", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await recreateLabelPOST(
      createReq("POST", "http://localhost/api/admin/noname-master/recreate-label", {
        order_id: "ORD-001",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: ラベル再作成", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: [{ id: "ORD-001", tracking_number: null, shipping_date: null, shipping_list_created_at: null }], error: null }),
    );
    const res = await recreateLabelPOST(
      createReq("POST", "http://localhost/api/admin/noname-master/recreate-label", {
        order_id: "ORD-001",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ==========================================
// 17. noname-master/update-tracking
// ==========================================
describe("noname-master/update-tracking", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await nmUpdateTrackingPOST(
      createReq("POST", "http://localhost/api/admin/noname-master/update-tracking", {
        order_id: "ORD-001", tracking_number: "123",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: 追跡番号を個別更新", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: [{ id: "ORD-001", patient_id: "p1", tracking_number: "123", shipping_date: "2026-02-23" }], error: null }),
    );
    // キャッシュ無効化のfetchモック
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });
    const res = await nmUpdateTrackingPOST(
      createReq("POST", "http://localhost/api/admin/noname-master/update-tracking", {
        order_id: "ORD-001", tracking_number: "123",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ==========================================
// 18. noname-master/square
// ==========================================
describe("noname-master/square", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await squareGET(
      createReq("GET", "http://localhost/api/admin/noname-master/square"),
    );
    expect(res.status).toBe(401);
  });

  it("GET: クレジットカード決済一覧（空）", async () => {
    const orderChain = getOrCreateChain("orders");
    orderChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
    const res = await squareGET(
      createReq("GET", "http://localhost/api/admin/noname-master/square"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orders).toEqual([]);
  });
});

// ==========================================
// 19. noname-master/add-to-shipping
// ==========================================
describe("noname-master/add-to-shipping", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await addToShippingPOST(
      createReq("POST", "http://localhost/api/admin/noname-master/add-to-shipping", {
        order_id: "ORD-001",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: 発送リストに追加", async () => {
    const res = await addToShippingPOST(
      createReq("POST", "http://localhost/api/admin/noname-master/add-to-shipping", {
        order_id: "ORD-001",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ==========================================
// 20. ehr/export-csv
// ==========================================
describe("ehr/export-csv", () => {
  it("認証失敗で401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await ehrExportCsvPOST(
      createReq("POST", "http://localhost/api/admin/ehr/export-csv", { type: "patient" }),
    );
    expect(res.status).toBe(401);
  });

  it("POST: 患者CSVエクスポート", async () => {
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: [{ patient_id: "p1", name: "テスト太郎" }], error: null }),
    );
    const res = await ehrExportCsvPOST(
      createReq("POST", "http://localhost/api/admin/ehr/export-csv", { type: "patient" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
  });

  it("POST: カルテCSVエクスポート", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: [{ id: 1, patient_id: "p1", note: "test", patients: { patient_id: "p1", name: "テスト" } }], error: null }),
    );
    const res = await ehrExportCsvPOST(
      createReq("POST", "http://localhost/api/admin/ehr/export-csv", { type: "karte" }),
    );
    expect(res.status).toBe(200);
  });
});
