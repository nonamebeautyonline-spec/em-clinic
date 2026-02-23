// __tests__/api/admin-noname-master.test.ts
// 注文マスター一覧API（app/api/admin/noname-master/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モック設定 ===
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: mockVerifyAdminAuth }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockGetProductNamesMap = vi.fn().mockResolvedValue({
  "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
  "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
});
vi.mock("@/lib/products", () => ({
  getProductNamesMap: (...args: any[]) => mockGetProductNamesMap(...args),
}));

// === Supabase モック ===
// このルートは同一テーブル（orders）を複数回・異なるクエリで呼ぶため、
// 呼び出し順序ベースで結果を返すモックを構築
let ordersCallIndex = 0;
let ordersResults: Array<{ data: any; error: any; count?: number }> = [];
let patientsResult: { data: any; error: any } = { data: [], error: null };

function createOrdersChain() {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // range で最終結果を返す（dataQuery.order(...).range(...)パターン）
  chain.range = vi.fn().mockImplementation(() => {
    const result = ordersResults[ordersCallIndex] || { data: [], error: null };
    ordersCallIndex++;
    return result;
  });
  // then: countQuery (withTenant結果) やSelect head用
  chain.then = vi.fn((resolve: any) => {
    const result = ordersResults[ordersCallIndex] || { data: null, error: null, count: 0 };
    ordersCallIndex++;
    return resolve(result);
  });
  return chain;
}

function createPatientsChain() {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(patientsResult));
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "orders") return createOrdersChain();
      if (table === "patients") return createPatientsChain();
      return createOrdersChain(); // フォールバック
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  ordersCallIndex = 0;
  ordersResults = [];
  patientsResult = { data: [], error: null };
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockGetProductNamesMap.mockResolvedValue({
    "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
    "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
  });
});

// ======================================
// 認証テスト
// ======================================
describe("admin/noname-master 認証", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });
});

