// __tests__/api/admin-patientbundle.test.ts
// 患者バンドルAPI（app/api/admin/patientbundle/route.ts）のテスト
// 5テーブルを並列取得し、患者基本情報・来院履歴・購入履歴・再処方をまとめて返す
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

// patient-utils のフォーマット関数は実装をそのまま使う
vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: vi.fn((code: string | null) => {
    if (!code) return "-";
    return code.replace("MJL_", "マンジャロ ").replace("_", " ").replace("1m", "1ヶ月");
  }),
  formatPaymentMethod: vi.fn((method: string | null) => {
    if (!method) return "-";
    if (method === "credit_card") return "カード";
    if (method === "bank_transfer") return "銀行振込";
    return method;
  }),
  formatReorderStatus: vi.fn((status: string | null) => {
    if (!status) return "-";
    const map: Record<string, string> = { pending: "承認待ち", confirmed: "承認済み", paid: "決済済み", rejected: "却下" };
    return map[status] || status;
  }),
  formatDateJST: vi.fn((dateStr: string | null) => dateStr || "-"),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((phone: string) => phone || ""),
}));

// === Supabase モック ===
let tableResults: Record<string, { data: any; error: any }> = {};

function createChain(tableName: string) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "single", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: any) => {
    const result = tableResults[tableName] || { data: null, error: null };
    return resolve(result);
  });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createChain(table)),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  tableResults = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ======================================
