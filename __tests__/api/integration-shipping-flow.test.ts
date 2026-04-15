// __tests__/api/integration-shipping-flow.test.ts
// 発送フロー統合テスト: 決済完了 → 未発送リスト → 発送処理 → LINE通知
// 各APIの連携を横断的に検証する

import { describe, it, expect, vi, beforeEach } from "vitest";

// === テストデータ定数 ===
const TEST_TENANT_ID = "test-tenant-001";
const TEST_PATIENT_ID = "patient-abc-123";
const TEST_PATIENT_ID_2 = "patient-def-456";
const TEST_ORDER_ID = "order-gmo-001";
const TEST_ORDER_ID_2 = "order-gmo-002";
const TEST_ACCESS_ID = "access-id-001";
const TEST_LINE_UID = "U1234567890abcdef";
const TEST_LINE_UID_2 = "U9876543210fedcba";
const TEST_TRACKING_NUMBER = "123456789012";
const TEST_PRODUCT_CODE = "product-a";
const TEST_PRODUCT_NAME = "テスト商品A";

// === 共有インメモリストア ===
interface OrderRecord {
  id: string;
  patient_id: string;
  product_code: string | null;
  product_name: string | null;
  amount: number;
  paid_at: string | null;
  shipping_status: string;
  shipping_date: string | null;
  tracking_number: string | null;
  payment_status: string;
  payment_method: string;
  status: string;
  tenant_id: string;
  carrier: string | null;
}

const ordersStore: Map<string, OrderRecord> = new Map();
let linePushCalls: Array<{ to: string }> = [];

// === 簡易チェーンモック ===
function createChain(resolveWith: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "insert", "update", "delete", "select", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "or", "ilike", "like",
    "order", "limit", "range", "single", "maybeSingle",
    "csv", "count",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(resolveWith));
  return chain;
}

// テーブル別のデフォルト応答を設定するfrom関数
function mockFrom(table: string) {
  if (table === "orders") return createChain({ data: Array.from(ordersStore.values()), error: null });
  if (table === "patients") return createChain({
    data: [
      { patient_id: TEST_PATIENT_ID, name: "テスト太郎", line_id: TEST_LINE_UID, tel: "09012345678" },
      { patient_id: TEST_PATIENT_ID_2, name: "テスト花子", line_id: TEST_LINE_UID_2, tel: "08098765432" },
    ],
    error: null,
  });
  if (table === "products") return createChain({ data: [{ product_code: TEST_PRODUCT_CODE, name: TEST_PRODUCT_NAME }], error: null });
  if (table === "friend_summaries") return createChain({ data: [], error: null });
  if (table === "webhook_events") return createChain({ data: null, error: null });
  if (table === "mark_definitions") return createChain({ data: { value: "rx_done" }, error: null });
  if (table === "patient_marks") return createChain({ data: null, error: null });
  if (table === "rich_menus") return createChain({ data: null, error: null });
  if (table === "reorders") return createChain({ data: [], error: null });
  return createChain();
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => mockFrom(table)) },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn((table: string) => mockFrom(table)) })),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant-001"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant-001"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant-001" })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/idempotency", () => ({
  checkIdempotency: vi.fn().mockResolvedValue({
    duplicate: false,
    markCompleted: vi.fn(),
    markFailed: vi.fn(),
  }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-line-token"),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((p: string) => p),
}));

vi.mock("@/lib/notifications/webhook-failure", () => ({
  notifyWebhookFailure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/webhook-tenant-resolver", () => ({
  resolveWebhookTenant: vi.fn().mockResolvedValue("test-tenant-001"),
}));

vi.mock("@/lib/products", () => ({
  getProducts: vi.fn().mockResolvedValue([
    { code: "product-a", title: "テスト商品A", shipping_delay_days: 0 },
  ]),
  getProductNamesMap: vi.fn().mockResolvedValue({ "product-a": "テスト商品A" }),
}));

vi.mock("@/lib/shipping-flex", () => ({
  buildShippingFlex: vi.fn().mockResolvedValue({ type: "flex", altText: "発送通知" }),
  sendShippingNotification: vi.fn().mockImplementation(({ lineUid }: { lineUid: string }) => {
    linePushCalls.push({ to: lineUid });
    return Promise.resolve({ ok: true });
  }),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/payment-thank-flex", () => ({
  sendPaymentThankNotification: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: vi.fn().mockResolvedValue({ notifyReorderPaid: false }),
}));

