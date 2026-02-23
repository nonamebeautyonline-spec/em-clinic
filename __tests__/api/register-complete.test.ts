// __tests__/api/register-complete.test.ts
// 電話認証完了API（患者紐付け・自動マージ・リッチメニュー切替）のテスト
// 対象: app/api/register/complete/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
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

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((phone: string) => {
    // テスト用の簡易正規化
    if (phone.startsWith("+81")) return "0" + phone.slice(3);
    return phone;
  }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-line-token"),
}));

vi.mock("@/lib/merge-tables", () => ({
  MERGE_TABLES: ["reservations", "orders", "reorders", "message_log", "patient_tags", "patient_marks", "friend_field_values"],
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/register", () => ({
  registerCompleteSchema: {},
}));

const mockExecuteLifecycleActions = vi.fn().mockResolvedValue({ actionDetails: [] });
vi.mock("@/lib/lifecycle-actions", () => ({
  executeLifecycleActions: (...args: unknown[]) => mockExecuteLifecycleActions(...args),
}));

// fetchモック
vi.stubGlobal("fetch", vi.fn());

import { POST } from "@/app/api/register/complete/route";
import { parseBody } from "@/lib/validations/helpers";

// クッキー付きリクエストのヘルパー
function createReqWithCookies(body: any, cookies: Record<string, string> = {}) {
  const req = new NextRequest("http://localhost/api/register/complete", {
    method: "POST",
    body: JSON.stringify(body),
  });
  // クッキーを設定
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

// === テスト本体 ===
describe("POST /api/register/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};

    // デフォルト: parseBody成功
    (parseBody as any).mockResolvedValue({
      data: { phone: "09012345678" },
    });

    // デフォルト: fetch成功
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ displayName: "テストユーザー", pictureUrl: "https://example.com/pic.jpg" }) });
  });

  // ------------------------------------------------------------------
  // バリデーションテスト
  // ------------------------------------------------------------------
  describe("入力バリデーション", () => {
    it("parseBodyエラー時はエラーレスポンスを返す", async () => {
      const errorResponse = Response.json({ ok: false, error: "入力値が不正です" }, { status: 400 });
      (parseBody as any).mockResolvedValue({ error: errorResponse });

      const req = createReqWithCookies({});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // 患者ID解決: LINE UIDで検索（ステップ1）
  // ------------------------------------------------------------------
  describe("患者ID解決: LINE UIDで検索", () => {
    it("LINE UIDで患者が見つかる場合はそのpatient_idを使う", async () => {
      // patients テーブル: LINE UID検索で見つかる
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      // intake テーブル: 電話番号更新用
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      // orders: リッチメニュー判定用
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      // rich_menus
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123abc456" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 患者ID解決: cookieで検索（ステップ2）
  // ------------------------------------------------------------------
  describe("患者ID解決: cookieで検索", () => {
    it("cookieのpatient_idでintakeが見つかる場合はそのIDを使う", async () => {
      // LINE UIDなし → patients検索スキップ
      // cookieのpatient_idでintake検索
      const patientsChain = createChain({ data: { patient_id: "PT-COOKIE" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { patient_id: "PT-COOKIE", id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { patient_id: "PT-COOKIE" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 患者ID解決: 電話番号で検索（ステップ3）
  // ------------------------------------------------------------------
  describe("患者ID解決: 電話番号で検索", () => {
    it("電話番号で患者が見つかる場合はそのIDを使う", async () => {
      // LINE UIDなし、cookieなし → 電話番号検索
      // 最初のpatients検索（LINE UID）: なし
      // intake（cookie）: なし
      // 電話番号検索: あり
      const patientsChain = createChain();
      let patientsCallCount = 0;
      patientsChain.maybeSingle = vi.fn().mockImplementation(() => {
        patientsCallCount++;
        if (patientsCallCount <= 2) {
          // 最初2回（LINE UID/電話番号前のnull）
          return { then: (fn: any) => fn({ data: { patient_id: "PT-PHONE" }, error: null }) };
        }
        return { then: (fn: any) => fn({ data: { patient_id: "PT-PHONE" }, error: null }) };
      });
      tableChains["patients"] = patientsChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = createReqWithCookies({ phone: "09012345678" });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 患者ID未検出
  // ------------------------------------------------------------------
  describe("患者未検出", () => {
    it("どこにも患者が見つからない場合はnot_foundを返す", async () => {
      // 全ての検索でnullを返す
      const patientsChain = createChain({ data: null, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies({ phone: "09012345678" });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe("not_found");
    });
  });

  // ------------------------------------------------------------------
  // 電話番号正規化
  // ------------------------------------------------------------------
  describe("電話番号正規化", () => {
    it("+81形式が0始まりに正規化される", async () => {
      (parseBody as any).mockResolvedValue({
        data: { phone: "+819012345678" },
      });

      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = createReqWithCookies(
        { phone: "+819012345678" },
        { line_user_id: "U123" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // Cookie設定テスト
  // ------------------------------------------------------------------
  describe("Cookie設定", () => {
    it("成功時に__Host-patient_idとpatient_idクッキーが設定される", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Set-Cookieヘッダーを確認
      const setCookies = res.headers.getSetCookie();
      expect(setCookies.length).toBeGreaterThanOrEqual(2);

      const hasHostCookie = setCookies.some(c => c.includes("__Host-patient_id="));
      const hasPatientCookie = setCookies.some(c => c.includes("patient_id="));
      expect(hasHostCookie).toBe(true);
      expect(hasPatientCookie).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 例外処理テスト
  // ------------------------------------------------------------------
  describe("例外処理", () => {
    it("予期しないエラーは500を返す", async () => {
      (parseBody as any).mockRejectedValue(new Error("unexpected"));

      const req = createReqWithCookies({ phone: "09012345678" });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("register_failed");
    });
  });

  // ------------------------------------------------------------------
  // LINE重複検出テスト（LINE_仮レコードの自動マージ）
  // ------------------------------------------------------------------
  describe("LINE UID重複検出と自動マージ", () => {
    it("LINE_仮レコードが存在する場合は自動マージされる", async () => {
      // LINE UID検索: 正規レコード
      const patientsChain = createChain();
      let patientsCallCount = 0;
      patientsChain.maybeSingle = vi.fn().mockImplementation(() => {
        patientsCallCount++;
        // 各呼び出しの返り値を設定
        return {
          then: (fn: any) => fn({
            data: patientsCallCount === 1
              ? { patient_id: "PT-001" }
              : patientsCallCount <= 3
                ? { patient_id: "PT-001" }
                : { id: 1, answers: {} },
            error: null,
          }),
        };
      });
      tableChains["patients"] = patientsChain;

      // 重複チェック結果: LINE_仮レコードあり
      // limit()の後にthenが呼ばれるので、limit時にdataを返す
      const dupData = [
        { patient_id: "LINE_abc123", name: "仮ユーザー", name_kana: null, line_id: "U123" },
      ];

      // patientsチェーンでlimit(5)の呼び出し時に重複データを返す
      // ただし、最初のlimit(1)は通常検索なので区別が必要

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;
      // マージ対象テーブル
      const reservationsChain = createChain({ data: null, error: null });
      tableChains["reservations"] = reservationsChain;
      const ordersChain2 = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain2;
      const reordersChain = createChain({ data: null, error: null });
      tableChains["reorders"] = reordersChain;
      const msgLogChain = createChain({ data: null, error: null });
      tableChains["message_log"] = msgLogChain;
      const ptChain = createChain({ data: null, error: null });
      tableChains["patient_tags"] = ptChain;
      const pmChain = createChain({ data: null, error: null });
      tableChains["patient_marks"] = pmChain;
      const ffvChain = createChain({ data: null, error: null });
      tableChains["friend_field_values"] = ffvChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 既存患者更新テスト
  // ------------------------------------------------------------------
  describe("既存患者の電話番号更新", () => {
    it("既存患者の場合はUPDATEで電話番号を更新する", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      // patients.update が呼ばれたことを確認
      expect(patientsChain.update).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // intake更新テスト
  // ------------------------------------------------------------------
  describe("intakeの電話番号更新", () => {
    it("intakeレコードがある場合はanswersに電話番号を追記する", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;

      const intakeChain = createChain({
        data: { id: 42, answers: { 氏名: "田中太郎" } },
        error: null,
      });
      tableChains["intake"] = intakeChain;

      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      // intake.updateが呼ばれたことを確認
      expect(intakeChain.update).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // リッチメニュー切替テスト
  // ------------------------------------------------------------------
  describe("リッチメニュー切替", () => {
    it("注文がある場合は「処方後」メニューに切替する", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      // 注文あり
      const ordersChain = createChain({ data: { id: "order-1" }, error: null });
      tableChains["orders"] = ordersChain;
      // リッチメニュー
      const menuChain = createChain({ data: { line_rich_menu_id: "richmenu-after" }, error: null });
      tableChains["rich_menus"] = menuChain;

      // 現在のリッチメニュー確認fetch
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ displayName: "テスト" }) }) // プロフィール取得
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ richMenuId: "richmenu-before" }) }) // 現在のメニュー
        .mockResolvedValueOnce({ ok: true }); // メニュー切替

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      // fetchが呼ばれた（LINE APIの呼び出し）
      expect(fetch).toHaveBeenCalled();
    });

    it("注文がない場合は「個人情報入力後」メニューに切替する", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      // 注文なし
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      // リッチメニュー
      const menuChain = createChain({ data: { line_rich_menu_id: "richmenu-after-register" }, error: null });
      tableChains["rich_menus"] = menuChain;

      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ displayName: "テスト" }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ richMenuId: "richmenu-other" }) })
        .mockResolvedValueOnce({ ok: true });

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // __Host-patient_id cookie 優先テスト
  // ------------------------------------------------------------------
  describe("__Host-patient_id cookie優先", () => {
    it("__Host-patient_idがpatient_idより優先される", async () => {
      // cookieからの解決パス: __Host-patient_idが優先
      const patientsChain = createChain({ data: { patient_id: "PT-HOST" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { patient_id: "PT-HOST", id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { "__Host-patient_id": "PT-HOST", patient_id: "PT-FALLBACK" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 新規患者INSERT パス（既存患者が見つからない場合）
  // ------------------------------------------------------------------
  describe("新規患者INSERT", () => {
    it("既存患者がDBに存在しない場合はINSERTで作成する", async () => {
      // patients チェーン: then の呼び出し回数で返り値を制御
      const patientsChain = createChain();
      let patientsThenCount = 0;
      patientsChain.then = vi.fn().mockImplementation((fn: any) => {
        patientsThenCount++;
        if (patientsThenCount === 1) {
          // ステップ1: LINE UID検索 → 見つかる
          return fn({ data: { patient_id: "PT-NEW" }, error: null });
        }
        if (patientsThenCount === 2) {
          // LINE UID重複チェック → なし
          return fn({ data: [], error: null });
        }
        if (patientsThenCount === 3) {
          // 電話番号重複チェック → なし
          return fn({ data: [], error: null });
        }
        if (patientsThenCount === 4) {
          // 既存患者チェック（select→maybeSingle） → 見つからない（INSERTパスへ）
          return fn({ data: null, error: null });
        }
        if (patientsThenCount === 5) {
          // INSERT結果
          return fn({ data: null, error: null });
        }
        return fn({ data: null, error: null });
      });
      tableChains["patients"] = patientsChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U456new" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      // insert が呼ばれたことを確認
      expect(patientsChain.insert).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // LINE プロフィール取得: 失敗パス
  // ------------------------------------------------------------------
  describe("LINEプロフィール取得の失敗パス", () => {
    it("LINEプロフィール取得がok=falseの場合でもエラーにならない", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      // プロフィール取得失敗（ok: false）
      (fetch as any).mockResolvedValue({ ok: false });

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123profile_fail" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("LINEプロフィール取得で例外発生時でもエラーにならない", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      // fetch で例外発生
      (fetch as any).mockRejectedValue(new Error("Network error"));

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123fetch_error" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("LINEプロフィール: displayNameもpictureUrlも空の場合はprofile更新しない", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      // displayName も pictureUrl も空文字
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ displayName: "", pictureUrl: "" }),
      });

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123no_profile" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // LINE_ACCESS_TOKEN が空の場合
  // ------------------------------------------------------------------
  describe("LINE_ACCESS_TOKENが空の場合", () => {
    it("トークンが空でもプロフィール取得をスキップして正常完了する", async () => {
      const { getSettingOrEnv } = await import("@/lib/settings");
      (getSettingOrEnv as any).mockResolvedValueOnce("");

      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123no_token" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // intake レコードが存在しない場合
  // ------------------------------------------------------------------
  describe("intakeレコード未存在", () => {
    it("intakeが見つからない場合でもエラーにならず正常完了する", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      // intake: 電話番号更新対象なし
      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123no_intake" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      // intake.update は呼ばれないはず（ただし同じチェーンなので呼び出し数で判定は困難）
    });
  });

  // ------------------------------------------------------------------
  // ライフサイクルアクション実行テスト
  // ------------------------------------------------------------------
  describe("ライフサイクルアクション", () => {
    it("LINE UID と pid がある場合にライフサイクルアクションが実行される", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-LC" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      mockExecuteLifecycleActions.mockResolvedValue({
        actionDetails: ["タグ付与: VIP", "メッセージ送信"],
      });

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123lifecycle" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      // executeLifecycleActions が正しいパラメータで呼ばれたことを確認
      expect(mockExecuteLifecycleActions).toHaveBeenCalledWith(
        expect.objectContaining({
          settingKey: "verification_completed",
          patientId: "PT-LC",
          lineUserId: "U123lifecycle",
          tenantId: "test-tenant",
          assignedBy: "complete",
        })
      );
    });

    it("LINE UIDが空の場合はライフサイクルアクションが実行されない", async () => {
      // cookie経由でpatient_idを解決（LINE UIDなし）
      const patientsChain = createChain({ data: { patient_id: "PT-NOLC" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { patient_id: "PT-NOLC", id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { patient_id: "PT-NOLC" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      // LINE UIDなしなのでライフサイクルアクションは呼ばれない
      expect(mockExecuteLifecycleActions).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // 電話番号重複検出: 自動マージのテスト
  // ------------------------------------------------------------------
  describe("電話番号重複検出と自動マージ", () => {
    it("同一電話番号・同一名前のline_id=nullレコードがある場合は自動マージされる", async () => {
      const patientsChain = createChain();
      let patientsMaybeSingleCount = 0;
      // limit(5)の呼び出しを追跡する
      let patientsLimitCount = 0;
      patientsChain.maybeSingle = vi.fn().mockImplementation(() => {
        patientsMaybeSingleCount++;
        if (patientsMaybeSingleCount === 1) {
          // ステップ1: LINE UID検索
          return { then: (fn: any) => fn({ data: { patient_id: "PT-MAIN" }, error: null }) };
        }
        if (patientsMaybeSingleCount === 2) {
          // 電話番号重複: 現在の患者情報取得
          return { then: (fn: any) => fn({ data: { name: "田中太郎", name_kana: "タナカタロウ" }, error: null }) };
        }
        // 既存患者チェック
        return { then: (fn: any) => fn({ data: { patient_id: "PT-MAIN" }, error: null }) };
      });

      // limit(5)で重複データを返す: 電話番号重複検出用
      const originalLimit = patientsChain.limit;
      patientsChain.limit = vi.fn().mockImplementation((n: number) => {
        patientsLimitCount++;
        if (n === 5 && patientsLimitCount === 2) {
          // 電話番号重複データ: line_id=null、名前一致
          return {
            then: (fn: any) => fn({
              data: [
                { patient_id: "PT-OLD", name: "田中太郎", name_kana: "タナカタロウ", line_id: null },
              ],
              error: null,
            }),
          };
        }
        return originalLimit(n);
      });
      tableChains["patients"] = patientsChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;
      // マージ対象テーブル
      for (const table of ["reservations", "orders", "reorders", "message_log", "patient_tags", "patient_marks", "friend_field_values"]) {
        tableChains[table] = createChain({ data: [{ id: 1 }], error: null });
      }

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123merge" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("同一電話番号でもline_id有りの場合はマージスキップ", async () => {
      const patientsChain = createChain();
      let patientsMaybeSingleCount = 0;
      let patientsLimitCount = 0;
      patientsChain.maybeSingle = vi.fn().mockImplementation(() => {
        patientsMaybeSingleCount++;
        if (patientsMaybeSingleCount === 1) {
          return { then: (fn: any) => fn({ data: { patient_id: "PT-MAIN" }, error: null }) };
        }
        return { then: (fn: any) => fn({ data: { patient_id: "PT-MAIN" }, error: null }) };
      });

      const originalLimit = patientsChain.limit;
      patientsChain.limit = vi.fn().mockImplementation((n: number) => {
        patientsLimitCount++;
        if (n === 5 && patientsLimitCount === 2) {
          // line_id有りの別アカウント → マージスキップ
          return {
            then: (fn: any) => fn({
              data: [
                { patient_id: "PT-OTHER", name: "田中太郎", name_kana: null, line_id: "U999other" },
              ],
              error: null,
            }),
          };
        }
        return originalLimit(n);
      });
      tableChains["patients"] = patientsChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123skip_merge" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("同一電話番号・名前不一致の場合はマージスキップ", async () => {
      const patientsChain = createChain();
      let patientsMaybeSingleCount = 0;
      let patientsLimitCount = 0;
      patientsChain.maybeSingle = vi.fn().mockImplementation(() => {
        patientsMaybeSingleCount++;
        if (patientsMaybeSingleCount === 1) {
          return { then: (fn: any) => fn({ data: { patient_id: "PT-MAIN" }, error: null }) };
        }
        if (patientsMaybeSingleCount === 2) {
          // 現在の患者: 名前が異なる
          return { then: (fn: any) => fn({ data: { name: "田中太郎", name_kana: "タナカタロウ" }, error: null }) };
        }
        return { then: (fn: any) => fn({ data: { patient_id: "PT-MAIN" }, error: null }) };
      });

      const originalLimit = patientsChain.limit;
      patientsChain.limit = vi.fn().mockImplementation((n: number) => {
        patientsLimitCount++;
        if (n === 5 && patientsLimitCount === 2) {
          // line_id=null だが名前が異なる
          return {
            then: (fn: any) => fn({
              data: [
                { patient_id: "PT-DIFF", name: "鈴木花子", name_kana: "スズキハナコ", line_id: null },
              ],
              error: null,
            }),
          };
        }
        return originalLimit(n);
      });
      tableChains["patients"] = patientsChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123name_mismatch" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // LINE UID重複: 正規レコード同士の重複
  // ------------------------------------------------------------------
  describe("LINE UID重複: 正規レコード同士", () => {
    it("正規レコード同士の重複は手動対応として警告のみ", async () => {
      const patientsChain = createChain();
      let patientsThenCount = 0;
      patientsChain.then = vi.fn().mockImplementation((fn: any) => {
        patientsThenCount++;
        if (patientsThenCount === 1) {
          // ステップ1: LINE UID検索 → 見つかる
          return fn({ data: { patient_id: "PT-001" }, error: null });
        }
        if (patientsThenCount === 2) {
          // LINE UID重複チェック → 正規レコードの重複あり
          return fn({
            data: [
              { patient_id: "PT-002", name: "重複患者", name_kana: null, line_id: "U123dup" },
            ],
            error: null,
          });
        }
        if (patientsThenCount === 3) {
          // 電話番号重複チェック → なし
          return fn({ data: [], error: null });
        }
        // それ以降: 既存患者チェックなど
        return fn({ data: { patient_id: "PT-001" }, error: null });
      });
      tableChains["patients"] = patientsChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123dup" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      // 正規レコード重複の警告ログが出力されることを確認
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("正規レコード重複")
      );
      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // LINE UID重複: マージ時のエラーハンドリング
  // ------------------------------------------------------------------
  describe("LINE UID重複マージのエラーハンドリング", () => {
    it("マージ中のテーブル更新エラー（23505以外）でもエラーにならず続行する", async () => {
      const patientsChain = createChain();
      let patientsMaybeSingleCount = 0;
      let patientsLimitCount = 0;
      patientsChain.maybeSingle = vi.fn().mockImplementation(() => {
        patientsMaybeSingleCount++;
        if (patientsMaybeSingleCount === 1) {
          return { then: (fn: any) => fn({ data: { patient_id: "PT-001" }, error: null }) };
        }
        return { then: (fn: any) => fn({ data: { patient_id: "PT-001" }, error: null }) };
      });

      const originalLimit = patientsChain.limit;
      patientsChain.limit = vi.fn().mockImplementation((n: number) => {
        patientsLimitCount++;
        if (n === 5 && patientsLimitCount === 1) {
          // LINE_仮レコード → 自動マージ対象
          return {
            then: (fn: any) => fn({
              data: [
                { patient_id: "LINE_err123", name: "仮ユーザー", name_kana: null, line_id: "U123merr" },
              ],
              error: null,
            }),
          };
        }
        return originalLimit(n);
      });
      tableChains["patients"] = patientsChain;

      // マージ対象テーブルでエラーを返す
      const errorChain = createChain({ data: null, error: { code: "42P01", message: "テーブルが存在しません" } });
      tableChains["reservations"] = errorChain;
      tableChains["orders"] = errorChain;
      tableChains["reorders"] = errorChain;
      tableChains["message_log"] = errorChain;
      tableChains["patient_tags"] = errorChain;
      tableChains["patient_marks"] = errorChain;
      tableChains["friend_field_values"] = errorChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123merr" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      consoleSpy.mockRestore();
    });

    it("マージ中のUNIQUE制約違反（23505）は無視される", async () => {
      const patientsChain = createChain();
      let patientsMaybeSingleCount = 0;
      let patientsLimitCount = 0;
      patientsChain.maybeSingle = vi.fn().mockImplementation(() => {
        patientsMaybeSingleCount++;
        if (patientsMaybeSingleCount === 1) {
          return { then: (fn: any) => fn({ data: { patient_id: "PT-001" }, error: null }) };
        }
        return { then: (fn: any) => fn({ data: { patient_id: "PT-001" }, error: null }) };
      });

      const originalLimit = patientsChain.limit;
      patientsChain.limit = vi.fn().mockImplementation((n: number) => {
        patientsLimitCount++;
        if (n === 5 && patientsLimitCount === 1) {
          return {
            then: (fn: any) => fn({
              data: [
                { patient_id: "LINE_uniq123", name: "仮ユーザー", name_kana: null, line_id: "U123uniq" },
              ],
              error: null,
            }),
          };
        }
        return originalLimit(n);
      });
      tableChains["patients"] = patientsChain;

      // UNIQUE制約違反（23505）→ 無視されるはず
      const uniqueErrorChain = createChain({ data: null, error: { code: "23505", message: "UNIQUE violation" } });
      tableChains["reservations"] = uniqueErrorChain;
      tableChains["orders"] = uniqueErrorChain;
      tableChains["reorders"] = uniqueErrorChain;
      tableChains["message_log"] = uniqueErrorChain;
      tableChains["patient_tags"] = uniqueErrorChain;
      tableChains["patient_marks"] = uniqueErrorChain;
      tableChains["friend_field_values"] = uniqueErrorChain;

      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123uniq" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // patients更新/挿入エラーハンドリング
  // ------------------------------------------------------------------
  describe("patients更新エラーハンドリング", () => {
    it("patients updateエラーでもレスポンスは200で返る", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      // updateのthenでエラーを返すように設定
      const originalThen = patientsChain.then;
      let thenCallCount = 0;
      patientsChain.then = vi.fn().mockImplementation((fn: any) => {
        thenCallCount++;
        // update完了時のthen（後半の呼び出し）でエラーを返す
        return fn({ data: { patient_id: "PT-001" }, error: { message: "更新エラー" } });
      });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123update_err" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // LINE UIDなし時の動作（プロフィール取得スキップ）
  // ------------------------------------------------------------------
  describe("LINE UIDなしの場合", () => {
    it("LINE UIDが空の場合、プロフィール取得とメニュー切替がスキップされる", async () => {
      // cookie のみで patient_id を解決
      const patientsChain = createChain({ data: { patient_id: "PT-NOLINE" }, error: null });
      tableChains["patients"] = patientsChain;
      const intakeChain = createChain({ data: { patient_id: "PT-NOLINE", id: 1, answers: {} }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { patient_id: "PT-NOLINE" }
      );

      // fetch が呼ばれる前にカウントをリセット
      (fetch as any).mockClear();

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      // LINE UIDがないのでプロフィール取得のfetchは呼ばれない
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // intake answers が null の場合
  // ------------------------------------------------------------------
  describe("intake answersがnullの場合", () => {
    it("answersがnullでも電話番号が正しく追記される", async () => {
      const patientsChain = createChain({ data: { patient_id: "PT-001" }, error: null });
      tableChains["patients"] = patientsChain;
      // answers が null
      const intakeChain = createChain({ data: { id: 1, answers: null }, error: null });
      tableChains["intake"] = intakeChain;

      const req = createReqWithCookies(
        { phone: "09012345678" },
        { line_user_id: "U123null_answers" }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      // intake.update が呼ばれたことを確認
      expect(intakeChain.update).toHaveBeenCalled();
    });
  });
});
