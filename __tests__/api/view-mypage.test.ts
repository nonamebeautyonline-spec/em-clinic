// __tests__/api/view-mypage.test.ts
// 管理者用患者マイページデータ確認API（view-mypage/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

// テーブル別結果制御
type MockResult = { data: any; error?: any };
let mockResultsByTable: Record<string, MockResult> = {};

function createChain(table: string) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "in", "is", "not", "or",
    "ilike", "order", "limit", "single", "gte", "lte",
    "like", "range",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  // maybeSingle は結果を返す
  chain.maybeSingle = vi.fn().mockImplementation(() => {
    const result = mockResultsByTable[table] || { data: null, error: null };
    return Promise.resolve(result);
  });

  // Promiseとして扱えるように（Promise.allで使用される）
  chain.then = (resolve: any, reject: any) => {
    const result = mockResultsByTable[table] || { data: null, error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createChain(table)),
  },
}));

// ルートインポート
import { GET } from "@/app/api/admin/view-mypage/route";

// --- ヘルパー ---
function createReq(url: string): any {
  return new Request(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

// --- テスト本体 ---
describe("view-mypage API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized = true;
    mockResultsByTable = {};
  });

  // 1. 認証失敗
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;
    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("unauthorized");
  });

  // 2. patient_id 未指定
  it("patient_id 未指定 → 400", async () => {
    const req = createReq("http://localhost/api/admin/view-mypage");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("patient_id");
  });

  // 3. 正常系 — 患者が存在（注文なし）
  it("正常系: 患者存在・注文なし → ok:true, orders:[]", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "田中太郎", line_id: "U001" },
    };
    mockResultsByTable["intake"] = {
      data: { patient_id: "p_001", status: null, answers: null },
    };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.source).toBe("supabase");
    expect(json.patientId).toBe("p_001");
    expect(json.data.patient.id).toBe("p_001");
    expect(json.data.patient.displayName).toBe("田中太郎");
    expect(json.data.orders).toEqual([]);
  });

  // 4. 正常系 — 注文あり
  it("正常系: 注文あり → orders にデータが含まれる", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "田中太郎", line_id: "U001" },
    };
    mockResultsByTable["intake"] = {
      data: { patient_id: "p_001", status: "OK", answers: { ng_check: "OK" } },
    };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = {
      data: [
        {
          id: "order_1",
          product_code: "MJL_2.5mg_1m",
          product_name: "マンジャロ 2.5mg 1ヶ月",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "shipped",
          shipping_date: "2026-01-02",
          tracking_number: "1234567890",
          payment_status: "COMPLETED",
          payment_method: "credit_card",
          refund_status: null,
          refunded_at: null,
          refunded_amount: null,
          created_at: "2026-01-01T00:00:00Z",
          patient_id: "p_001",
          status: "confirmed",
          postal_code: "100-0001",
          address: "東京都千代田区",
          shipping_name: "田中太郎",
          shipping_list_created_at: null,
        },
      ],
    };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.orders.length).toBe(1);
    expect(json.data.orders[0].id).toBe("order_1");
    expect(json.data.orders[0].amount).toBe(50000);
    expect(json.data.orders[0].shippingStatus).toBe("shipped");
    expect(json.data.hasIntake).toBe(true);
  });

  // 5. 問診完了の判定（ng_check が存在）
  it("問診完了: ng_check あり → hasIntake:true", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = {
      data: {
        patient_id: "p_001",
        status: "OK",
        answers: { ng_check: "OK", current_disease_yesno: "no" },
      },
    };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.hasIntake).toBe(true);
  });

  // 6. 問診未完了の判定
  it("問診未完了: answers なし → hasIntake:false", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = { data: null };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.hasIntake).toBe(false);
  });

  // 7. 患者が見つからない場合（patients=null, intake=null）
  it("患者が見つからない → displayName 空文字で返る", async () => {
    mockResultsByTable["patients"] = { data: null };
    mockResultsByTable["intake"] = { data: null };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=nonexist");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.patient.displayName).toBe("");
  });

  // 8. intakeStatus が NG の場合
  it("intakeStatus:NG → flags.canPurchaseCurrentCourse:false", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = {
      data: { patient_id: "p_001", status: "NG", answers: null },
    };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.intakeStatus).toBe("NG");
    expect(json.data.flags.canPurchaseCurrentCourse).toBe(false);
    expect(json.data.flags.canApplyReorder).toBe(false);
  });

  // 9. 注文あり → canApplyReorder:true
  it("注文あり + intake:OK → canApplyReorder:true", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = {
      data: { patient_id: "p_001", status: "OK", answers: { ng_check: "OK" } },
    };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = {
      data: [
        {
          id: "order_1",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "COMPLETED",
          payment_method: "credit_card",
          refund_status: null,
          created_at: "2026-01-01T00:00:00Z",
          patient_id: "p_001",
          status: "confirmed",
        },
      ],
    };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.flags.canApplyReorder).toBe(true);
    expect(json.data.flags.hasAnyPaidOrder).toBe(true);
    expect(json.data.flags.canPurchaseCurrentCourse).toBe(false);
  });

  // 10. 再処方データあり
  it("再処方データあり → reorders が含まれる", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = { data: null };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = {
      data: [
        {
          id: 1,
          status: "pending",
          created_at: "2026-02-01T00:00:00Z",
          product_code: "MJL_5mg_2m",
        },
      ],
    };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.reorders.length).toBe(1);
    expect(json.data.reorders[0].productCode).toBe("MJL_5mg_2m");
  });

  // 11. 返金済み注文のフィルタ（activeOrders）
  it("返金済み注文 → activeOrders から除外", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = { data: null };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = {
      data: [
        {
          id: "order_1",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "COMPLETED",
          payment_method: "credit_card",
          refund_status: "COMPLETED",
          created_at: "2026-01-01T00:00:00Z",
          patient_id: "p_001",
          status: "confirmed",
        },
        {
          id: "order_2",
          product_code: "MJL_5mg_1m",
          product_name: "",
          amount: 80000,
          paid_at: "2026-02-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "COMPLETED",
          payment_method: "credit_card",
          refund_status: null,
          created_at: "2026-02-01T00:00:00Z",
          patient_id: "p_001",
          status: "confirmed",
        },
      ],
    };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    // 全注文は2件
    expect(json.data.orders.length).toBe(2);
    // activeOrders は返金済みを除外して1件
    expect(json.data.activeOrders.length).toBe(1);
    expect(json.data.activeOrders[0].id).toBe("order_2");
  });

  // 12. pending_confirmation → paymentStatus が "pending" になる
  it("pending_confirmation 注文 → paymentStatus:'pending'", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = { data: null };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = {
      data: [
        {
          id: "bt_pending_1",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: null,
          shipping_status: "pending",
          payment_status: null,
          payment_method: "bank_transfer",
          refund_status: null,
          created_at: "2026-01-01T00:00:00Z",
          patient_id: "p_001",
          status: "pending_confirmation",
        },
      ],
    };
    mockResultsByTable["reorders"] = { data: [] };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.orders[0].paymentStatus).toBe("pending");
    expect(json.data.orders[0].paymentMethod).toBe("bank_transfer");
  });

  // 13. product_code から mg と months を抽出
  it("再処方: product_codeから mg/months を抽出", async () => {
    mockResultsByTable["patients"] = {
      data: { patient_id: "p_001", name: "テスト", line_id: "" },
    };
    mockResultsByTable["intake"] = { data: null };
    mockResultsByTable["reservations"] = { data: null };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = {
      data: [
        {
          id: 1,
          status: "confirmed",
          created_at: "2026-02-01T00:00:00Z",
          product_code: "MJL_7.5mg_3m",
        },
      ],
    };

    const req = createReq("http://localhost/api/admin/view-mypage?patient_id=p_001");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data.reorders[0].mg).toBe("7.5mg");
    expect(json.data.reorders[0].months).toBe(3);
  });
});
