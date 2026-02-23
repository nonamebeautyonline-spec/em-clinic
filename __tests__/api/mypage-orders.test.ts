// __tests__/api/mypage-orders.test.ts
// マイページ注文履歴API (app/api/mypage/orders/route.ts) のテスト
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Cookieモック ───
const _mockCookieStore = {
  get: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(_mockCookieStore)),
}));

// ─── Supabaseチェーンモック ───
const mockOrderResult = { data: [] as any[], error: null as any };
const mockChain: any = {};
["select", "eq", "neq", "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "insert", "update", "delete"].forEach((m) => {
  mockChain[m] = vi.fn().mockReturnValue(mockChain);
});
// order() が最後のチェーンで結果を返す
mockChain.order.mockImplementation(() => mockOrderResult);

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockChain) },
}));

// ─── テナントモック ───
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

// ─── ルートインポート ───
import { GET, POST } from "@/app/api/mypage/orders/route";

// ─── ヘルパー ───
function createRequest(method = "GET") {
  return new NextRequest("http://localhost:3000/api/mypage/orders", {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

/** Cookieセットアップ */
function setupCookies(patientId?: string) {
  _mockCookieStore.get.mockImplementation((name: string) => {
    if (patientId) {
      if (name === "__Host-patient_id") return { value: patientId };
      if (name === "patient_id") return { value: patientId };
    }
    return undefined;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// テスト本体
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("mypage/orders API (app/api/mypage/orders/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderResult.data = [];
    mockOrderResult.error = null;
    // チェーンリセット
    Object.keys(mockChain).forEach((m) => {
      if (m !== "order") {
        mockChain[m].mockReturnValue(mockChain);
      }
    });
    mockChain.order.mockImplementation(() => mockOrderResult);
  });

  // === 認証テスト ===
  describe("認証", () => {
    it("patient_id Cookieなし → 401", async () => {
      setupCookies(undefined);
      const req = createRequest();
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("unauthorized");
    });

    it("patient_id Cookie空文字 → 401", async () => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "__Host-patient_id") return { value: "" };
        if (name === "patient_id") return { value: "" };
        return undefined;
      });
      const req = createRequest();
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  // === GET 正常系 ===
  describe("GET: 正常系", () => {
    it("注文なし → ok:true, orders:[], flags正常", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [];

      const req = createRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.orders).toEqual([]);
      expect(json.flags.canPurchaseCurrentCourse).toBe(true);
      expect(json.flags.canApplyReorder).toBe(false);
      expect(json.flags.hasAnyPaidOrder).toBe(false);
    });

    it("注文あり → ordersにデータが含まれ、flagsが正しい", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_1",
          product_code: "MJL_2.5mg_1m",
          product_name: "マンジャロ 2.5mg 1ヶ月",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "shipped",
          shipping_date: "2026-01-05",
          tracking_number: "1234567890",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: null,
          refunded_at: null,
          refunded_amount: null,
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.orders).toHaveLength(1);
      expect(json.orders[0].id).toBe("order_1");
      expect(json.orders[0].productCode).toBe("MJL_2.5mg_1m");
      expect(json.orders[0].productName).toBe("マンジャロ 2.5mg 1ヶ月");
      expect(json.orders[0].amount).toBe(50000);
      expect(json.orders[0].shippingStatus).toBe("shipped");
      expect(json.orders[0].trackingNumber).toBe("1234567890");
      expect(json.orders[0].paymentStatus).toBe("paid");
      expect(json.orders[0].paymentMethod).toBe("credit_card");
      // flags
      expect(json.flags.canPurchaseCurrentCourse).toBe(true);
      expect(json.flags.canApplyReorder).toBe(true);
      expect(json.flags.hasAnyPaidOrder).toBe(true);
    });

    it("pending_confirmation → paymentStatusが'pending'になる", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "bt_pending_1",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: null,
          shipping_status: "pending",
          payment_status: null,
          payment_method: "bank_transfer",
          refund_status: null,
          created_at: "2026-01-01T00:00:00Z",
          status: "pending_confirmation",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orders[0].paymentStatus).toBe("pending");
      expect(json.orders[0].paymentMethod).toBe("bank_transfer");
    });

    it("refund_statusがCOMPLETEDの場合 → refundStatusにCOMPLETEDが設定される", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_refund",
          product_code: "MJL_5mg_1m",
          product_name: "マンジャロ 5mg",
          amount: 80000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "refunded",
          payment_method: "credit_card",
          refund_status: "COMPLETED",
          refunded_at: "2026-01-10T00:00:00Z",
          refunded_amount: 80000,
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].refundStatus).toBe("COMPLETED");
      expect(json.orders[0].refundedAt).toBe("2026-01-10T00:00:00Z");
      expect(json.orders[0].refundedAmount).toBe(80000);
    });

    it("日付フォーマット変換: yyyy/MM/dd HH:mm → ISO形式に変換", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_date",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at_jst: "2026/01/15 14:30",
          shipping_status: "pending",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: null,
          created_at: "2026-01-15T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      // yyyy/MM/dd HH:mm → yyyy-MM-ddTHH:mm:ss+09:00 形式
      expect(json.orders[0].paidAt).toBe("2026-01-15T14:30:00+09:00");
    });

    it("日付フォーマット変換: yyyy-MM-dd → ISO形式に変換", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_date2",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-20",
          shipping_status: "pending",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: null,
          created_at: "2026-01-20T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].paidAt).toBe("2026-01-20T00:00:00+09:00");
    });

    it("payment_status COMPLETED → 'paid'に正規化される", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_completed",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "COMPLETED",
          payment_method: "credit_card",
          refund_status: null,
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].paymentStatus).toBe("paid");
    });

    it("不明なrefund_status → 'UNKNOWN'に正規化される", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_unknown_refund",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: "SOME_UNKNOWN_STATUS",
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].refundStatus).toBe("UNKNOWN");
    });
  });

  // === GET エラー系 ===
  describe("GET: エラー系", () => {
    it("DBエラー → 500", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [];
      mockOrderResult.error = { message: "connection error" };

      const req = createRequest();
      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("database_error");
    });
  });

  // === POST はGETと同じ動作 ===
  describe("POST: GETと同じ動作", () => {
    it("POSTでも注文データが取得できる", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_via_post",
          product_code: "MJL_5mg_1m",
          product_name: "マンジャロ 5mg",
          amount: 80000,
          paid_at: "2026-02-01T00:00:00Z",
          shipping_status: "delivered",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: null,
          created_at: "2026-02-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = new NextRequest("http://localhost:3000/api/mypage/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.orders).toHaveLength(1);
      expect(json.orders[0].id).toBe("order_via_post");
    });

    it("POST認証なし → 401", async () => {
      setupCookies(undefined);
      const req = new NextRequest("http://localhost:3000/api/mypage/orders", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // === フィールドマッピングの詳細テスト ===
  describe("フィールドマッピング", () => {
    it("shipping_eta / shippingEta のフォールバック", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_eta",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "preparing",
          shipping_eta: "2026-01-10",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: null,
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].shippingEta).toBe("2026-01-10");
    });

    it("refund_statusが空文字 → refundStatusがundefined", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_no_refund",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: "",
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].refundStatus).toBeUndefined();
    });

    it("refunded_amountがnull → undefinedになる", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "order_no_amount",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "paid",
          payment_method: "credit_card",
          refund_status: null,
          refunded_amount: null,
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].refundedAmount).toBeUndefined();
    });

    it("payment_method が bank_transfer → そのまま返る", async () => {
      setupCookies("pid-001");
      mockOrderResult.data = [
        {
          id: "bt_order",
          product_code: "MJL_2.5mg_1m",
          product_name: "",
          amount: 50000,
          paid_at: "2026-01-01T00:00:00Z",
          shipping_status: "pending",
          payment_status: "paid",
          payment_method: "bank_transfer",
          refund_status: null,
          created_at: "2026-01-01T00:00:00Z",
          status: "confirmed",
        },
      ];

      const req = createRequest();
      const res = await GET(req);
      const json = await res.json();
      expect(json.orders[0].paymentMethod).toBe("bank_transfer");
    });
  });
});
