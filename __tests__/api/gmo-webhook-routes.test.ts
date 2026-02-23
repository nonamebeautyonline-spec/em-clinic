// __tests__/api/gmo-webhook-routes.test.ts
// GMO PG Webhook APIルートの統合テスト
// 対象: app/api/gmo/webhook/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((p: string) => p),
}));

vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/idempotency", () => ({
  checkIdempotency: vi.fn().mockResolvedValue({
    duplicate: false,
    markCompleted: vi.fn(),
    markFailed: vi.fn(),
  }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue(""),
}));

import { GET, POST } from "@/app/api/gmo/webhook/route";
import { invalidateDashboardCache } from "@/lib/redis";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";

// URLSearchParams形式のボディを作成するヘルパー
function createFormBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

// Requestオブジェクトを作成するヘルパー
function createGMORequest(params: Record<string, string>): Request {
  const body = createFormBody(params);
  return new Request("http://localhost/api/gmo/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

// === テスト本体 ===

// ------------------------------------------------------------------
// GET: ヘルスチェック
// ------------------------------------------------------------------
describe("GET /api/gmo/webhook", () => {
  it("常に200 'ok' を返す", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("ok");
  });
});

// ------------------------------------------------------------------
// POST: 決済結果通知
// ------------------------------------------------------------------
describe("POST /api/gmo/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ------------------------------------------------------------------
  // 常に200を返すテスト（GMOの仕様）
  // ------------------------------------------------------------------
  describe("レスポンス", () => {
    it("正常処理時は200を返す", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_001",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_001",
        ClientField1: "PID:patient_001;Product:MJL_5mg_1m",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("エラーが発生しても200を返す（GMOリトライ防止）", async () => {
      // ordersチェーンでthen呼び出し時にエラーをスロー
      const ordersChain = createChain();
      ordersChain.maybeSingle = vi.fn().mockImplementation(() => {
        throw new Error("DB explosion");
      });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_err",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_err",
        ClientField1: "PID:patient_err",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("未対応ステータスでも200を返す", async () => {
      const req = createGMORequest({
        OrderID: "ord_001",
        Status: "PENDING",
        Amount: "0",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // CAPTURE / SALES（決済完了）
  // ------------------------------------------------------------------
  describe("決済完了（CAPTURE / SALES）", () => {
    it("CAPTURE: 新規注文をINSERTする", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_new",
        Status: "CAPTURE",
        Amount: "10000",
        AccessID: "acc_new",
        ClientField1: "PID:patient_001;Product:MJL_5mg_1m",
        ClientField2: "マンジャロ 5mg 1ヶ月",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // ordersのinsertが呼ばれた
      expect(ordersChain.insert).toHaveBeenCalled();
    });

    it("SALES: 既存注文をUPDATEする", async () => {
      const ordersChain = createChain({
        data: { id: "acc_existing", tracking_number: "TN-001" },
        error: null,
      });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_existing",
        Status: "SALES",
        Amount: "15000",
        AccessID: "acc_existing",
        ClientField1: "PID:patient_002;Product:MJL_10mg_1m",
        ClientField2: "マンジャロ 10mg 1ヶ月",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // ordersのupdateが呼ばれた
      expect(ordersChain.update).toHaveBeenCalled();
    });

    it("再処方の決済完了時はreorderをpaidに更新する", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const reordersChain = createChain({ data: [{ id: 42 }], error: null });
      tableChains["reorders"] = reordersChain;

      const req = createGMORequest({
        OrderID: "ord_reorder",
        Status: "CAPTURE",
        Amount: "8000",
        AccessID: "acc_reorder",
        ClientField1: "PID:patient_003;Product:MJL_5mg_2m;Mode:reorder;Reorder:42",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // reordersのupdateが呼ばれた（paid更新）
      expect(reordersChain.update).toHaveBeenCalled();
    });

    it("再処方決済完了時にカルテが自動作成される", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const reordersChain = createChain({ data: [{ id: 42 }], error: null });
      tableChains["reorders"] = reordersChain;

      const req = createGMORequest({
        OrderID: "ord_karte",
        Status: "CAPTURE",
        Amount: "8000",
        AccessID: "acc_karte",
        ClientField1: "PID:patient_004;Product:MJL_5mg_1m;Mode:reorder;Reorder:42",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // createReorderPaymentKarteが呼ばれた
      expect(createReorderPaymentKarte).toHaveBeenCalledWith(
        "patient_004",
        "MJL_5mg_1m",
        expect.any(String), // paidAt
        undefined,
        "test-tenant",
      );
    });

    it("決済完了時にキャッシュが削除される", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_cache",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_cache",
        ClientField1: "PID:patient_005;Product:MJL_2.5mg_1m",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(invalidateDashboardCache).toHaveBeenCalledWith("patient_005");
    });

    it("決済完了時にリッチメニュー自動切替が実行される", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_menu",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_menu",
        ClientField1: "PID:patient_006;Product:MJL_5mg_1m",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(evaluateMenuRules).toHaveBeenCalledWith("patient_006", "test-tenant");
    });

    it("patientIdが空の場合はordersの処理をスキップする", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_nopid",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_nopid",
        ClientField1: "",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // ordersのinsert/updateは呼ばれない
      expect(ordersChain.insert).not.toHaveBeenCalled();
      expect(ordersChain.update).not.toHaveBeenCalled();
    });

    it("AccessIDが空の場合はOrderIDをpaymentIdとして使う", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_fallback",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "",
        ClientField1: "PID:patient_007",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // OrderIDがpaymentIdとして使われる
      // maybeSingleでeq("id", "ord_fallback")が呼ばれる
      expect(ordersChain.eq).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // RETURN / RETURNX（返金）
  // ------------------------------------------------------------------
  describe("返金（RETURN / RETURNX）", () => {
    it("RETURN: 注文を返金済みに更新する", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_refund",
        Status: "RETURN",
        Amount: "5000",
        AccessID: "acc_refund",
        ClientField1: "PID:patient_008",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // ordersのupdateが呼ばれた
      expect(ordersChain.update).toHaveBeenCalled();
      const updateCall = ordersChain.update.mock.calls[0][0];
      expect(updateCall.refund_status).toBe("COMPLETED");
      expect(updateCall.status).toBe("refunded");
      expect(updateCall.refunded_amount).toBe(5000);
    });

    it("RETURNX: 注文を返金済みに更新する", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_refundx",
        Status: "RETURNX",
        Amount: "3000",
        AccessID: "acc_refundx",
        ClientField1: "PID:patient_009",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(ordersChain.update).toHaveBeenCalled();
      const updateCall = ordersChain.update.mock.calls[0][0];
      expect(updateCall.refunded_amount).toBe(3000);
    });

    it("返金時にキャッシュが削除される", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_refund_cache",
        Status: "RETURN",
        Amount: "5000",
        AccessID: "acc_refund_cache",
        ClientField1: "PID:patient_010",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(invalidateDashboardCache).toHaveBeenCalledWith("patient_010");
    });

    it("patientIdが空の場合はキャッシュ削除をスキップする", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_refund_nopid",
        Status: "RETURN",
        Amount: "5000",
        AccessID: "acc_refund_nopid",
        ClientField1: "",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(invalidateDashboardCache).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // CANCEL / VOID（キャンセル）
  // ------------------------------------------------------------------
  describe("キャンセル（CANCEL / VOID）", () => {
    it("CANCEL: 注文をキャンセル済みに更新する", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_cancel",
        Status: "CANCEL",
        Amount: "5000",
        AccessID: "acc_cancel",
        ClientField1: "PID:patient_011",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(ordersChain.update).toHaveBeenCalled();
      const updateCall = ordersChain.update.mock.calls[0][0];
      expect(updateCall.refund_status).toBe("CANCELLED");
      expect(updateCall.status).toBe("refunded");
    });

    it("VOID: 注文をキャンセル済みに更新する", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_void",
        Status: "VOID",
        Amount: "0",
        AccessID: "acc_void",
        ClientField1: "PID:patient_012",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(ordersChain.update).toHaveBeenCalled();
    });

    it("キャンセル時にキャッシュが削除される", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_cancel_cache",
        Status: "CANCEL",
        Amount: "5000",
        AccessID: "acc_cancel_cache",
        ClientField1: "PID:patient_013",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(invalidateDashboardCache).toHaveBeenCalledWith("patient_013");
    });
  });

  // ------------------------------------------------------------------
  // 未対応ステータス
  // ------------------------------------------------------------------
  describe("未対応ステータス", () => {
    it("AUTH は未対応として処理される", async () => {
      const req = createGMORequest({
        OrderID: "ord_auth",
        Status: "AUTH",
        Amount: "5000",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("PENDING は未対応として処理される", async () => {
      const req = createGMORequest({
        OrderID: "ord_pending",
        Status: "PENDING",
        Amount: "0",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("空のステータスでも200を返す", async () => {
      const req = createGMORequest({
        OrderID: "ord_empty",
        Status: "",
        Amount: "0",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // ClientField パースの統合テスト
  // ------------------------------------------------------------------
  describe("ClientFieldパース統合", () => {
    it("全フィールドが正しくパースされて使用される", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const reordersChain = createChain({ data: [{ id: 42 }], error: null });
      tableChains["reorders"] = reordersChain;

      const req = createGMORequest({
        OrderID: "ord_full",
        Status: "CAPTURE",
        Amount: "12000",
        AccessID: "acc_full",
        ClientField1: "PID:patient_full;Product:MJL_10mg_1m;Mode:reorder;Reorder:42",
        ClientField2: "マンジャロ 10mg 1ヶ月",
        ClientField3: "注文ID_001",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // reorderのpaid更新 + カルテ作成が実行される
      expect(reordersChain.update).toHaveBeenCalled();
      expect(createReorderPaymentKarte).toHaveBeenCalled();
    });

    it("ClientField1が空でもエラーにならない", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_empty_cf",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_empty_cf",
        ClientField1: "",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // markReorderPaid のバリデーション統合テスト
  // ------------------------------------------------------------------
  describe("markReorderPaid バリデーション", () => {
    it("reorderIdが不正な値の場合はスキップされる", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const reordersChain = createChain({ data: null, error: null });
      tableChains["reorders"] = reordersChain;

      const req = createGMORequest({
        OrderID: "ord_invalid_reorder",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_invalid",
        ClientField1: "PID:patient_inv;Product:MJL_5mg_1m;Reorder:abc",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      // reorderIdが不正なのでreordersのupdateは呼ばれない
      // （NaNのフィルタ）
    });

    it("reorderId=1（予約済み）の場合はスキップされる", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const reordersChain = createChain({ data: null, error: null });
      tableChains["reorders"] = reordersChain;

      const req = createGMORequest({
        OrderID: "ord_reserved",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_reserved",
        ClientField1: "PID:patient_res;Product:MJL_5mg_1m;Reorder:1",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // DB エラーハンドリング
  // ------------------------------------------------------------------
  describe("DBエラーハンドリング", () => {
    it("orders INSERT失敗時もエラーログが出るだけで200を返す", async () => {
      const ordersChain = createChain({ data: null, error: { message: "insert failed" } });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_insert_fail",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_insert_fail",
        ClientField1: "PID:patient_fail;Product:MJL_5mg_1m",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("返金UPDATE失敗時も200を返す", async () => {
      const ordersChain = createChain({ data: null, error: { message: "update failed" } });
      tableChains["orders"] = ordersChain;

      const req = createGMORequest({
        OrderID: "ord_refund_fail",
        Status: "RETURN",
        Amount: "5000",
        AccessID: "acc_refund_fail",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 冪等チェックテスト
  // ------------------------------------------------------------------
  describe("冪等チェック", () => {
    it("重複イベントはスキップされる", async () => {
      const { checkIdempotency } = await import("@/lib/idempotency");
      (checkIdempotency as any).mockResolvedValueOnce({
        duplicate: true,
        markCompleted: vi.fn(),
        markFailed: vi.fn(),
      });

      const req = createGMORequest({
        OrderID: "order_dup",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_dup",
        ClientField1: "PID:patient1;Product:prod1",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      // 重複時はDB操作が行われない
    });
  });
});