// 認証・バリデーションテスト
// ======================================
describe("admin/patientbundle 認証・バリデーション", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P001");

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("patientId なし -> 400", async () => {
    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle");

    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("missing_patientId");
  });

  it("patientId 空文字 -> 400", async () => {
    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=");

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("patientId 空白のみ -> 400", async () => {
    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=%20%20");

    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

// ======================================
// 正常系: 基本データ取得
// ======================================
describe("admin/patientbundle 正常系", () => {
  it("全データあり -> 患者情報・来院履歴・購入履歴・再処方を返す", async () => {
    tableResults = {
      patients: {
        data: {
          patient_id: "P001",
          name: "田中太郎",
          name_kana: "タナカタロウ",
          tel: "09012345678",
          sex: "男性",
          birthday: "1990-01-01",
          line_id: "U12345",
        },
        error: null,
      },
      intake: {
        data: [
          {
            id: 1,
            patient_id: "P001",
            reserve_id: "R001",
            status: "confirmed",
            note: "",
            answers: { 氏名: "田中太郎", 性別: "男性" },
            created_at: "2026-01-10T00:00:00Z",
          },
        ],
        error: null,
      },
      reservations: {
        data: [
          {
            reserve_id: "R001",
            reserved_date: "2026-01-15",
            reserved_time: "10:00",
            prescription_menu: "マンジャロ 2.5mg",
            status: "completed",
          },
        ],
        error: null,
      },
      orders: {
        data: [
          {
            id: "order-1",
            product_code: "MJL_2.5mg_1m",
            product_name: "マンジャロ 2.5mg 1ヶ月",
            amount: 13000,
            paid_at: "2026-01-15T00:00:00Z",
            payment_method: "credit_card",
            tracking_number: "1234567890",
            shipping_date: "2026-01-16",
            shipping_status: "shipped",
            refund_status: null,
            created_at: "2026-01-15T00:00:00Z",
          },
        ],
        error: null,
      },
      reorders: {
        data: [
          {
            id: 10,
            reorder_number: "RO-001",
            product_code: "MJL_2.5mg_1m",
            status: "paid",
            note: "",
            karte_note: "副作用がなく、継続使用のため処方",
            created_at: "2026-02-01T00:00:00Z",
            approved_at: "2026-02-02T00:00:00Z",
            paid_at: "2026-02-03T00:00:00Z",
          },
        ],
        error: null,
      },
    };

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P001");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    // 患者基本情報
    expect(json.patient.id).toBe("P001");
    expect(json.patient.name).toBe("田中太郎");
    expect(json.patient.kana).toBe("タナカタロウ");
    expect(json.patient.sex).toBe("男性");
    expect(json.patient.birth).toBe("1990-01-01");
    expect(json.patient.lineId).toBe("U12345");

    // 来院履歴（intake + reorder karte）
    expect(json.intakes.length).toBeGreaterThanOrEqual(1);

    // 購入履歴
    expect(json.history).toHaveLength(1);
    expect(json.history[0].trackingNumber).toBe("1234567890");

    // 再処方
    expect(json.reorders).toHaveLength(1);
    expect(json.reorders[0].karteNote).toBe("副作用がなく、継続使用のため処方");
  });

  it("患者データなし -> 空文字の患者情報を返す", async () => {
    tableResults = {
      patients: { data: null, error: null },
      intake: { data: [], error: null },
      reservations: { data: [], error: null },
      orders: { data: [], error: null },
      reorders: { data: [], error: null },
    };

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P999");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient.name).toBe("");
    expect(json.patient.kana).toBe("");
    expect(json.intakes).toHaveLength(0);
    expect(json.history).toHaveLength(0);
    expect(json.reorders).toHaveLength(0);
  });
});

// ======================================
// 来院履歴: 再処方カルテ統合テスト
// ======================================
describe("admin/patientbundle 来院履歴統合", () => {
  it("reorders.karte_note が来院履歴に追加される", async () => {
    tableResults = {
      patients: { data: { patient_id: "P001", name: "テスト患者", name_kana: "", tel: "", sex: "", birthday: "", line_id: null }, error: null },
      intake: { data: [], error: null },
      reservations: { data: [], error: null },
      orders: { data: [], error: null },
      reorders: {
        data: [
          {
            id: 20,
            reorder_number: "RO-002",
            product_code: "MJL_5mg_1m",
            status: "paid",
            note: "",
            karte_note: "増量処方",
            created_at: "2026-02-10T00:00:00Z",
            approved_at: "2026-02-11T00:00:00Z",
            paid_at: null,
          },
        ],
        error: null,
      },
    };

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P001");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // 再処方カルテが来院履歴に含まれる
    const reorderIntake = json.intakes.find((i: any) => String(i.id).startsWith("reorder-"));
    expect(reorderIntake).toBeDefined();
    expect(reorderIntake.note).toBe("増量処方");
  });

  it("重複カルテレコード（'再処方'ノート + reserve_idなし）は除外される", async () => {
    tableResults = {
      patients: { data: { patient_id: "P001", name: "テスト", name_kana: "", tel: "", sex: "", birthday: "", line_id: null }, error: null },
      intake: {
        data: [
          {
            id: 1,
            patient_id: "P001",
            reserve_id: "R001",
            status: "confirmed",
            note: "初回問診",
            answers: {},
            created_at: "2026-01-10T00:00:00Z",
          },
          {
            id: 2,
            patient_id: "P001",
            reserve_id: null,
            status: null,
            note: "再処方カルテ",
            answers: {},
            created_at: "2026-02-01T00:00:00Z",
          },
        ],
        error: null,
      },
      reservations: {
        data: [{ reserve_id: "R001", reserved_date: "2026-01-15", reserved_time: "10:00", prescription_menu: "", status: "completed" }],
        error: null,
      },
      orders: { data: [], error: null },
      reorders: { data: [], error: null },
    };

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P001");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // "再処方"ノートのintake（reserve_idなし）は除外される
    const notes = json.intakes.map((i: any) => i.note);
    expect(notes).toContain("初回問診");
    expect(notes).not.toContain("再処方カルテ");
  });
});

// ======================================
// 購入履歴フォーマットテスト
// ======================================
describe("admin/patientbundle 購入履歴", () => {
  it("paid_at がnullの場合 -> created_at を使用", async () => {
    tableResults = {
      patients: { data: { patient_id: "P001", name: "テスト", name_kana: "", tel: "", sex: "", birthday: "", line_id: null }, error: null },
      intake: { data: [], error: null },
      reservations: { data: [], error: null },
      orders: {
        data: [
          {
            id: "order-no-paid",
            product_code: "MJL_2.5mg_1m",
            product_name: null,
            amount: 13000,
            paid_at: null,
            payment_method: "bank_transfer",
            tracking_number: "",
            shipping_date: "",
            shipping_status: null,
            refund_status: null,
            created_at: "2026-02-15T00:00:00Z",
          },
        ],
        error: null,
      },
      reorders: { data: [], error: null },
    };

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P001");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.history[0].paidAt).toBe("2026-02-15T00:00:00Z");
    expect(json.history[0].trackingNumber).toBe("");
  });
});

// ======================================
// 患者情報: answers フォールバック
// ======================================
describe("admin/patientbundle 患者情報フォールバック", () => {
  it("patients テーブルにデータなし -> intake.answers からフォールバック取得", async () => {
    tableResults = {
      patients: { data: null, error: null }, // patients テーブルにデータなし
      intake: {
        data: [
          {
            id: 1,
            patient_id: "P999",
            reserve_id: null,
            status: null,
            note: "",
            answers: {
              カナ: "フォールバックカナ",
              tel: "09099999999",
              性別: "女性",
              生年月日: "1985-05-05",
              line_id: "Ufallback",
            },
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        error: null,
      },
      reservations: { data: [], error: null },
      orders: { data: [], error: null },
      reorders: { data: [], error: null },
    };

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P999");

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.patient.kana).toBe("フォールバックカナ");
    expect(json.patient.sex).toBe("女性");
    expect(json.patient.birth).toBe("1985-05-05");
  });
});

// ======================================
// エラーハンドリング
// ======================================
describe("admin/patientbundle エラーハンドリング", () => {
  it("内部エラー -> 500 + server_error", async () => {
    // verifyAdminAuth が例外を投げるケース
    mockVerifyAdminAuth.mockRejectedValue(new Error("unexpected"));

    const { GET } = await import("@/app/api/admin/patientbundle/route");
    const req = new NextRequest("http://localhost/api/admin/patientbundle?patientId=P001");

    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toBe("server_error");
  });
});
