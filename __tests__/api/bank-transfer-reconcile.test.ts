// __tests__/api/bank-transfer-reconcile.test.ts
// 銀行振込CSV一括照合API（reconcile/route.ts）のテスト
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
const mockChain: any = {};
[
  "insert", "update", "delete", "select", "eq", "neq",
  "in", "is", "not", "order", "limit", "range", "single",
  "maybeSingle", "upsert", "like", "gte", "lte",
].forEach((m) => {
  mockChain[m] = vi.fn().mockReturnValue(mockChain);
});
// デフォルト: select は空配列を返す
mockChain.select.mockReturnValue(mockChain);
mockChain.eq.mockReturnValue(mockChain);
mockChain.like.mockReturnValue(mockChain);

// 結果を制御するための変数
let pendingOrdersResult: any = { data: [], error: null };
let pendingOrdersWithNamesResult: any = { data: [], error: null };
let allBtOrdersResult: any = { data: [], error: null };
let updateResult: any = { error: null };

// from の呼び出し回数でどのクエリかを判定
let fromCallCount = 0;

const mockFrom = vi.fn(() => {
  fromCallCount++;
  // チェーンモックを返す
  const chain: any = {};
  const methods = [
    "insert", "update", "delete", "select", "eq", "neq",
    "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "like", "gte", "lte",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  // select → eq("status", "pending_confirmation") → eq("payment_method", "bank_transfer")
  // 1回目: pendingOrders, 2回目: pendingOrdersWithNames, 3回目以降: allBtOrders / update
  let eqCount = 0;
  let isSelectQuery = false;
  let isUpdateQuery = false;
  let isLikeQuery = false;

  chain.select = vi.fn().mockImplementation(() => {
    isSelectQuery = true;
    return chain;
  });

  chain.update = vi.fn().mockImplementation(() => {
    isUpdateQuery = true;
    return chain;
  });

  chain.like = vi.fn().mockImplementation(() => {
    isLikeQuery = true;
    // allBtOrders の結果を返す（Promiseを模倣）
    return allBtOrdersResult;
  });

  chain.eq = vi.fn().mockImplementation((key: string, val: any) => {
    eqCount++;
    if (isUpdateQuery) {
      // update().eq() → 更新結果を返す
      return updateResult;
    }
    if (key === "payment_method" && val === "bank_transfer") {
      // pending_confirmation のクエリ完了
      // fromCallCount で判定: 奇数=pendingOrders, 偶数=pendingOrdersWithNames
      if (fromCallCount <= 2) {
        return pendingOrdersResult;
      } else {
        return pendingOrdersWithNamesResult;
      }
    }
    return chain;
  });

  return chain;
});

// createClient をモック
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// fetch をモック（キャッシュ無効化用）
const originalFetch = global.fetch;
const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });

// ルートインポート
import { POST } from "@/app/api/admin/bank-transfer/reconcile/route";

// --- ヘルパー ---

// CSVファイル付きFormDataリクエスト作成
function createFormDataRequest(csvContent: string, hasFile = true): any {
  const formData = new Map<string, any>();
  if (hasFile && csvContent !== "") {
    formData.set("file", {
      text: async () => csvContent,
    });
  }

  return {
    formData: async () => ({
      get: (key: string) => formData.get(key) ?? null,
    }),
    headers: new Headers(),
    nextUrl: { origin: "http://localhost:3000" },
  } as any;
}

// --- テスト本体 ---

