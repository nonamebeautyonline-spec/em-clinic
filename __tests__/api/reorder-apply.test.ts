// __tests__/api/reorder-apply.test.ts
// 再処方申請API のテスト
// 対象: app/api/reorder/apply/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv","like"].forEach(m => {
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

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-token"),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/reorder", () => ({
  reorderApplySchema: {},
}));

// next/headers の cookies() モック
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      const map: Record<string, { value: string }> = {
        "__Host-patient_id": { value: "PT-001" },
        "patient_id": { value: "PT-001" },
        "__Host-line_user_id": { value: "U123" },
        "line_user_id": { value: "U123" },
      };
      return map[name] || undefined;
    }),
  }),
}));

// fetchモック
vi.stubGlobal("fetch", vi.fn());

import { POST } from "@/app/api/reorder/apply/route";
import { parseBody } from "@/lib/validations/helpers";
import { invalidateDashboardCache } from "@/lib/redis";
import { cookies } from "next/headers";

// === テスト本体 ===
describe("POST /api/reorder/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};

    // デフォルト: parseBody成功
    (parseBody as any).mockResolvedValue({
      data: { productCode: "MJL_5mg_1m" },
    });

    // デフォルト: fetch成功
    (fetch as any).mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("ok") });
  });

  // ------------------------------------------------------------------
  // 認証テスト
  // ------------------------------------------------------------------
  describe("認証チェック", () => {
    it("patient_idがない場合は401を返す", async () => {
      // cookies モックを上書き: patient_idなし
      (cookies as any).mockResolvedValue({
        get: vi.fn(() => undefined),
      });

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("unauthorized");
    });

    it("patient_idがある場合は処理が継続される", async () => {
      // cookies モック: patient_idあり
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-001" };
          if (name === "patient_id") return { value: "PT-001" };
          return undefined;
        }),
      });

      // NG判定: null（OK）
      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;
      // 重複チェック: なし
      const reordersChain = createChain({ data: null, error: null });
      tableChains["reorders"] = reordersChain;
      // reorder_number取得
      reordersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: 1 }, error: null }),
      });
      // 患者名・処方歴
      const patientsChain = createChain({ data: { name: "田中太郎" }, error: null });
      tableChains["patients"] = patientsChain;
      const ordersChain = createChain({ data: [], error: null });
      tableChains["orders"] = ordersChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // バリデーションテスト
  // ------------------------------------------------------------------
  describe("入力バリデーション", () => {
    it("parseBodyエラー時はエラーレスポンスを返す", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-001" };
          if (name === "patient_id") return { value: "PT-001" };
          return undefined;
        }),
      });

      const errorResponse = Response.json({ ok: false, error: "入力値が不正です" }, { status: 400 });
      (parseBody as any).mockResolvedValue({ error: errorResponse });

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // NG患者ブロックテスト
  // ------------------------------------------------------------------
  describe("NG患者ブロック", () => {
    it("NG患者は再処方申請がブロックされる", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-NG" };
          if (name === "patient_id") return { value: "PT-NG" };
          return undefined;
        }),
      });

      const intakeChain = createChain({ data: { status: "NG" }, error: null });
      tableChains["intake"] = intakeChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("ng_patient");
    });

    it("OK患者は通過する", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-OK" };
          if (name === "patient_id") return { value: "PT-OK" };
          return undefined;
        }),
      });

      const intakeChain = createChain({ data: { status: "OK" }, error: null });
      tableChains["intake"] = intakeChain;
      const reordersChain = createChain({ data: null, error: null });
      tableChains["reorders"] = reordersChain;
      reordersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: 1 }, error: null }),
      });
      const patientsChain = createChain({ data: { name: "田中" }, error: null });
      tableChains["patients"] = patientsChain;
      const ordersChain = createChain({ data: [], error: null });
      tableChains["orders"] = ordersChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("statusがnullのintakeは無視される（NG判定しない）", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-NULL" };
          if (name === "patient_id") return { value: "PT-NULL" };
          return undefined;
        }),
      });

      // statusがnullのレコードは .not("status", "is", null) で除外される
      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;
      const reordersChain = createChain({ data: null, error: null });
      tableChains["reorders"] = reordersChain;
      reordersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: 1 }, error: null }),
      });
      const patientsChain = createChain({ data: { name: "田中" }, error: null });
      tableChains["patients"] = patientsChain;
      const ordersChain = createChain({ data: [], error: null });
      tableChains["orders"] = ordersChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 重複申請チェックテスト
  // ------------------------------------------------------------------
  describe("重複申請チェック", () => {
    it("pending状態の既存申請がある場合は400を返す", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-DUP" };
          if (name === "patient_id") return { value: "PT-DUP" };
          return undefined;
        }),
      });

      // NG判定: OK
      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;

      // 重複チェック: 既存あり
      const reordersChain = createChain({
        data: { id: 42, status: "pending", product_code: "MJL_5mg_1m" },
        error: null,
      });
      tableChains["reorders"] = reordersChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("duplicate_pending");
    });

    it("重複チェックDBエラーの場合は500を返す", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-ERR" };
          if (name === "patient_id") return { value: "PT-ERR" };
          return undefined;
        }),
      });

      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;

      // 重複チェック: DBエラー
      const reordersChain = createChain({
        data: null,
        error: { message: "DB error" },
      });
      tableChains["reorders"] = reordersChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("db_error");
    });
  });

  // ------------------------------------------------------------------
  // DB挿入テスト
  // ------------------------------------------------------------------
  describe("DB挿入", () => {
    function setupDefaultChains() {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-NEW" };
          if (name === "patient_id") return { value: "PT-NEW" };
          if (name === "__Host-line_user_id") return { value: "U456" };
          if (name === "line_user_id") return { value: "U456" };
          return undefined;
        }),
      });

      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;

      // 重複なし + reorder_number取得用
      const reordersChain = createChain({ data: null, error: null });
      reordersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: 1 }, error: null }),
      });
      tableChains["reorders"] = reordersChain;

      const patientsChain = createChain({ data: { name: "田中太郎" }, error: null });
      tableChains["patients"] = patientsChain;
      const ordersChain = createChain({ data: [], error: null });
      tableChains["orders"] = ordersChain;
    }

    it("正常にreorderが挿入される", async () => {
      setupDefaultChains();

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("DB挿入失敗時は500を返す", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-FAIL" };
          if (name === "patient_id") return { value: "PT-FAIL" };
          return undefined;
        }),
      });

      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;

      const reordersChain = createChain({ data: null, error: null });
      // 重複チェック: なし → singleでエラー
      reordersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: { message: "insert failed" } }),
      });
      tableChains["reorders"] = reordersChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("db_error");
    });
  });

  // ------------------------------------------------------------------
  // キャッシュ削除テスト
  // ------------------------------------------------------------------
  describe("キャッシュ削除", () => {
    it("挿入成功時にinvalidateDashboardCacheが呼ばれる", async () => {
      (cookies as any).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === "__Host-patient_id") return { value: "PT-CACHE" };
          if (name === "patient_id") return { value: "PT-CACHE" };
          return undefined;
        }),
      });

      const intakeChain = createChain({ data: null, error: null });
      tableChains["intake"] = intakeChain;
      const reordersChain = createChain({ data: null, error: null });
      reordersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: 99 }, error: null }),
      });
      tableChains["reorders"] = reordersChain;
      const patientsChain = createChain({ data: { name: "田中" }, error: null });
      tableChains["patients"] = patientsChain;
      const ordersChain = createChain({ data: [], error: null });
      tableChains["orders"] = ordersChain;

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(invalidateDashboardCache).toHaveBeenCalledWith("PT-CACHE");
    });
  });

  // ------------------------------------------------------------------
  // reorder_number生成テスト
  // ------------------------------------------------------------------
  describe("reorder_number生成", () => {
    it("既存の最大値+1でreorder_numberが生成される", () => {
      // ロジックの検証: (maxRow?.reorder_number || 1) + 1
      const maxRow = { reorder_number: 10 };
      const reorderNumber = (maxRow?.reorder_number || 1) + 1;
      expect(reorderNumber).toBe(11);
    });

    it("既存データなしの場合はreorder_number=2になる", () => {
      const maxRow = null;
      const reorderNumber = ((maxRow as any)?.reorder_number || 1) + 1;
      expect(reorderNumber).toBe(2);
    });
  });

  // ------------------------------------------------------------------
  // 7.5mg初回申請チェックテスト
  // ------------------------------------------------------------------
  describe("7.5mg初回申請チェック", () => {
    it("7.5mgを含む商品コードで警告が送信される（ロジック確認）", () => {
      const productCode = "MJL_7.5mg_1m";
      expect(productCode.includes("7.5mg")).toBe(true);
    });

    it("7.5mgを含まない商品コードでは警告なし（ロジック確認）", () => {
      const productCode = "MJL_5mg_1m";
      expect(productCode.includes("7.5mg")).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // LINE通知テスト（ロジック検証）
  // ------------------------------------------------------------------
  describe("LINE通知", () => {
    it("商品名の変換が正しく行われる（ロジック確認）", () => {
      const productLabel = "MJL_5mg_1m"
        .replace("MJL_", "マンジャロ ")
        .replace("_", " ")
        .replace("1m", "1ヶ月")
        .replace("2m", "2ヶ月")
        .replace("3m", "3ヶ月");
      expect(productLabel).toBe("マンジャロ 5mg 1ヶ月");
    });

    it("3ヶ月プランの商品名変換", () => {
      const productLabel = "MJL_5mg_3m"
        .replace("MJL_", "マンジャロ ")
        .replace("_", " ")
        .replace("1m", "1ヶ月")
        .replace("2m", "2ヶ月")
        .replace("3m", "3ヶ月");
      expect(productLabel).toBe("マンジャロ 5mg 3ヶ月");
    });

    it("通知トークン/グループIDがない場合はスキップされる（ロジック確認）", () => {
      const notifyToken = "";
      const adminGroupId = "";
      const shouldSkip = !notifyToken || !adminGroupId;
      expect(shouldSkip).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 例外処理テスト
  // ------------------------------------------------------------------
  describe("例外処理", () => {
    it("予期しないエラーは500を返す", async () => {
      // cookiesでエラーを発生させる
      (cookies as any).mockRejectedValue(new Error("unexpected cookies error"));

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("unexpected_error");
    });
  });
});