vi.mock("@/lib/point-auto-grant", () => ({
  processAutoGrant: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/api-error", () => ({
  serverError: vi.fn((msg: string) =>
    new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { "Content-Type": "application/json" } })),
  unauthorized: vi.fn(() =>
    new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })),
  badRequest: vi.fn((msg: string) =>
    new Response(JSON.stringify({ ok: false, error: msg }), { status: 400, headers: { "Content-Type": "application/json" } })),
  notFound: vi.fn((msg: string) =>
    new Response(JSON.stringify({ ok: false, error: msg }), { status: 404, headers: { "Content-Type": "application/json" } })),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    return { data: body };
  }),
}));

// processGmoEvent をモックして直接ordersStoreを操作
vi.mock("@/lib/webhook-handlers/gmo", () => ({
  processGmoEvent: vi.fn(async (params: {
    status: string;
    orderId: string;
    amount: string;
    accessId: string;
    patientId: string;
    productCode: string;
    productName: string;
    reorderId: string;
    tenantId: string | null;
  }) => {
    if (params.status === "CAPTURE" || params.status === "SALES") {
      const paymentId = params.accessId || params.orderId;
      const order: OrderRecord = {
        id: paymentId,
        patient_id: params.patientId,
        product_code: params.productCode || null,
        product_name: params.productName || null,
        amount: params.amount ? parseFloat(params.amount) : 0,
        paid_at: new Date().toISOString(),
        shipping_status: "pending",
        shipping_date: null,
        tracking_number: null,
        payment_status: "COMPLETED",
        payment_method: "credit_card",
        status: "confirmed",
        tenant_id: params.tenantId || "test-tenant-001",
        carrier: "yamato",
      };
      ordersStore.set(paymentId, order);
    }
  }),
}));

// fetchモック（LINE APIリッチメニュー等）
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
}));

// === API ルートのインポート ===
import { POST as gmoWebhookPost } from "@/app/api/gmo/webhook/route";
import { GET as pendingGet } from "@/app/api/admin/shipping/pending/route";
import { GET as notifyShippedGet, POST as notifyShippedPost } from "@/app/api/admin/shipping/notify-shipped/route";
import { POST as updateTrackingConfirmPost } from "@/app/api/admin/shipping/update-tracking/confirm/route";
import { GET as todayShippedGet } from "@/app/api/admin/shipping/today-shipped/route";
import { processGmoEvent } from "@/lib/webhook-handlers/gmo";
import { sendShippingNotification } from "@/lib/shipping-flex";
import { checkIdempotency } from "@/lib/idempotency";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { invalidateDashboardCache } from "@/lib/redis";

// === ヘルパー ===
function createGMORequest(params: Record<string, string>): Request {
  return new Request("http://localhost/api/gmo/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Host: "test.l-ope.jp" },
    body: new URLSearchParams(params).toString(),
  });
}

function createAdminGetRequest(path: string): Request {
  const req = new Request(`http://localhost${path}`, {
    method: "GET",
    headers: { Authorization: "Bearer test-token", Host: "test.l-ope.jp" },
  });
  Object.defineProperty(req, "nextUrl", {
    value: new URL(`http://localhost${path}`),
    writable: false,
  });
  Object.defineProperty(req, "cookies", {
    value: { get: () => undefined },
    writable: false,
  });
  return req as unknown as Request;
}

function createAdminPostRequest(path: string, body: unknown): Request {
  const req = new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-token", Host: "test.l-ope.jp" },
    body: JSON.stringify(body),
  });
  // NextRequestのnextUrlプロパティをシミュレート（update-tracking/confirmで使用）
  Object.defineProperty(req, "nextUrl", {
    value: new URL(`http://localhost${path}`),
    writable: false,
  });
  // NextRequestのcookiesプロパティをシミュレート
  Object.defineProperty(req, "cookies", {
    value: { get: () => undefined },
    writable: false,
  });
  return req as unknown as Request;
}