// ======================================
// 正常系: 注文一覧取得
// ======================================
describe("admin/noname-master 正常系", () => {
  it("注文0件 -> 空配列を返す", async () => {
    // 呼び出し順: countQuery -> dataQuery.range -> (patientIdsが空なのでスキップ)
    ordersResults = [
      { data: null, error: null, count: 0 }, // countQuery
      { data: [], error: null },              // dataQuery
    ];

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders).toEqual([]);
    expect(json.total).toBe(0);
  });

  it("注文あり -> フォーマットされた注文データを返す", async () => {
    const now = new Date().toISOString();
    const ordersData = [
      {
        id: "order-1",
        patient_id: "P001",
        product_code: "MJL_2.5mg_1m",
        amount: 13000,
        payment_method: "credit_card",
        status: "confirmed",
        paid_at: now,
        shipping_date: null,
        tracking_number: null,
        shipping_name: "田中太郎",
        created_at: now,
        refund_status: null,
        refunded_at: null,
        refunded_amount: null,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },  // countQuery
      { data: ordersData, error: null },       // dataQuery
      { data: [{ patient_id: "P001" }], error: null }, // 購入回数用
    ];
    patientsResult = { data: [{ patient_id: "P001", name: "田中太郎" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders).toHaveLength(1);
    expect(json.orders[0].patient_name).toBe("田中太郎");
    expect(json.orders[0].product_name).toBe("マンジャロ 2.5mg 1ヶ月");
    expect(json.orders[0].payment_method).toBe("クレジットカード");
  });

  it("銀行振込 pending_confirmation -> '銀行振込' + '（申請中）'ラベル", async () => {
    const now = new Date().toISOString();
    const ordersData = [
      {
        id: "order-2",
        patient_id: "P002",
        product_code: "MJL_5mg_1m",
        amount: 22850,
        payment_method: "bank_transfer",
        status: "pending_confirmation",
        paid_at: null,
        shipping_date: null,
        tracking_number: null,
        shipping_name: null,
        created_at: now,
        refund_status: null,
        refunded_at: null,
        refunded_amount: null,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },
      { data: ordersData, error: null },
      { data: [{ patient_id: "P002" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P002", name: "佐藤花子" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].payment_method).toBe("銀行振込");
    expect(json.orders[0].payment_date_label).toBe("（申請中）");
  });

  it("shipping_name が 'null' 文字列 -> 空文字に正規化してpatients名を使う", async () => {
    const ordersData = [
      {
        id: "order-3",
        patient_id: "P003",
        product_code: "MJL_2.5mg_1m",
        amount: 13000,
        payment_method: "credit_card",
        status: "confirmed",
        paid_at: new Date().toISOString(),
        shipping_date: null,
        tracking_number: null,
        shipping_name: "null",
        created_at: new Date().toISOString(),
        refund_status: null,
        refunded_at: null,
        refunded_amount: null,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },
      { data: ordersData, error: null },
      { data: [{ patient_id: "P003" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P003", name: "山田太郎" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].patient_name).toBe("山田太郎");
  });
});

// ======================================
// 発送漏れフラグテスト
// ======================================
describe("admin/noname-master 発送漏れフラグ", () => {
  it("未発送 + 前日12時以前の決済 -> is_overdue: true", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const ordersData = [
      {
        id: "order-overdue",
        patient_id: "P010",
        product_code: "MJL_2.5mg_1m",
        amount: 13000,
        payment_method: "credit_card",
        status: "confirmed",
        paid_at: threeDaysAgo,
        shipping_date: null,
        tracking_number: null,
        shipping_name: null,
        created_at: threeDaysAgo,
        refund_status: null,
        refunded_at: null,
        refunded_amount: null,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },
      { data: ordersData, error: null },
      { data: [{ patient_id: "P010" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P010", name: "遅延患者" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].is_overdue).toBe(true);
  });

  it("tracking_numberあり -> is_overdue: false", async () => {
    const ordersData = [
      {
        id: "order-shipped",
        patient_id: "P011",
        product_code: "MJL_2.5mg_1m",
        amount: 13000,
        payment_method: "credit_card",
        status: "confirmed",
        paid_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        shipping_date: "2026-02-20",
        tracking_number: "1234567890",
        shipping_name: null,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        refund_status: null,
        refunded_at: null,
        refunded_amount: null,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },
      { data: ordersData, error: null },
      { data: [{ patient_id: "P011" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P011", name: "発送済患者" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].is_overdue).toBe(false);
  });
});

// ======================================
// DBエラーテスト
// ======================================
describe("admin/noname-master DBエラー", () => {
  it("orders取得エラー -> 500", async () => {
    ordersResults = [
      { data: null, error: null, count: 0 },                  // countQuery（成功）
      { data: null, error: { message: "connection refused" } }, // dataQuery（エラー）
    ];

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Database error");
    expect(json.details).toBe("connection refused");
  });
});

// ======================================
// 商品名マップテスト
// ======================================
describe("admin/noname-master 商品名マップ", () => {
  it("未知の商品コード -> 商品コードをそのまま返す", async () => {
    const ordersData = [
      {
        id: "order-unknown",
        patient_id: "P030",
        product_code: "UNKNOWN_PRODUCT",
        amount: 9999,
        payment_method: "credit_card",
        status: "confirmed",
        paid_at: new Date().toISOString(),
        shipping_date: null,
        tracking_number: null,
        shipping_name: null,
        created_at: new Date().toISOString(),
        refund_status: null,
        refunded_at: null,
        refunded_amount: null,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },
      { data: ordersData, error: null },
      { data: [{ patient_id: "P030" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P030", name: "テスト" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].product_name).toBe("UNKNOWN_PRODUCT");
  });
});

// ======================================
// 購入回数テスト
// ======================================
describe("admin/noname-master 購入回数", () => {
  it("同一患者の複数注文 -> purchase_count がカウントされる", async () => {
    const now = new Date().toISOString();
    const ordersData = [
      {
        id: "order-a",
        patient_id: "P020",
        product_code: "MJL_2.5mg_1m",
        amount: 13000,
        payment_method: "credit_card",
        status: "confirmed",
        paid_at: now,
        shipping_date: null,
        tracking_number: null,
        shipping_name: null,
        created_at: now,
        refund_status: null,
        refunded_at: null,
        refunded_amount: null,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },   // countQuery
      { data: ordersData, error: null },         // dataQuery
      // 購入回数: 同一患者で3件
      { data: [{ patient_id: "P020" }, { patient_id: "P020" }, { patient_id: "P020" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P020", name: "リピーター" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].purchase_count).toBe(3);
  });
});

// ======================================
// refund_statusテスト
// ======================================
describe("admin/noname-master refund_status", () => {
  it("返金ステータスがある注文 -> refund_status を返す", async () => {
    const ordersData = [
      {
        id: "order-refund",
        patient_id: "P040",
        product_code: "MJL_2.5mg_1m",
        amount: 13000,
        payment_method: "credit_card",
        status: "confirmed",
        paid_at: new Date().toISOString(),
        shipping_date: null,
        tracking_number: null,
        shipping_name: null,
        created_at: new Date().toISOString(),
        refund_status: "COMPLETED",
        refunded_at: "2026-02-20T00:00:00Z",
        refunded_amount: 13000,
      },
    ];

    ordersResults = [
      { data: null, error: null, count: 1 },
      { data: ordersData, error: null },
      { data: [{ patient_id: "P040" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P040", name: "返金患者" }], error: null };

    const { GET } = await import("@/app/api/admin/noname-master/route");
    const req = new NextRequest("http://localhost/api/admin/noname-master");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].refund_status).toBe("COMPLETED");
    expect(json.orders[0].refunded_amount).toBe(13000);
  });
});
