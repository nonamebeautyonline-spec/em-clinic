// __tests__/api/mypage.test.ts
// マイページAPI (app/api/mypage/route.ts) の統合テスト
// 認証、キャッシュ、DB並列取得、LINE UID整合性チェック、NG患者判定、
// ユーティリティ関数（normalize*, inferCarrier*）をテスト
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── モックチェーン ───
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

// globalThis を経由してテストから tableChains を操作する
vi.mock("@/lib/supabase", () => {
  return {
    supabaseAdmin: {
      from: vi.fn((...args: any[]) => {
        const chains = (globalThis as any).__testTableChains || {};
        const table = args[0];
        if (!chains[table]) {
          const c: any = {};
          [
            "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
            "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
            "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
          ].forEach((m) => {
            c[m] = vi.fn().mockReturnValue(c);
          });
          c.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
          chains[table] = c;
        }
        return chains[table];
      }),
    },
  };
});

// Redis
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  },
  getDashboardCacheKey: vi.fn((pid: string) => `dashboard:${pid}`),
}));

// Tenant
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

// Cookies（next/headers）
const _mockCookieStore = {
  get: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(_mockCookieStore)),
}));

// Validation
vi.mock("@/lib/validations/helpers", () => ({
  validateBody: vi.fn((body: any) => {
    if (body && typeof body === "object") return { data: body };
    return { data: {} };
  }),
}));

vi.mock("@/lib/validations/mypage", () => ({
  mypageDashboardSchema: {},
}));

// ─── ルートインポート ───
import { POST } from "@/app/api/mypage/route";
import { redis } from "@/lib/redis";