describe("bank-transfer reconcile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized = true;
    fromCallCount = 0;
    pendingOrdersResult = { data: [], error: null };
    pendingOrdersWithNamesResult = { data: [], error: null };
    allBtOrdersResult = { data: [], error: null };
    updateResult = { error: null };
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true, text: async () => "" });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // 1. 認証失敗
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;
    const req = createFormDataRequest("header\n2026/01/01,テスト,0,50000,100000");
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // 2. ファイル未指定
  it("CSVファイル未指定 → 400", async () => {
    const req = createFormDataRequest("", false);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("CSVファイル");
  });

  // 3. 空CSV
  it("空のCSV → 400", async () => {
    const req = createFormDataRequest("   \n   \n   ");
    // CSVの行が全て空白のみ→filter後空→lines.length === 0
    // ただし " \n " はtrimするとemptyになりfilterで除外される
    const req2 = createFormDataRequest("");
    // 空文字列のFile
    const formData = new Map<string, any>();
    formData.set("file", { text: async () => "" });
    const emptyReq = {
      formData: async () => ({
        get: (key: string) => formData.get(key) ?? null,
      }),
      headers: new Headers(),
      nextUrl: { origin: "http://localhost:3000" },
    } as any;
    const res = await POST(emptyReq);
    expect(res.status).toBe(400);
  });

  // 4. 入金額が0のCSV
  it("入金データが見つからないCSV → 400", async () => {
    // ヘッダー + 出金のみの行（入金=0）
    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,テスト,50000,0,900000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("入金データが見つかりません");
  });

  // 5. 照合待ち注文が0件
  it("照合待ち注文が0件 → matched:[], unmatched にreason付き", async () => {
    pendingOrdersResult = { data: [], error: null };
    pendingOrdersWithNamesResult = { data: [], error: null };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,タナカ タロウ,0,50000,1000000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched).toEqual([]);
    expect(json.unmatched.length).toBe(1);
    expect(json.unmatched[0].reason).toContain("照合待ちの注文がありません");
  });

  // 6. データ取得エラー
  it("注文データ取得エラー → 500", async () => {
    pendingOrdersResult = { data: null, error: { message: "DB error" } };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,タナカ,0,50000,1000000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("データ取得エラー");
  });

  // 7. 金額+名義人マッチの正常系
  it("金額+名義人一致 → マッチして照合結果を返す", async () => {
    const orders = [
      {
        id: "bt_pending_1",
        patient_id: "p_001",
        product_code: "MJL_2.5mg_1m",
        amount: 50000,
        account_name: "タナカ タロウ",
        shipping_name: "田中太郎",
      },
    ];
    pendingOrdersResult = { data: orders, error: null };
    pendingOrdersWithNamesResult = { data: orders, error: null };
    allBtOrdersResult = { data: [{ id: "bt_1" }], error: null };
    updateResult = { error: null };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,タナカ タロウ,0,50000,1000000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched.length).toBe(1);
    expect(json.matched[0].order.patient_id).toBe("p_001");
    expect(json.matched[0].transfer.amount).toBe(50000);
    expect(json.summary.matched).toBe(1);
    expect(json.summary.unmatched).toBe(0);
  });

  // 8. 金額一致・名義人不一致 → アンマッチ
  it("金額一致だが名義人不一致 → unmatched", async () => {
    const orders = [
      {
        id: "bt_pending_1",
        patient_id: "p_001",
        product_code: "MJL_2.5mg_1m",
        amount: 50000,
        account_name: "ヤマダ ハナコ",
        shipping_name: "山田花子",
      },
    ];
    pendingOrdersResult = { data: orders, error: null };
    pendingOrdersWithNamesResult = { data: orders, error: null };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,タナカ タロウ,0,50000,1000000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched.length).toBe(0);
    expect(json.unmatched.length).toBe(1);
    expect(json.unmatched[0].reason).toContain("該当する注文が見つかりません");
  });

  // 9. 複数振込・複数注文の照合
  it("複数振込×複数注文の照合", async () => {
    const orders = [
      {
        id: "bt_pending_1",
        patient_id: "p_001",
        product_code: "MJL_2.5mg_1m",
        amount: 50000,
        account_name: "タナカ タロウ",
        shipping_name: "",
      },
      {
        id: "bt_pending_2",
        patient_id: "p_002",
        product_code: "MJL_5mg_1m",
        amount: 30000,
        account_name: "ヤマダ ハナコ",
        shipping_name: "",
      },
    ];
    pendingOrdersResult = { data: orders, error: null };
    pendingOrdersWithNamesResult = { data: orders, error: null };
    allBtOrdersResult = { data: [], error: null };
    updateResult = { error: null };

    const csv = [
      "日付,摘要,出金,入金,残高",
      "2026/01/01,タナカ タロウ,0,50000,1000000",
      "2026/01/02,ヤマダ ハナコ,0,30000,1030000",
      "2026/01/03,サトウ ジロウ,0,20000,1050000", // マッチしない
    ].join("\n");

    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched.length).toBe(2);
    expect(json.unmatched.length).toBe(1);
    expect(json.summary.total).toBe(3);
  });

  // 10. account_name が空の注文はスキップ
  it("account_name が空の注文はスキップ", async () => {
    const orders = [
      {
        id: "bt_pending_1",
        patient_id: "p_001",
        product_code: "MJL_2.5mg_1m",
        amount: 50000,
        account_name: "",
        shipping_name: "",
      },
    ];
    pendingOrdersResult = { data: orders, error: null };
    pendingOrdersWithNamesResult = { data: orders, error: null };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,テスト,0,50000,1000000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched.length).toBe(0);
  });

  // 11. CSVパース: ダブルクォート対応
  it("ダブルクォート付きCSVをパースできる", async () => {
    pendingOrdersResult = { data: [], error: null };

    const csv = '日付,摘要,出金,入金,残高\n"2026/01/01","タナカ タロウ","0","50,000","1,000,000"';
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // 入金が50000として解釈されること
    expect(json.unmatched.length).toBe(1);
    expect(json.unmatched[0].amount).toBe(50000);
  });

  // 12. 更新エラー時の処理
  it("更新エラー時もレスポンスは200で返る", async () => {
    const orders = [
      {
        id: "bt_pending_1",
        patient_id: "p_001",
        product_code: "MJL_2.5mg_1m",
        amount: 50000,
        account_name: "タナカ タロウ",
        shipping_name: "",
      },
    ];
    pendingOrdersResult = { data: orders, error: null };
    pendingOrdersWithNamesResult = { data: orders, error: null };
    allBtOrdersResult = { data: [], error: null };
    updateResult = { error: { message: "update failed" } };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,タナカ タロウ,0,50000,1000000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched.length).toBe(1);
    expect(json.matched[0].updateSuccess).toBe(false);
  });

  // 13. pendingOrders が null の場合
  it("pendingOrders が null → 照合0件扱い", async () => {
    pendingOrdersResult = { data: null, error: null };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,タナカ,0,50000,1000000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched).toEqual([]);
    expect(json.unmatched.length).toBe(1);
  });

  // 14. CSVのヘッダー行をスキップ
  it("ヘッダー行（1行目）をスキップして2行目以降をパース", async () => {
    pendingOrdersResult = { data: [], error: null };

    const csv = "日付,摘要,出金,入金,残高\n2026/01/01,テスト,0,30000,500000";
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // ヘッダー行は入金額が0なのでtransfersに含まれない
    // データ行の入金30000のみ
    expect(json.unmatched.length).toBe(1);
    expect(json.unmatched[0].amount).toBe(30000);
  });

  // 15. 出金のみの行はスキップ
  it("出金のみの行（入金0）はフィルタされる", async () => {
    pendingOrdersResult = { data: [], error: null };

    const csv = [
      "日付,摘要,出金,入金,残高",
      "2026/01/01,出金テスト,50000,0,900000",
      "2026/01/02,入金テスト,0,30000,930000",
    ].join("\n");
    const req = createFormDataRequest(csv);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // 入金のみの1件がunmatched
    expect(json.unmatched.length).toBe(1);
    expect(json.unmatched[0].amount).toBe(30000);
  });

  // 16. 例外発生時
  it("例外発生 → 500", async () => {
    const req = {
      formData: async () => {
        throw new Error("formData解析エラー");
      },
      headers: new Headers(),
      nextUrl: { origin: "http://localhost:3000" },
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("formData解析エラー");
  });
});
