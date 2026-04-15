// __tests__/api/gmo-webhook-routes.test.ts
// GMO PG Webhook APIルートの統合テスト
// 対象: app/api/gmo/webhook/route.ts
//
// 注: route.ts は業務ロジックを processGmoEvent（lib/webhook-handlers/gmo）に委譲している。
// このテストでは route.ts のルーティング・署名検証・冪等チェック・processGmoEvent呼び出しを検証する。
// processGmoEvent の内部ロジック（DB操作等）は別途テストする。

import { describe, it, expect, vi, beforeEach } from "vitest";

// === モックヘルパー ===
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, ReturnType<typeof createChain>> = {};
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
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
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
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/lib/webhook-tenant-resolver", () => ({
  resolveWebhookTenant: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/webhook-handlers/gmo", () => ({
  processGmoEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/webhook-failure", () => ({
  notifyWebhookFailure: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "@/app/api/gmo/webhook/route";
import { processGmoEvent } from "@/lib/webhook-handlers/gmo";
import { checkIdempotency } from "@/lib/idempotency";

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
  it("常に200 '0' を返す", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("0");
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
  // processGmoEvent 呼び出し検証
  // ------------------------------------------------------------------
  describe("processGmoEvent呼び出し", () => {
    it("CAPTURE: processGmoEventに正しいパラメータが渡される", async () => {
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

      expect(processGmoEvent).toHaveBeenCalledWith({
        status: "CAPTURE",
        orderId: "ord_new",
        amount: "10000",
        accessId: "acc_new",
        patientId: "patient_001",
        productCode: "MJL_5mg_1m",
        productName: "マンジャロ 5mg 1ヶ月",
        reorderId: "",
        couponId: "",
        campaignId: "",
        tenantId: "test-tenant",
      });
    });

    it("SALES: processGmoEventに正しいステータスが渡される", async () => {
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

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "SALES",
          orderId: "ord_existing",
          patientId: "patient_002",
        }),
      );
    });

    it("再処方パラメータがprocessGmoEventに渡される", async () => {
      const req = createGMORequest({
        OrderID: "ord_reorder",
        Status: "CAPTURE",
        Amount: "8000",
        AccessID: "acc_reorder",
        ClientField1: "PID:patient_003;Product:MJL_5mg_2m;Mode:reorder;Reorder:42",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "patient_003",
          reorderId: "42",
        }),
      );
    });

    it("全フィールドが正しくパースされてprocessGmoEventに渡される", async () => {
      const req = createGMORequest({
        OrderID: "ord_full",
        Status: "CAPTURE",
        Amount: "12000",
        AccessID: "acc_full",
        ClientField1: "PID:patient_full;Product:MJL_10mg_1m;Mode:reorder;Reorder:42;Coupon:cpn_1;Campaign:camp_1",
        ClientField2: "マンジャロ 10mg 1ヶ月",
        ClientField3: "注文ID_001",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(processGmoEvent).toHaveBeenCalledWith({
        status: "CAPTURE",
        orderId: "ord_full",
        amount: "12000",
        accessId: "acc_full",
        patientId: "patient_full",
        productCode: "MJL_10mg_1m",
        productName: "マンジャロ 10mg 1ヶ月",
        reorderId: "42",
        couponId: "cpn_1",
        campaignId: "camp_1",
        tenantId: "test-tenant",
      });
    });

    it("ClientField1が空でもprocessGmoEventに空文字で渡される", async () => {
      // ordersテーブルからの補完もヒットしない場合
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

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "",
          productCode: "",
          reorderId: "",
        }),
      );
    });

    it("RETURN: 返金ステータスがprocessGmoEventに渡される", async () => {
      const req = createGMORequest({
        OrderID: "ord_refund",
        Status: "RETURN",
        Amount: "5000",
        AccessID: "acc_refund",
        ClientField1: "PID:patient_008",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "RETURN",
          patientId: "patient_008",
        }),
      );
    });

    it("CANCEL: キャンセルステータスがprocessGmoEventに渡される", async () => {
      const req = createGMORequest({
        OrderID: "ord_cancel",
        Status: "CANCEL",
        Amount: "5000",
        AccessID: "acc_cancel",
        ClientField1: "PID:patient_011",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "CANCEL",
          patientId: "patient_011",
        }),
      );
    });

    it("未対応ステータスでもprocessGmoEventに渡される", async () => {
      const req = createGMORequest({
        OrderID: "ord_auth",
        Status: "AUTH",
        Amount: "5000",
        AccessID: "acc_auth",
        ClientField1: "PID:patient_auth",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({ status: "AUTH" }),
      );
    });
  });

  // ------------------------------------------------------------------
  // ClientField1が空でOrderIDからorders補完
  // ------------------------------------------------------------------
  describe("ClientField空時のorders補完", () => {
    it("patientIdが空の場合はordersテーブルから補完する", async () => {
      const ordersChain = createChain({
        data: { patient_id: "patient_from_orders", product_code: "PROD_FROM_DB" },
        error: null,
      });
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

      // ordersから補完されたpatientIdがprocessGmoEventに渡される
      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "patient_from_orders",
          productCode: "PROD_FROM_DB",
        }),
      );
    });
  });

  // ------------------------------------------------------------------
  // 冪等チェックテスト
  // ------------------------------------------------------------------
  describe("冪等チェック", () => {
    it("重複イベントはスキップされprocessGmoEventは呼ばれない", async () => {
      vi.mocked(checkIdempotency).mockResolvedValueOnce({
        duplicate: true,
        markCompleted: vi.fn().mockResolvedValue(undefined),
        markFailed: vi.fn().mockResolvedValue(undefined),
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
      expect(processGmoEvent).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // エラーハンドリング
  // ------------------------------------------------------------------
  describe("エラーハンドリング", () => {
    it("processGmoEventがエラーでも200を返す（fire-and-forget）", async () => {
      vi.mocked(processGmoEvent).mockRejectedValueOnce(new Error("DB explosion"));

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
  });
});
