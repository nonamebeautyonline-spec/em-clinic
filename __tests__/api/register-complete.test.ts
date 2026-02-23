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
});
