// __tests__/api/register-personal-info.test.ts
// 個人情報登録API（app/api/register/personal-info/route.ts）のテスト
// 患者認証（LINEログイン）ベース。admin認証ではない。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モック設定 ===
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockLinkRichMenuToUser = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/line-richmenu", () => ({
  linkRichMenuToUser: mockLinkRichMenuToUser,
}));

vi.mock("@/lib/merge-tables", () => ({
  MERGE_TABLES: ["reservations", "orders", "reorders", "message_log", "patient_tags", "patient_marks", "friend_field_values"],
}));

// === Supabase モック（テーブル名ベース） ===
let tableChains: Record<string, any> = {};
let rpcResult: { data: any; error: any } = { data: null, error: null };

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "single", "upsert",
   "ilike", "or", "count", "csv", "like"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => rpcResult),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  rpcResult = { data: null, error: null };
  mockLinkRichMenuToUser.mockResolvedValue(true);
});

// リクエストヘルパー: cookie付きNextRequest生成
function createRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
  const url = "http://localhost/api/register/personal-info";
  const req = new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // cookie を設定
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

const validBody = {
  name: "田中太郎",
  name_kana: "タナカタロウ",
  sex: "男性",
  birthday: "1990-01-01",
};

// ======================================
// バリデーションテスト
// ======================================
describe("register/personal-info バリデーション", () => {
  it("名前なし -> 400", async () => {
    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest({ ...validBody, name: "" });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("カナなし -> 400", async () => {
    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest({ ...validBody, name_kana: "" });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("性別なし -> 400", async () => {
    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest({ ...validBody, sex: "" });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("生年月日なし -> 400", async () => {
    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest({ ...validBody, birthday: "" });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ======================================
// 新規患者: SEQUENCE採番
// ======================================
describe("register/personal-info 新規患者（SEQUENCE）", () => {
  it("LINE cookie なし + patient_id cookie なし -> SEQUENCEで新規ID取得", async () => {
    // SEQUENCEが新しいIDを返す
    rpcResult = { data: "10001", error: null };

    // patients.select -> 既存患者なし
    tableChains["patients"] = createChain({ data: null, error: null });

    // intake.select -> 既存intakeなし
    tableChains["intake"] = createChain({ data: null, error: null });

    // patient_tags upsert -> 成功
    tableChains["patient_tags"] = createChain({ data: null, error: null });

    // rich_menus -> なし（line_user_id空なのでスキップ）
    tableChains["rich_menus"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest(validBody);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient_id).toBe("10001");
  });
});

// ======================================
// 新規患者: MAX+1フォールバック
// ======================================
describe("register/personal-info 新規患者（MAX+1フォールバック）", () => {
  it("SEQUENCE失敗 -> MAX+1で採番", async () => {
    // SEQUENCEがエラー
    rpcResult = { data: null, error: { message: "function not found" } };

    // patients.select (MAX+1用) -> 既存の最大ID
    const patientsChain = createChain({ data: [{ patient_id: "10050" }], error: null });
    tableChains["patients"] = patientsChain;

    // intake -> なし
    tableChains["intake"] = createChain({ data: null, error: null });
    tableChains["patient_tags"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest(validBody);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // MAX(10050) + 1 = 10051
    expect(json.patient_id).toBe("10051");
  });
});

// ======================================
// 既存患者: LINE再ログイン
// ======================================
describe("register/personal-info 既存患者（LINE再ログイン）", () => {
  it("line_user_id cookie -> 既存数値IDで更新", async () => {
    // patients テーブル: line_idで検索 -> 既存患者
    const patientsChain = createChain({ data: { patient_id: "10005" }, error: null });
    tableChains["patients"] = patientsChain;

    // intake -> 既存intakeあり
    tableChains["intake"] = createChain({ data: { id: 99, answers: { 血圧: "正常" } }, error: null });

    tableChains["patient_tags"] = createChain({ data: null, error: null });
    tableChains["rich_menus"] = createChain({ data: { line_rich_menu_id: "richmenu-xxx" }, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest(validBody, { line_user_id: "U12345" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient_id).toBe("10005");
    // リッチメニュー切り替えが呼ばれる
    expect(mockLinkRichMenuToUser).toHaveBeenCalledWith("U12345", "richmenu-xxx", "test-tenant");
  });
});

// ======================================
// LINE_仮ID統合テスト
// ======================================
describe("register/personal-info LINE_仮ID統合", () => {
  it("LINE_仮ID -> 正式ID統合後、全テーブルのpatient_idを更新", async () => {
    // SEQUENCEが新しいIDを返す
    rpcResult = { data: "10099", error: null };

    // patients テーブル: line_idで検索 -> LINE_仮ID
    const patientsChain = createChain({ data: { patient_id: "LINE_U12345" }, error: null });
    tableChains["patients"] = patientsChain;

    // 統合対象テーブル（intake, patients, reservations, orders, etc.）
    tableChains["intake"] = createChain({ data: null, error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: null, error: null });
    tableChains["reorders"] = createChain({ data: null, error: null });
    tableChains["message_log"] = createChain({ data: null, error: null });
    tableChains["patient_tags"] = createChain({ data: null, error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: null, error: null });
    tableChains["rich_menus"] = createChain({ data: { line_rich_menu_id: "richmenu-new" }, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest(validBody, { line_user_id: "U12345" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient_id).toBe("10099");
  });
});

// ======================================
// cookie からの patient_id 取得
// ======================================
describe("register/personal-info cookie patient_id", () => {
  it("patient_id cookie -> 既存患者として更新", async () => {
    // patients テーブル: 既存患者あり
    const patientsChain = createChain({ data: { patient_id: "10020" }, error: null });
    tableChains["patients"] = patientsChain;

    tableChains["intake"] = createChain({ data: null, error: null });
    tableChains["patient_tags"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest(validBody, { patient_id: "10020" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient_id).toBe("10020");
  });

  it("LINE_から始まるcookie patient_id -> 無視して新規採番", async () => {
    rpcResult = { data: "10100", error: null };

    // patients テーブル: line_idで検索 -> なし
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });
    tableChains["patient_tags"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    // LINE_仮IDがcookieにある場合は無視
    const req = createRequest(validBody, { patient_id: "LINE_U99999" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient_id).toBe("10100");
  });
});

// ======================================
// 患者insert UNIQUE違反フォールバック
// ======================================
describe("register/personal-info UNIQUE違反フォールバック", () => {
  it("insert時に23505エラー -> updateにフォールバック", async () => {
    rpcResult = { data: "10200", error: null };

    // patients.select -> 既存なし（maybeSingle null）
    // patients.insert -> UNIQUE違反
    const patientsChain = createChain({ data: null, error: null });
    // maybeSingle: 1回目（line_id検索）null -> 2回目（patient_id検索）null
    patientsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: { code: "23505", message: "duplicate" } }));
    tableChains["patients"] = patientsChain;

    tableChains["intake"] = createChain({ data: null, error: null });
    tableChains["patient_tags"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest(validBody);

    const res = await POST(req);
    const json = await res.json();

    // UNIQUE違反があってもレスポンスは200（フォールバックupdate）
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ======================================
// エラーハンドリング
// ======================================
describe("register/personal-info エラーハンドリング", () => {
  it("不正なJSON -> 400", async () => {
    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = new NextRequest("http://localhost/api/register/personal-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json{{{",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ======================================
// レスポンスCookie
// ======================================
describe("register/personal-info レスポンスCookie", () => {
  it("正常完了時にpatient_id cookieが設定される", async () => {
    rpcResult = { data: "10300", error: null };

    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });
    tableChains["patient_tags"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/register/personal-info/route");
    const req = createRequest(validBody);

    const res = await POST(req);

    // Set-Cookie ヘッダーに patient_id が含まれる
    const setCookies = res.headers.getSetCookie();
    const hasPatientIdCookie = setCookies.some(c => c.includes("patient_id=10300"));
    expect(hasPatientIdCookie).toBe(true);
  });
});
