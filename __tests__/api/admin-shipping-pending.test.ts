// __tests__/api/admin-shipping-pending.test.ts
// 未発送注文一覧API（app/api/admin/shipping/pending/route.ts）のテスト
// confirmed + pending_confirmation の注文を取得し、患者名・購入回数等を付与して返す
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
// このルートは orders テーブルを複数回呼ぶ（confirmed, pending, 購入回数）
// + patients, intake テーブル
let ordersCallIndex = 0;
let ordersResults: Array<{ data: any; error: any }> = [];
let patientsResult: { data: any; error: any } = { data: [], error: null };
let intakeResult: { data: any; error: any } = { data: [], error: null };

function createTableChain(getResult: () => { data: any; error: any }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(getResult()));
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "orders") {
        return createTableChain(() => {
          const result = ordersResults[ordersCallIndex] || { data: [], error: null };
          ordersCallIndex++;
          return result;
        });
      }
      if (table === "patients") {
        return createTableChain(() => patientsResult);
      }
      if (table === "intake") {
        return createTableChain(() => intakeResult);
      }
      return createTableChain(() => ({ data: null, error: null }));
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  ordersCallIndex = 0;
  ordersResults = [];
  patientsResult = { data: [], error: null };
  intakeResult = { data: [], error: null };
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockGetProductNamesMap.mockResolvedValue({
    "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
    "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
  });
});

// ======================================
// 認証テスト
// ======================================
describe("admin/shipping/pending 認証", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });
});