// ─── ヘルパー ───
function createRequest(body: any = {}) {
  return new NextRequest("http://localhost:3000/api/mypage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

/** Cookie モックのセットアップヘルパー */
function setupCookies(opts: { patientId?: string; lineUserId?: string; useHostPrefix?: boolean }) {
  const prefix = opts.useHostPrefix !== false; // デフォルト __Host- 使用
  _mockCookieStore.get.mockImplementation((name: string) => {
    if (opts.patientId) {
      if (prefix && name === "__Host-patient_id") return { value: opts.patientId };
      if (!prefix && name === "patient_id") return { value: opts.patientId };
    }
    if (opts.lineUserId) {
      if (prefix && name === "__Host-line_user_id") return { value: opts.lineUserId };
      if (!prefix && name === "line_user_id") return { value: opts.lineUserId };
    }
    return undefined;
  });
}

/** 全テーブルをデフォルト値でセットアップ */
function setupDefaultTables(overrides: {
  patient?: any;
  intake?: any;
  reservation?: any;
  orders?: any;
  reorders?: any;
} = {}) {
  setTableChain("patients", createChain(
    overrides.patient ?? { data: { patient_id: "pid-001", name: "テスト太郎", line_id: null }, error: null }
  ));
  setTableChain("intake", createChain(
    overrides.intake ?? { data: null, error: null }
  ));
  setTableChain("reservations", createChain(
    overrides.reservation ?? { data: null, error: null }
  ));
  setTableChain("orders", createChain(
    overrides.orders ?? { data: [], error: null }
  ));
  setTableChain("reorders", createChain(
    overrides.reorders ?? { data: [], error: null }
  ));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ユーティリティ関数のローカル再実装（route.ts の非export関数をテスト）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizePaymentStatus(v: any): "paid" | "pending" | "failed" | "refunded" {
  const s = safeStr(v).toLowerCase();
  if (s === "paid" || s === "pending" || s === "failed" || s === "refunded") return s as any;
  if (safeStr(v).toUpperCase() === "COMPLETED") return "paid";
  return "paid";
}

function normalizeRefundStatus(v: any): "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN" | undefined {
  const s = safeStr(v).toUpperCase();
  if (!s) return undefined;
  if (s === "PENDING" || s === "COMPLETED" || s === "FAILED") return s as any;
  return "UNKNOWN";
}

function normalizeCarrier(v: any): "japanpost" | "yamato" | undefined {
  const s = safeStr(v).toLowerCase();
  if (s === "japanpost" || s === "yamato") return s as any;
  return undefined;
}

const TRACKING_SWITCH_AT = new Date("2025-12-22T00:00:00+09:00").getTime();

function inferCarrierFromDates(o: { shippingEta?: string; paidAt?: string }): "japanpost" | "yamato" {
  const se = safeStr(o.shippingEta).trim();
  if (se) {
    const t = new Date(se).getTime();
    if (Number.isFinite(t)) return t < TRACKING_SWITCH_AT ? "japanpost" : "yamato";
  }
  const pa = safeStr(o.paidAt).trim();
  if (pa) {
    const t = new Date(pa).getTime();
    if (Number.isFinite(t)) return t < TRACKING_SWITCH_AT ? "japanpost" : "yamato";
  }
  return "yamato";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// テスト本体
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("POST /api/mypage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
    _mockCookieStore.get.mockReset();
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK");
  });

  // ─── 認証テスト ───
  describe("認証", () => {
    it("patient_id Cookieなし → 401 'unauthorized'", async () => {
      _mockCookieStore.get.mockReturnValue(undefined);

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("unauthorized");
    });

    it("正常な __Host-patient_id Cookie → 200", async () => {
      setupCookies({ patientId: "pid-001" });
      setupDefaultTables();

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });

    it("patient_id Cookie（__Host-なし）でフォールバック認証", async () => {
      setupCookies({ patientId: "pid-002", useHostPrefix: false });
      setupDefaultTables({
        patient: { data: { patient_id: "pid-002", name: "太郎", line_id: null }, error: null },
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });
  });

  // ─── LINE UID 整合性チェック ───
  describe("LINE UID整合性チェック", () => {
    it("line_user_id Cookie と patients.line_id が不一致 → 401 'pid_mismatch'", async () => {
      setupCookies({ patientId: "pid-001", lineUserId: "U-different" });
      // patients.line_id が別の値
      setTableChain("patients", createChain({ data: { line_id: "U-original" }, error: null }));

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("pid_mismatch");
    });

    it("line_user_id Cookie と patients.line_id が一致 → 200", async () => {
      setupCookies({ patientId: "pid-001", lineUserId: "U-same" });
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: "U-same" }, error: null },
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });

    it("line_user_id Cookieなし → 整合性チェックスキップで200", async () => {
      setupCookies({ patientId: "pid-001" });
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: "U-xxx" }, error: null },
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });

    it("patients.line_id が null → 整合性チェックスキップで200", async () => {
      setupCookies({ patientId: "pid-001", lineUserId: "U-new" });
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
      });

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });
  });

  // ─── キャッシュテスト ───
  describe("キャッシュ", () => {
    it("キャッシュヒット → キャッシュデータを返す", async () => {
      setupCookies({ patientId: "pid-cached" });
      // 整合性チェック用: line_idがnull
      setTableChain("patients", createChain({ data: { line_id: null }, error: null }));

      const cachedPayload = { ok: true, patient: { id: "pid-cached", displayName: "キャッシュ太郎" } };
      vi.mocked(redis.get).mockResolvedValue(cachedPayload as any);

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.patient.displayName).toBe("キャッシュ太郎");
      // キャッシュヒット時は redis.set は呼ばれない（DB問い合わせしないため）
      expect(redis.set).not.toHaveBeenCalled();
    });

    it("forceRefresh=true → キャッシュスキップしDBから取得", async () => {
      setupCookies({ patientId: "pid-001" });
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "DB太郎", line_id: null }, error: null },
      });

      const cachedPayload = { ok: true, patient: { id: "pid-001", displayName: "キャッシュ太郎" } };
      vi.mocked(redis.get).mockResolvedValue(cachedPayload as any);

      const res = await POST(createRequest({ refresh: true }));
      const body = await res.json();

      expect(res.status).toBe(200);
      // キャッシュをスキップしたのでDBから取得した名前
      expect(body.patient.displayName).toBe("DB太郎");
      // キャッシュを読まず、新しいデータをDBから取得後に保存
      expect(redis.set).toHaveBeenCalled();
    });

    it("forceRefresh='1' → キャッシュスキップ", async () => {
      setupCookies({ patientId: "pid-001" });
      setupDefaultTables();

      vi.mocked(redis.get).mockResolvedValue({ ok: true } as any);

      const res = await POST(createRequest({ refresh: "1" }));
      expect(res.status).toBe(200);
      // redis.get が返すキャッシュを使わず、新しくDBから取得
      expect(redis.set).toHaveBeenCalled();
    });

    it("キャッシュ保存時にTTL=1800秒（30分）が設定される", async () => {
      setupCookies({ patientId: "pid-001" });
      setupDefaultTables();

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
      expect(redis.set).toHaveBeenCalledWith(
        "dashboard:pid-001",
        expect.objectContaining({ ok: true }),
        { ex: 1800 },
      );
    });
  });

  // ─── データ取得テスト ───
  describe("データ取得", () => {
    beforeEach(() => {
      setupCookies({ patientId: "pid-001" });
    });

    it("患者情報の取得 — displayName が含まれる", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "山田花子", line_id: null }, error: null },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.patient.id).toBe("pid-001");
      expect(body.patient.displayName).toBe("山田花子");
    });

    it("注文情報（orders）の取得とマッピング", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        orders: {
          data: [
            {
              id: "order-001",
              product_code: "MJL_5mg_1m",
              product_name: "マンジャロ5mg 1ヶ月",
              amount: 15000,
              paid_at: "2026-01-15T10:00:00Z",
              shipping_status: "shipped",
              shipping_date: "2026-01-16",
              tracking_number: "1234567890",
              payment_status: "paid",
              payment_method: "credit_card",
              carrier: "yamato",
              refund_status: null,
              refunded_at: null,
              refunded_amount: null,
              postal_code: "100-0001",
              address: "東京都千代田区",
              shipping_name: "山田太郎",
              shipping_list_created_at: "2026-01-15",
              created_at: "2026-01-15T09:00:00Z",
              status: "completed",
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.orders).toHaveLength(1);
      const order = body.orders[0];
      expect(order.id).toBe("order-001");
      expect(order.productCode).toBe("MJL_5mg_1m");
      expect(order.productName).toBe("マンジャロ5mg 1ヶ月");
      expect(order.amount).toBe(15000);
      expect(order.shippingStatus).toBe("shipped");
      expect(order.trackingNumber).toBe("1234567890");
      expect(order.paymentStatus).toBe("paid");
      expect(order.carrier).toBe("yamato");
      expect(order.postalCode).toBe("100-0001");
      expect(order.address).toBe("東京都千代田区");
      expect(order.shippingName).toBe("山田太郎");
    });

    it("予約情報の取得", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        reservation: {
          data: {
            reserve_id: "res-001",
            reserved_date: "2026-03-01",
            reserved_time: "14:00",
            status: "confirmed",
          },
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.nextReservation).not.toBeNull();
      expect(body.nextReservation.id).toBe("res-001");
      expect(body.nextReservation.datetime).toBe("2026-03-01 14:00");
      expect(body.nextReservation.title).toBe("診察予約");
      expect(body.nextReservation.status).toBe("confirmed");
    });

    it("診察履歴の取得（status=OK の intake）", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        // intake テーブルの呼び出しは、getPatientInfo / getConsultationHistory の
        // 2箇所で使われるが、globalThisチェーンは同じオブジェクトを返す。
        // ここでは status=OK のデータを設定し、history に含まれることを確認。
        intake: {
          data: {
            patient_id: "pid-001",
            status: "OK",
            answers: { ng_check: "OK" },
            reserve_id: "res-001",
            note: "問診OK",
            updated_at: "2026-01-20T10:00:00Z",
          },
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      // hasIntake は問診完了済みであること
      expect(body.hasIntake).toBe(true);
      expect(body.intakeStatus).toBe("OK");
    });

    it("再処方情報の取得", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        reorders: {
          data: [
            {
              id: 42,
              status: "approved",
              created_at: "2026-02-01T09:00:00Z",
              product_code: "MJL_5mg_3m",
              reorder_number: 2,
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.reorders).toHaveLength(1);
      expect(body.reorders[0].id).toBe("42");
      expect(body.reorders[0].status).toBe("approved");
      expect(body.reorders[0].productCode).toBe("MJL_5mg_3m");
      expect(body.reorders[0].mg).toBe("5mg");
      expect(body.reorders[0].months).toBe(3);
    });

    it("予約なしの場合は nextReservation が null", async () => {
      setupDefaultTables();

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.nextReservation).toBeNull();
    });

    it("注文の payment_method が bank_transfer の場合", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        orders: {
          data: [
            {
              id: "order-bt",
              product_code: "MJL_5mg_1m",
              product_name: "マンジャロ5mg",
              amount: 15000,
              paid_at: "2026-01-15",
              payment_status: "paid",
              payment_method: "bank_transfer",
              shipping_status: "pending",
              carrier: null,
              refund_status: null,
              status: "completed",
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.orders[0].paymentMethod).toBe("bank_transfer");
    });

    it("activeOrders は refundStatus=COMPLETED の注文を除外する", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        orders: {
          data: [
            {
              id: "order-active",
              product_code: "MJL_5mg_1m",
              product_name: "アクティブ注文",
              amount: 15000,
              paid_at: "2026-01-15",
              payment_status: "paid",
              shipping_status: "pending",
              refund_status: null,
              carrier: "yamato",
              status: "completed",
            },
            {
              id: "order-refunded",
              product_code: "MJL_5mg_1m",
              product_name: "返金済み注文",
              amount: 15000,
              paid_at: "2026-01-10",
              payment_status: "refunded",
              shipping_status: "pending",
              refund_status: "COMPLETED",
              carrier: "yamato",
              status: "refunded",
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.orders).toHaveLength(2);
      expect(body.activeOrders).toHaveLength(1);
      expect(body.activeOrders[0].id).toBe("order-active");
    });

    it("shipping_name が 'null' 文字列の場合は undefined に変換", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        orders: {
          data: [
            {
              id: "order-null-name",
              product_code: "MJL_5mg_1m",
              product_name: "テスト",
              amount: 15000,
              paid_at: "2026-01-15",
              payment_status: "paid",
              shipping_status: "pending",
              refund_status: null,
              carrier: "yamato",
              shipping_name: "null",
              status: "completed",
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      // "null" 文字列は undefined になる（JSON では キーが省略される）
      expect(body.orders[0].shippingName).toBeUndefined();
    });

    it("status=pending_confirmation の注文は paymentStatus が pending になる", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        orders: {
          data: [
            {
              id: "order-pending",
              product_code: "MJL_5mg_1m",
              product_name: "テスト",
              amount: 15000,
              paid_at: "2026-01-15",
              payment_status: "paid",
              shipping_status: "pending",
              refund_status: null,
              carrier: "yamato",
              status: "pending_confirmation",
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.orders[0].paymentStatus).toBe("pending");
    });
  });

  // ─── ordersFlags テスト ───
  describe("ordersFlags", () => {
    beforeEach(() => {
      setupCookies({ patientId: "pid-001" });
    });

    it("初回購入可能 — 注文なし + NG以外", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        intake: { data: { patient_id: "pid-001", status: "OK", answers: { ng_check: "OK" } }, error: null },
        orders: { data: [], error: null },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.ordersFlags.canPurchaseCurrentCourse).toBe(true);
      expect(body.ordersFlags.canApplyReorder).toBe(false);
      expect(body.ordersFlags.hasAnyPaidOrder).toBe(false);
    });

    it("再処方可能 — 注文あり + NG以外", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        intake: { data: { patient_id: "pid-001", status: "OK", answers: { ng_check: "OK" } }, error: null },
        orders: {
          data: [
            {
              id: "order-001",
              product_code: "MJL_5mg_1m",
              product_name: "マンジャロ5mg",
              amount: 15000,
              paid_at: "2026-01-15",
              payment_status: "paid",
              shipping_status: "shipped",
              refund_status: null,
              carrier: "yamato",
              status: "completed",
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.ordersFlags.canPurchaseCurrentCourse).toBe(false);
      expect(body.ordersFlags.canApplyReorder).toBe(true);
      expect(body.ordersFlags.hasAnyPaidOrder).toBe(true);
    });

    it("NG患者は購入不可 — intakeStatus=NG", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-ng", name: "NG太郎", line_id: null }, error: null },
        intake: { data: { patient_id: "pid-ng", status: "NG", answers: { ng_check: "NG" } }, error: null },
        orders: { data: [], error: null },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.ordersFlags.canPurchaseCurrentCourse).toBe(false);
      expect(body.ordersFlags.canApplyReorder).toBe(false);
    });

    it("NG患者は注文があっても再処方不可", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-ng", name: "NG太郎", line_id: null }, error: null },
        intake: { data: { patient_id: "pid-ng", status: "NG", answers: { ng_check: "NG" } }, error: null },
        orders: {
          data: [
            {
              id: "order-001",
              product_code: "MJL_5mg_1m",
              product_name: "マンジャロ5mg",
              amount: 15000,
              paid_at: "2026-01-15",
              payment_status: "paid",
              shipping_status: "shipped",
              refund_status: null,
              carrier: "yamato",
              status: "completed",
            },
          ],
          error: null,
        },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.ordersFlags.canPurchaseCurrentCourse).toBe(false);
      expect(body.ordersFlags.canApplyReorder).toBe(false);
      expect(body.ordersFlags.hasAnyPaidOrder).toBe(true);
    });

    it("intakeStatus が null（未問診）の場合 — NGではないので購入可", async () => {
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "太郎", line_id: null }, error: null },
        intake: { data: null, error: null },
        orders: { data: [], error: null },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.ordersFlags.canPurchaseCurrentCourse).toBe(true);
    });
  });

  // ─── レスポンス構造テスト ───
  describe("レスポンス構造", () => {
    it("正常レスポンスに必須フィールドが全て含まれる", async () => {
      setupCookies({ patientId: "pid-001" });
      setupDefaultTables({
        patient: { data: { patient_id: "pid-001", name: "テスト太郎", line_id: "" }, error: null },
        intake: { data: { patient_id: "pid-001", status: "OK", answers: { ng_check: "OK" } }, error: null },
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body).toHaveProperty("patient");
      expect(body).toHaveProperty("nextReservation");
      expect(body).toHaveProperty("activeOrders");
      expect(body).toHaveProperty("orders");
      expect(body).toHaveProperty("ordersFlags");
      expect(body).toHaveProperty("reorders");
      expect(body).toHaveProperty("history");
      expect(body).toHaveProperty("hasIntake");
      expect(body).toHaveProperty("intakeStatus");
    });

    it("no-cache ヘッダーが設定される", async () => {
      setupCookies({ patientId: "pid-001" });
      setupDefaultTables();

      const res = await POST(createRequest());

      expect(res.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate, max-age=0");
      expect(res.headers.get("Pragma")).toBe("no-cache");
    });
  });

  // ─── エラーハンドリング ───
  describe("エラーハンドリング", () => {
    it("予期しないエラー発生時は 500 'unexpected_error' を返す", async () => {
      _mockCookieStore.get.mockImplementation(() => {
        throw new Error("予期しないエラー");
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("unexpected_error");
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ユーティリティ関数テスト（route.ts 内の非export関数を再実装してテスト）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("normalizePaymentStatus", () => {
  it("'paid' → 'paid'", () => {
    expect(normalizePaymentStatus("paid")).toBe("paid");
  });

  it("'pending' → 'pending'", () => {
    expect(normalizePaymentStatus("pending")).toBe("pending");
  });

  it("'failed' → 'failed'", () => {
    expect(normalizePaymentStatus("failed")).toBe("failed");
  });

  it("'refunded' → 'refunded'", () => {
    expect(normalizePaymentStatus("refunded")).toBe("refunded");
  });

  it("'PAID'（大文字）→ 'paid'（小文字に正規化）", () => {
    expect(normalizePaymentStatus("PAID")).toBe("paid");
  });

  it("'COMPLETED' → 'paid'（Square互換）", () => {
    expect(normalizePaymentStatus("COMPLETED")).toBe("paid");
  });

  it("null → 'paid'（デフォルト）", () => {
    expect(normalizePaymentStatus(null)).toBe("paid");
  });

  it("undefined → 'paid'（デフォルト）", () => {
    expect(normalizePaymentStatus(undefined)).toBe("paid");
  });

  it("空文字 → 'paid'（デフォルト）", () => {
    expect(normalizePaymentStatus("")).toBe("paid");
  });

  it("不正な値 'unknown_status' → 'paid'（デフォルト）", () => {
    expect(normalizePaymentStatus("unknown_status")).toBe("paid");
  });

  it("数値 123 → 'paid'（デフォルト）", () => {
    expect(normalizePaymentStatus(123)).toBe("paid");
  });
});

describe("normalizeRefundStatus", () => {
  it("'PENDING' → 'PENDING'", () => {
    expect(normalizeRefundStatus("PENDING")).toBe("PENDING");
  });

  it("'COMPLETED' → 'COMPLETED'", () => {
    expect(normalizeRefundStatus("COMPLETED")).toBe("COMPLETED");
  });

  it("'FAILED' → 'FAILED'", () => {
    expect(normalizeRefundStatus("FAILED")).toBe("FAILED");
  });

  it("'pending'（小文字）→ 'PENDING'（大文字に正規化）", () => {
    expect(normalizeRefundStatus("pending")).toBe("PENDING");
  });

  it("'completed'（小文字）→ 'COMPLETED'", () => {
    expect(normalizeRefundStatus("completed")).toBe("COMPLETED");
  });

  it("null → undefined", () => {
    expect(normalizeRefundStatus(null)).toBeUndefined();
  });

  it("undefined → undefined", () => {
    expect(normalizeRefundStatus(undefined)).toBeUndefined();
  });

  it("空文字 → undefined", () => {
    expect(normalizeRefundStatus("")).toBeUndefined();
  });

  it("不明な文字列 'PARTIAL' → 'UNKNOWN'", () => {
    expect(normalizeRefundStatus("PARTIAL")).toBe("UNKNOWN");
  });

  it("不正な値 'abc' → 'UNKNOWN'", () => {
    expect(normalizeRefundStatus("abc")).toBe("UNKNOWN");
  });

  it("数値 0 → 'UNKNOWN'", () => {
    expect(normalizeRefundStatus(0)).toBe("UNKNOWN");
  });
});

describe("normalizeCarrier", () => {
  it("'japanpost' → 'japanpost'", () => {
    expect(normalizeCarrier("japanpost")).toBe("japanpost");
  });

  it("'yamato' → 'yamato'", () => {
    expect(normalizeCarrier("yamato")).toBe("yamato");
  });

  it("'JAPANPOST'（大文字）→ 'japanpost'", () => {
    expect(normalizeCarrier("JAPANPOST")).toBe("japanpost");
  });

  it("'Yamato'（先頭大文字）→ 'yamato'", () => {
    expect(normalizeCarrier("Yamato")).toBe("yamato");
  });

  it("null → undefined", () => {
    expect(normalizeCarrier(null)).toBeUndefined();
  });

  it("undefined → undefined", () => {
    expect(normalizeCarrier(undefined)).toBeUndefined();
  });

  it("空文字 → undefined", () => {
    expect(normalizeCarrier("")).toBeUndefined();
  });

  it("不正な値 'sagawa' → undefined", () => {
    expect(normalizeCarrier("sagawa")).toBeUndefined();
  });
});

describe("inferCarrierFromDates", () => {
  // TRACKING_SWITCH_AT = 2025-12-22T00:00:00+09:00
  it("shippingEta が切替日より前 → 'japanpost'", () => {
    expect(inferCarrierFromDates({ shippingEta: "2025-12-20" })).toBe("japanpost");
  });

  it("shippingEta が切替日以降 → 'yamato'", () => {
    expect(inferCarrierFromDates({ shippingEta: "2025-12-23" })).toBe("yamato");
  });

  it("shippingEta なし、paidAt が切替日より前 → 'japanpost'", () => {
    expect(inferCarrierFromDates({ paidAt: "2025-10-01" })).toBe("japanpost");
  });

  it("shippingEta なし、paidAt が切替日以降 → 'yamato'", () => {
    expect(inferCarrierFromDates({ paidAt: "2026-01-15" })).toBe("yamato");
  });

  it("shippingEta 優先 — 両方あれば shippingEta を使う", () => {
    // shippingEta（切替前）→ japanpost が返るはず
    expect(inferCarrierFromDates({
      shippingEta: "2025-11-01",
      paidAt: "2026-02-01",
    })).toBe("japanpost");
  });

  it("両方なし → デフォルト 'yamato'", () => {
    expect(inferCarrierFromDates({})).toBe("yamato");
  });

  it("shippingEta が不正な日付文字列 → paidAt にフォールバック", () => {
    expect(inferCarrierFromDates({
      shippingEta: "invalid-date",
      paidAt: "2025-10-01",
    })).toBe("japanpost");
  });

  it("shippingEta が空文字 → paidAt にフォールバック", () => {
    expect(inferCarrierFromDates({
      shippingEta: "",
      paidAt: "2026-01-15",
    })).toBe("yamato");
  });

  it("両方とも不正な日付 → デフォルト 'yamato'", () => {
    expect(inferCarrierFromDates({
      shippingEta: "invalid",
      paidAt: "also-invalid",
    })).toBe("yamato");
  });
});
