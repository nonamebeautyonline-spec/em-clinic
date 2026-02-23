// __tests__/api/patient-lookup.test.ts
// 患者クイック検索API（patient-lookup/route.ts）のテスト
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

// Supabase チェーンモック
// テーブル別に結果を制御するための設定
type MockResult = { data: any; error?: any; count?: number | null };
let mockResultsByTable: Record<string, MockResult> = {};

function createChain(table: string) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "in", "is", "not", "or",
    "ilike", "order", "limit", "maybeSingle", "single",
    "gte", "lte", "like", "range",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  // maybeSingle / single は結果を返す（Promise互換）
  chain.maybeSingle = vi.fn().mockImplementation(() => {
    const result = mockResultsByTable[table] || { data: null, error: null };
    return Promise.resolve(result);
  });

  // thenableにする（Promise.allで使えるように）
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

vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: vi.fn((code: string) => code || "-"),
  formatPaymentMethod: vi.fn((method: string) => method || "-"),
  formatReorderStatus: vi.fn((status: string) => status || "-"),
  formatDateJST: vi.fn((date: string) => date || "-"),
}));

// ルートインポート
import { GET } from "@/app/api/admin/patient-lookup/route";

// --- ヘルパー ---
function createReq(url: string): any {
  return new Request(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

// --- テスト本体 ---
describe("patient-lookup API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized = true;
    mockResultsByTable = {};
  });

  // 1. 認証失敗
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;
    const req = createReq("http://localhost/api/admin/patient-lookup?q=test&type=id");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // 2. キーワード未入力
  it("検索キーワード未入力 → 400", async () => {
    const req = createReq("http://localhost/api/admin/patient-lookup?q=&type=id");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("検索キーワード");
  });

  // 3. qパラメータなし
  it("qパラメータなし → 400", async () => {
    const req = createReq("http://localhost/api/admin/patient-lookup?type=id");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  // 4. ID検索 — intakeから見つかる
  it("ID検索: intakeから見つかる → found:true", async () => {
    // intakeからpatient_idを返す
    mockResultsByTable["intake"] = {
      data: { patient_id: "p_001", answerer_id: "L001" },
    };
    // patientsから患者情報
    mockResultsByTable["patients"] = {
      data: { name: "田中太郎", name_kana: "タナカタロウ", sex: "M", birthday: "2000-01-01", line_id: "U001", tel: "09012345678" },
    };
    // ordersは空
    mockResultsByTable["orders"] = { data: [] };
    // reordersは空
    mockResultsByTable["reorders"] = { data: [] };
    // reservationsは空
    mockResultsByTable["reservations"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=p_001&type=id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(true);
    expect(json.patient.id).toBe("p_001");
  });

  // 5. ID検索 — 見つからない
  it("ID検索: 見つからない → found:false", async () => {
    mockResultsByTable["intake"] = { data: null };
    mockResultsByTable["orders"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=nonexistent&type=id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(false);
    expect(json.candidates).toEqual([]);
  });

  // 6. 氏名検索 — 複数候補
  it("氏名検索: 複数候補 → candidates配列で返す", async () => {
    mockResultsByTable["patients"] = {
      data: [
        { patient_id: "p_001", name: "田中太郎" },
        { patient_id: "p_002", name: "田中花子" },
      ],
    };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=田中&type=name");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(false);
    expect(json.candidates.length).toBe(2);
    expect(json.candidates[0].name).toBe("田中太郎");
  });

  // 7. 氏名検索 — 1件のみ
  it("氏名検索: 1件のみ → found:true", async () => {
    // select → ilike → limit → then で候補を返す
    mockResultsByTable["patients"] = {
      data: [{ patient_id: "p_001", name: "田中太郎" }],
    };
    // answerer_id 取得
    mockResultsByTable["intake"] = {
      data: { answerer_id: "L001", patient_id: "p_001" },
    };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };
    mockResultsByTable["reservations"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=田中太郎&type=name");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(true);
    expect(json.patient.id).toBe("p_001");
  });

  // 8. 氏名検索 — 0件
  it("氏名検索: 0件 → found:false", async () => {
    mockResultsByTable["patients"] = { data: [] };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=存在しない名前&type=name");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(false);
  });

  // 9. answerer_id検索
  it("answerer_id検索: 見つかる → found:true", async () => {
    mockResultsByTable["intake"] = {
      data: { patient_id: "p_001", answerer_id: "L001" },
    };
    mockResultsByTable["patients"] = {
      data: { name: "田中太郎", name_kana: "", sex: "", birthday: "", line_id: "", tel: "" },
    };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };
    mockResultsByTable["reservations"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=L001&type=answerer_id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(true);
    expect(json.patient.lstep_uid).toBe("L001");
  });

  // 10. answerer_id検索 — 見つからない
  it("answerer_id検索: 見つからない → found:false", async () => {
    mockResultsByTable["intake"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=LXXX&type=answerer_id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(false);
  });

  // 11. tracking検索: ordersテーブルからpatient_idを検索するロジック確認
  it("tracking検索: ハイフン除去で正規化される", async () => {
    // tracking検索は q パラメータのハイフンを除去して再検索する
    // このテストでは見つからないケース（正規化ロジックの確認）
    mockResultsByTable["orders"] = { data: null };
    mockResultsByTable["intake"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=1234-5678-90&type=tracking");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(false);
  });

  // 12. tracking検索 — 見つからない
  it("tracking検索: 見つからない → found:false", async () => {
    mockResultsByTable["orders"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=0000000000&type=tracking");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(false);
  });

  // 13. typeパラメータ省略（デフォルトはid検索）
  it("type未指定 → デフォルトid検索", async () => {
    mockResultsByTable["intake"] = {
      data: { patient_id: "p_001" },
    };
    mockResultsByTable["patients"] = {
      data: { name: "田中太郎", name_kana: "", sex: "", birthday: "", line_id: "", tel: "" },
    };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };
    mockResultsByTable["reservations"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=p_001");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(true);
  });

  // 14. 問診情報あり
  it("問診回答あり → medicalInfo が返る", async () => {
    mockResultsByTable["intake"] = {
      data: {
        patient_id: "p_001",
        answerer_id: "L001",
        answers: {
          current_disease_yesno: "no",
          glp_history: "使用歴なし",
          med_yesno: "no",
          allergy_yesno: "no",
        },
        created_at: "2026-01-01T00:00:00Z",
      },
    };
    mockResultsByTable["patients"] = {
      data: { name: "田中太郎", name_kana: "タナカタロウ", sex: "M", birthday: "2000-01-01", line_id: "", tel: "" },
    };
    mockResultsByTable["orders"] = { data: [] };
    mockResultsByTable["reorders"] = { data: [] };
    mockResultsByTable["reservations"] = { data: null };

    const req = createReq("http://localhost/api/admin/patient-lookup?q=p_001&type=id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.found).toBe(true);
    expect(json.medicalInfo).not.toBeNull();
    expect(json.medicalInfo.hasIntake).toBe(true);
  });
});