// ======================================
// 正常系
// ======================================
describe("admin/shipping/pending 正常系", () => {
  it("未発送注文なし -> 空配列", async () => {
    ordersResults = [
      { data: [], error: null },  // confirmed
      { data: [], error: null },  // pending
    ];

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.mergeableGroups).toEqual([]);
  });

  it("confirmed注文あり -> フォーマットされた注文を返す", async () => {
    const now = new Date().toISOString();
    const confirmedOrders = [
      {
        id: "order-1",
        patient_id: "P001",
        product_code: "MJL_2.5mg_1m",
        payment_method: "credit_card",
        paid_at: now,
        shipping_date: null,
        tracking_number: null,
        amount: 13000,
        status: "confirmed",
        shipping_name: "田中太郎",
        postal_code: "100-0001",
        address: "東京都千代田区",
        phone: "09012345678",
        email: "tanaka@example.com",
        created_at: now,
        shipping_list_created_at: null,
      },
    ];

    ordersResults = [
      { data: confirmedOrders, error: null },  // confirmed
      { data: [], error: null },                // pending
      { data: [{ patient_id: "P001" }], error: null }, // 購入回数用
    ];
    patientsResult = { data: [{ patient_id: "P001", name: "田中太郎" }], error: null };
    intakeResult = { data: [{ patient_id: "P001", answerer_id: "Lstep_001" }], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders).toHaveLength(1);
    expect(json.orders[0].patient_name).toBe("田中太郎");
    expect(json.orders[0].product_name).toBe("マンジャロ 2.5mg 1ヶ月");
    expect(json.orders[0].payment_method).toBe("クレジットカード");
    expect(json.orders[0].postal_code).toBe("100-0001");
    expect(json.orders[0].address).toBe("東京都千代田区");
    expect(json.orders[0].status).toBe("confirmed");
    expect(json.orders[0].lstep_id).toBe("Lstep_001");
    expect(json.total).toBe(1);
  });

  it("pending_confirmation（銀行振込確認待ち）も含む", async () => {
    const now = new Date().toISOString();
    ordersResults = [
      { data: [], error: null },  // confirmed: 空
      {
        data: [
          {
            id: "order-pending",
            patient_id: "P002",
            product_code: "MJL_5mg_1m",
            payment_method: "bank_transfer",
            paid_at: null,
            shipping_date: null,
            tracking_number: null,
            amount: 22850,
            status: "pending_confirmation",
            shipping_name: null,
            postal_code: "",
            address: "",
            phone: "",
            email: "",
            created_at: now,
            shipping_list_created_at: null,
          },
        ],
        error: null,
      }, // pending
      { data: [{ patient_id: "P002" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P002", name: "佐藤花子" }], error: null };
    intakeResult = { data: [], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders).toHaveLength(1);
    expect(json.orders[0].status).toBe("pending_confirmation");
    expect(json.orders[0].payment_method).toBe("銀行振込");
    // paid_at が null -> created_at が payment_date に使われる
    expect(json.orders[0].payment_date).toBe(now);
  });
});

// ======================================
// 重複排除テスト
// ======================================
describe("admin/shipping/pending 重複排除", () => {
  it("confirmed と pending で同一注文が重複 -> 1件に集約", async () => {
    const now = new Date().toISOString();
    const sameOrder = {
      id: "order-dup",
      patient_id: "P003",
      product_code: "MJL_2.5mg_1m",
      payment_method: "credit_card",
      paid_at: now,
      shipping_date: null,
      tracking_number: null,
      amount: 13000,
      status: "confirmed",
      shipping_name: null,
      postal_code: "",
      address: "",
      phone: "",
      email: "",
      created_at: now,
      shipping_list_created_at: null,
    };

    ordersResults = [
      { data: [sameOrder], error: null },  // confirmed
      { data: [sameOrder], error: null },  // pendingにも同じIDが出現
      { data: [{ patient_id: "P003" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P003", name: "重複テスト" }], error: null };
    intakeResult = { data: [], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // 重複排除されて1件になる
    expect(json.orders).toHaveLength(1);
    expect(json.orders[0].id).toBe("order-dup");
  });
});

// ======================================
// まとめ配送グループテスト
// ======================================
describe("admin/shipping/pending まとめ配送グループ", () => {
  it("同一患者で複数注文 -> mergeableGroups に含まれる", async () => {
    const now = new Date().toISOString();
    const multiOrders = [
      {
        id: "order-a",
        patient_id: "P004",
        product_code: "MJL_2.5mg_1m",
        payment_method: "credit_card",
        paid_at: now,
        shipping_date: null,
        tracking_number: null,
        amount: 13000,
        status: "confirmed",
        shipping_name: "同梱患者",
        postal_code: "100-0001",
        address: "東京都",
        phone: "",
        email: "",
        created_at: now,
        shipping_list_created_at: null,
      },
      {
        id: "order-b",
        patient_id: "P004",
        product_code: "MJL_5mg_1m",
        payment_method: "credit_card",
        paid_at: now,
        shipping_date: null,
        tracking_number: null,
        amount: 22850,
        status: "confirmed",
        shipping_name: "同梱患者",
        postal_code: "100-0001",
        address: "東京都",
        phone: "",
        email: "",
        created_at: now,
        shipping_list_created_at: null,
      },
    ];

    ordersResults = [
      { data: multiOrders, error: null },  // confirmed
      { data: [], error: null },            // pending
      { data: [{ patient_id: "P004" }, { patient_id: "P004" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P004", name: "同梱患者" }], error: null };
    intakeResult = { data: [], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders).toHaveLength(2);
    // まとめ配送候補に含まれる
    expect(json.mergeableGroups).toHaveLength(1);
    expect(json.mergeableGroups[0].patient_id).toBe("P004");
    expect(json.mergeableGroups[0].count).toBe(2);
    expect(json.mergeableGroups[0].patient_name).toBe("同梱患者");
  });
});

// ======================================
// shipping_name 正規化テスト
// ======================================
describe("admin/shipping/pending shipping_name正規化", () => {
  it("shipping_name が 'null' 文字列 -> patientsの名前を使用", async () => {
    const now = new Date().toISOString();
    ordersResults = [
      {
        data: [
          {
            id: "order-null-name",
            patient_id: "P005",
            product_code: "MJL_2.5mg_1m",
            payment_method: "credit_card",
            paid_at: now,
            shipping_date: null,
            tracking_number: null,
            amount: 13000,
            status: "confirmed",
            shipping_name: "null",
            postal_code: "",
            address: "",
            phone: "",
            email: "",
            created_at: now,
            shipping_list_created_at: null,
          },
        ],
        error: null,
      },
      { data: [], error: null },
      { data: [{ patient_id: "P005" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P005", name: "正規化テスト" }], error: null };
    intakeResult = { data: [], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].patient_name).toBe("正規化テスト");
  });
});

// ======================================
// 商品名マップテスト
// ======================================
describe("admin/shipping/pending 商品名マップ", () => {
  it("未知の商品コード -> 商品コードをそのまま返す", async () => {
    const now = new Date().toISOString();
    ordersResults = [
      {
        data: [
          {
            id: "order-unknown",
            patient_id: "P006",
            product_code: "UNKNOWN_CODE",
            payment_method: "credit_card",
            paid_at: now,
            shipping_date: null,
            tracking_number: null,
            amount: 9999,
            status: "confirmed",
            shipping_name: null,
            postal_code: "",
            address: "",
            phone: "",
            email: "",
            created_at: now,
            shipping_list_created_at: null,
          },
        ],
        error: null,
      },
      { data: [], error: null },
      { data: [{ patient_id: "P006" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P006", name: "テスト" }], error: null };
    intakeResult = { data: [], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].product_name).toBe("UNKNOWN_CODE");
  });
});

// ======================================
// DBエラーテスト
// ======================================
describe("admin/shipping/pending DBエラー", () => {
  it("orders取得エラー -> 500", async () => {
    ordersResults = [
      { data: null, error: { message: "connection timeout" } }, // confirmed
      { data: null, error: null },                               // pending
    ];

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Database error");
  });
});

// ======================================
// LステップID取得テスト
// ======================================
describe("admin/shipping/pending LステップID", () => {
  it("intake.answerer_id -> lstep_id にマッピング", async () => {
    const now = new Date().toISOString();
    ordersResults = [
      {
        data: [
          {
            id: "order-lstep",
            patient_id: "P007",
            product_code: "MJL_2.5mg_1m",
            payment_method: "credit_card",
            paid_at: now,
            shipping_date: null,
            tracking_number: null,
            amount: 13000,
            status: "confirmed",
            shipping_name: null,
            postal_code: "",
            address: "",
            phone: "",
            email: "",
            created_at: now,
            shipping_list_created_at: null,
          },
        ],
        error: null,
      },
      { data: [], error: null },
      { data: [{ patient_id: "P007" }], error: null },
    ];
    patientsResult = { data: [{ patient_id: "P007", name: "Lステップ患者" }], error: null };
    intakeResult = { data: [{ patient_id: "P007", answerer_id: "U_lstep_abc" }], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders[0].lstep_id).toBe("U_lstep_abc");
  });
});

// ======================================
// ソート順テスト
// ======================================
describe("admin/shipping/pending ソート順", () => {
  it("confirmed と pending がマージされ、新しい順にソートされる", async () => {
    const older = "2026-02-10T00:00:00Z";
    const newer = "2026-02-20T00:00:00Z";

    ordersResults = [
      {
        data: [
          {
            id: "order-old",
            patient_id: "P008",
            product_code: "MJL_2.5mg_1m",
            payment_method: "credit_card",
            paid_at: older,
            shipping_date: null,
            tracking_number: null,
            amount: 13000,
            status: "confirmed",
            shipping_name: null,
            postal_code: "",
            address: "",
            phone: "",
            email: "",
            created_at: older,
            shipping_list_created_at: null,
          },
        ],
        error: null,
      }, // confirmed
      {
        data: [
          {
            id: "order-new",
            patient_id: "P009",
            product_code: "MJL_5mg_1m",
            payment_method: "bank_transfer",
            paid_at: newer,
            shipping_date: null,
            tracking_number: null,
            amount: 22850,
            status: "pending_confirmation",
            shipping_name: null,
            postal_code: "",
            address: "",
            phone: "",
            email: "",
            created_at: newer,
            shipping_list_created_at: null,
          },
        ],
        error: null,
      }, // pending
      { data: [{ patient_id: "P008" }, { patient_id: "P009" }], error: null },
    ];
    patientsResult = {
      data: [
        { patient_id: "P008", name: "古い注文" },
        { patient_id: "P009", name: "新しい注文" },
      ],
      error: null,
    };
    intakeResult = { data: [], error: null };

    const { GET } = await import("@/app/api/admin/shipping/pending/route");
    const req = new NextRequest("http://localhost/api/admin/shipping/pending");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orders).toHaveLength(2);
    // 新しい順（order-new が先）
    expect(json.orders[0].id).toBe("order-new");
    expect(json.orders[1].id).toBe("order-old");
  });
});