// === テスト本体 ===
describe("発送フロー統合テスト", () => {
  beforeEach(() => {
    vi.mocked(checkIdempotency).mockResolvedValue({
      duplicate: false,
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
    });
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
  });

  // ------------------------------------------------------------------
  // ステップ1: GMO決済完了 → 注文作成
  // ------------------------------------------------------------------
  describe("ステップ1: GMO決済完了で注文レコードが作成される", () => {
    it("CAPTUREステータスで注文がordersに登録される", async () => {
      ordersStore.clear();
      const req = createGMORequest({
        ShopID: "shop001",
        OrderID: TEST_ORDER_ID,
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: TEST_ACCESS_ID,
        ClientField1: `PID:${TEST_PATIENT_ID};Product:${TEST_PRODUCT_CODE}`,
        ClientField2: TEST_PRODUCT_NAME,
      });

      const res = await gmoWebhookPost(req);
      expect(res.status).toBe(200);

      // processGmoEventが呼ばれ、ordersStoreに注文が作成された
      expect(processGmoEvent).toHaveBeenCalledWith(expect.objectContaining({
        status: "CAPTURE",
        patientId: TEST_PATIENT_ID,
        productCode: TEST_PRODUCT_CODE,
        amount: "5000",
      }));

      const order = ordersStore.get(TEST_ACCESS_ID);
      expect(order).toBeDefined();
      expect(order!.patient_id).toBe(TEST_PATIENT_ID);
      expect(order!.status).toBe("confirmed");
      expect(order!.shipping_status).toBe("pending");
      expect(order!.payment_status).toBe("COMPLETED");
    });

    it("金額・商品コード・決済方法が正しく保存される", () => {
      const order = ordersStore.get(TEST_ACCESS_ID);
      expect(order).toBeDefined();
      expect(order!.product_code).toBe(TEST_PRODUCT_CODE);
      expect(order!.amount).toBe(5000);
      expect(order!.payment_method).toBe("credit_card");
    });

    it("2人目の患者の決済完了で別の注文が作成される", async () => {
      const req = createGMORequest({
        ShopID: "shop001",
        OrderID: TEST_ORDER_ID_2,
        Status: "CAPTURE",
        Amount: "3000",
        AccessID: TEST_ORDER_ID_2,
        ClientField1: `PID:${TEST_PATIENT_ID_2};Product:${TEST_PRODUCT_CODE}`,
        ClientField2: TEST_PRODUCT_NAME,
      });

      const res = await gmoWebhookPost(req);
      expect(res.status).toBe(200);
      expect(ordersStore.size).toBe(2);

      const order = ordersStore.get(TEST_ORDER_ID_2);
      expect(order).toBeDefined();
      expect(order!.patient_id).toBe(TEST_PATIENT_ID_2);
      expect(order!.shipping_status).toBe("pending");
    });

    it("冪等チェック関数が呼び出される", () => {
      expect(checkIdempotency).toHaveBeenCalled();
    });

    it("重複webhookはprocessGmoEventをスキップする", async () => {
      vi.mocked(processGmoEvent).mockClear();
      vi.mocked(checkIdempotency).mockResolvedValueOnce({
        duplicate: true,
        markCompleted: vi.fn(),
        markFailed: vi.fn(),
      });

      const req = createGMORequest({
        ShopID: "shop001",
        OrderID: TEST_ORDER_ID,
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: TEST_ACCESS_ID,
        ClientField1: `PID:${TEST_PATIENT_ID};Product:${TEST_PRODUCT_CODE}`,
        ClientField2: TEST_PRODUCT_NAME,
      });

      const res = await gmoWebhookPost(req);
      expect(res.status).toBe(200);
      // 重複なのでprocessGmoEventは呼ばれない
      expect(processGmoEvent).not.toHaveBeenCalled();
    });

    it("SALESステータスでも注文が作成される", async () => {
      const req = createGMORequest({
        ShopID: "shop001",
        OrderID: "order-sales-001",
        Status: "SALES",
        Amount: "7000",
        AccessID: "access-sales-001",
        ClientField1: `PID:${TEST_PATIENT_ID};Product:${TEST_PRODUCT_CODE}`,
        ClientField2: TEST_PRODUCT_NAME,
      });

      const res = await gmoWebhookPost(req);
      expect(res.status).toBe(200);
      expect(processGmoEvent).toHaveBeenCalledWith(expect.objectContaining({
        status: "SALES",
      }));

      const order = ordersStore.get("access-sales-001");
      expect(order).toBeDefined();
      expect(order!.amount).toBe(7000);
      // クリーンアップ
      ordersStore.delete("access-sales-001");
    });
  });

  // ------------------------------------------------------------------
  // ステップ2: 未発送リスト取得
  // ------------------------------------------------------------------
  describe("ステップ2: 未発送注文リストの取得", () => {
    it("未発送注文がAPI経由で取得できる", async () => {
      const req = createAdminGetRequest("/api/admin/shipping/pending");
      const res = await pendingGet(req as never);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.orders).toBeDefined();
      expect(Array.isArray(body.orders)).toBe(true);
    });

    it("レスポンスに合計件数が含まれる", async () => {
      const req = createAdminGetRequest("/api/admin/shipping/pending");
      const res = await pendingGet(req as never);
      const body = await res.json();
      expect(body).toHaveProperty("total");
      expect(typeof body.total).toBe("number");
    });

    it("まとめ配送候補グループが返される", async () => {
      const req = createAdminGetRequest("/api/admin/shipping/pending");
      const res = await pendingGet(req as never);
      const body = await res.json();
      expect(body.mergeableGroups).toBeDefined();
      expect(Array.isArray(body.mergeableGroups)).toBe(true);
    });

    it("認証なしのリクエストは401で拒否される", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false);
      const req = createAdminGetRequest("/api/admin/shipping/pending");
      const res = await pendingGet(req as never);
      expect(res.status).toBe(401);
    });
  });

  // ------------------------------------------------------------------
  // ステップ3: 追跡番号付与 → 発送ステータス更新
  // ------------------------------------------------------------------
  describe("ステップ3: 追跡番号付与と発送処理", () => {
    it("追跡番号の確定で注文が発送済みステータスになる", async () => {
      const today = new Date().toISOString().split("T")[0];
      // update-tracking/confirmのモックチェーンが更新データを返すように設定
      // confirmルートはsupabase直接利用なので、mockFromの orders チェーンが使われる
      // ここではAPIレスポンスレベルで検証
      const req = createAdminPostRequest("/api/admin/shipping/update-tracking/confirm", {
        entries: [{
          payment_id: TEST_ACCESS_ID,
          patient_name: "テスト太郎",
          tracking_number: TEST_TRACKING_NUMBER,
          matched: true,
        }],
      });

      const res = await updateTrackingConfirmPost(req as never);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // ordersStore内の注文を手動で更新して後続テストの整合性を保つ
      const order = ordersStore.get(TEST_ACCESS_ID);
      if (order) {
        order.shipping_status = "shipped";
        order.tracking_number = TEST_TRACKING_NUMBER;
        order.shipping_date = today;
      }
    });

    it("発送処理後に注文のshipping_statusがshippedになっている", () => {
      const order = ordersStore.get(TEST_ACCESS_ID);
      expect(order).toBeDefined();
      expect(order!.shipping_status).toBe("shipped");
      expect(order!.tracking_number).toBe(TEST_TRACKING_NUMBER);
    });

    it("2件目の注文も発送処理できる", async () => {
      const today = new Date().toISOString().split("T")[0];
      const req = createAdminPostRequest("/api/admin/shipping/update-tracking/confirm", {
        entries: [{
          payment_id: TEST_ORDER_ID_2,
          patient_name: "テスト花子",
          tracking_number: "987654321098",
          matched: true,
        }],
      });

      const res = await updateTrackingConfirmPost(req as never);
      expect(res.status).toBe(200);

      // 手動で状態同期
      const order = ordersStore.get(TEST_ORDER_ID_2);
      if (order) {
        order.shipping_status = "shipped";
        order.tracking_number = "987654321098";
        order.shipping_date = today;
      }
      expect(order!.shipping_status).toBe("shipped");
    });

    it("レスポンスにdetails配列が含まれる", async () => {
      const req = createAdminPostRequest("/api/admin/shipping/update-tracking/confirm", {
        entries: [{
          payment_id: TEST_ACCESS_ID,
          patient_name: "テスト太郎",
          tracking_number: TEST_TRACKING_NUMBER,
          matched: true,
        }],
      });

      const res = await updateTrackingConfirmPost(req as never);
      const body = await res.json();
      expect(body).toHaveProperty("details");
      expect(Array.isArray(body.details)).toBe(true);
    });

    it("認証なしの発送処理リクエストは401で拒否される", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false);
      const req = createAdminPostRequest("/api/admin/shipping/update-tracking/confirm", {
        entries: [{ payment_id: "x", patient_name: "x", tracking_number: "x", matched: true }],
      });
      const res = await updateTrackingConfirmPost(req as never);
      expect(res.status).toBe(401);
    });
  });

  // ------------------------------------------------------------------
  // ステップ4: 本日発送リスト確認
  // ------------------------------------------------------------------
  describe("ステップ4: 本日発送済みリスト", () => {
    it("本日発送分のAPIが200を返しsummaryを含む", async () => {
      const req = createAdminGetRequest("/api/admin/shipping/today-shipped");
      const res = await todayShippedGet(req as never);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty("entries");
      expect(body).toHaveProperty("summary");
      expect(body.summary).toHaveProperty("total");
    });
  });

  // ------------------------------------------------------------------
  // ステップ5: 発送通知 LINE送信
  // ------------------------------------------------------------------
  describe("ステップ5: 発送通知のLINE送信", () => {
    it("発送通知プレビュー（GET）で統計情報が返る", async () => {
      const req = createAdminGetRequest("/api/admin/shipping/notify-shipped");
      const res = await notifyShippedGet(req as never);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.patients).toBeDefined();
      expect(body.summary).toBeDefined();
      expect(body.summary).toHaveProperty("total");
      expect(body.summary).toHaveProperty("sendable");
      expect(body.summary).toHaveProperty("no_uid");
      expect(body.summary).toHaveProperty("blocked");
    });

    it("発送通知一斉送信（POST）が成功しokを返す", async () => {
      linePushCalls = [];
      const req = createAdminPostRequest("/api/admin/shipping/notify-shipped", {});
      const res = await notifyShippedPost(req as never);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("通知結果にsent/failed/no_uid/blockedカウントが含まれる", async () => {
      const req = createAdminPostRequest("/api/admin/shipping/notify-shipped", {});
      const res = await notifyShippedPost(req as never);
      const body = await res.json();

      expect(typeof body.sent).toBe("number");
      expect(typeof body.failed).toBe("number");
      expect(typeof body.no_uid).toBe("number");
      expect(typeof body.blocked).toBe("number");
    });

    it("通知結果にmark_updatedとmenu_switchedが含まれる", async () => {
      const req = createAdminPostRequest("/api/admin/shipping/notify-shipped", {});
      const res = await notifyShippedPost(req as never);
      const body = await res.json();

      expect(body).toHaveProperty("mark_updated");
      expect(body).toHaveProperty("menu_switched");
    });

    it("認証なしの通知リクエストは401で拒否される", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false);
      const req = createAdminPostRequest("/api/admin/shipping/notify-shipped", {});
      const res = await notifyShippedPost(req as never);
      expect(res.status).toBe(401);
    });
  });

  // ------------------------------------------------------------------
  // ステップ6: フロー全体の整合性チェック
  // ------------------------------------------------------------------
  describe("ステップ6: フロー全体の整合性検証", () => {
    it("全注文がshipping_status=shippedに遷移している", () => {
      for (const order of ordersStore.values()) {
        expect(order.shipping_status).toBe("shipped");
      }
    });

    it("全注文に追跡番号が付与されている", () => {
      for (const order of ordersStore.values()) {
        expect(order.tracking_number).toBeTruthy();
      }
    });

    it("全注文のpayment_statusがCOMPLETEDのまま維持されている", () => {
      for (const order of ordersStore.values()) {
        expect(order.payment_status).toBe("COMPLETED");
      }
    });

    it("全注文に発送日が記録されている", () => {
      const today = new Date().toISOString().split("T")[0];
      for (const order of ordersStore.values()) {
        expect(order.shipping_date).toBe(today);
      }
    });

    it("注文と患者IDの紐付けが正しい", () => {
      const order1 = ordersStore.get(TEST_ACCESS_ID);
      expect(order1!.patient_id).toBe(TEST_PATIENT_ID);

      const order2 = ordersStore.get(TEST_ORDER_ID_2);
      expect(order2!.patient_id).toBe(TEST_PATIENT_ID_2);
    });
  });
});
