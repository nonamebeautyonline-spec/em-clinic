// __tests__/api/square-webhook.test.ts
// Square Webhook API (app/api/square/webhook/route.ts) の統合テスト
// 署名検証、支払い処理、返金処理、reorder更新、注文INSERT/UPDATEをテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// --- モックチェーン ---
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

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((v: string) => v || ""),
}));

vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue(""),
}));

// fetch モック
vi.stubGlobal("fetch", vi.fn());

// --- ルートインポート ---
import { GET, POST } from "@/app/api/square/webhook/route";
import { invalidateDashboardCache } from "@/lib/redis";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { getSettingOrEnv } from "@/lib/settings";

// --- ヘルパー ---
function createWebhookRequest(body: any, headers: Record<string, string> = {}) {
  const bodyStr = JSON.stringify(body);
  return new Request("http://localhost:3000/api/square/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: bodyStr,
  });
}

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

// fetch レスポンス生成
function mockFetchResponse(data: any, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe("Square Webhook API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
    vi.mocked(getSettingOrEnv).mockResolvedValue("");
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("{}"),
    } as any);
  });

  // --- GET テスト ---
  describe("GET /api/square/webhook", () => {
    it("200 'ok' を返す（ヘルスチェック）", async () => {
      const res = await GET();
      const text = await res.text();

      expect(res.status).toBe(200);
      expect(text).toBe("ok");
    });
  });

  // --- 署名検証テスト ---
  describe("署名検証", () => {
    it("署名キーがあり不正な署名の場合は401を返す", async () => {
      vi.mocked(getSettingOrEnv).mockImplementation(async (_cat, key) => {
        if (key === "webhook_signature_key") return "test-secret-key";
        if (key === "access_token") return "sq-token";
        if (key === "env") return "sandbox";
        return "";
      });

      // SQUARE_WEBHOOK_NOTIFICATION_URL を設定
      process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = "http://localhost:3000/api/square/webhook";

      const body = { type: "payment.created", data: {} };
      const req = createWebhookRequest(body, {
        "x-square-hmacsha1-signature": "invalid-signature",
      });

      const res = await POST(req);
      expect(res.status).toBe(401);

      delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
    });

    it("署名キーがなければ検証スキップ（段階導入）", async () => {
      vi.mocked(getSettingOrEnv).mockResolvedValue("");

      const body = { type: "unknown.event", data: {} };
      const req = createWebhookRequest(body);

      const res = await POST(req);
      // 不明イベントでも200を返す（Square停止回避）
      expect(res.status).toBe(200);
    });

    it("署名キーあり＆署名ヘッダなしでも暫定的に通す", async () => {
      vi.mocked(getSettingOrEnv).mockImplementation(async (_cat, key) => {
        if (key === "webhook_signature_key") return "test-secret-key";
        return "";
      });

      const body = { type: "unknown.event", data: {} };
      const req = createWebhookRequest(body);

      const res = await POST(req);
      // ヘッダ無しは暫定的に通過
      expect(res.status).toBe(200);
    });
  });

  // --- 返金イベント ---
  describe("返金イベント (refund.created / refund.updated)", () => {
    it("refund.created でordersテーブルに返金情報を反映", async () => {
      const ordersChain = createChain({ data: null, error: null });
      setTableChain("orders", ordersChain);

      const body = {
        type: "refund.created",
        data: {
          object: {
            refund: {
              payment_id: "pay-123",
              status: "COMPLETED",
              amount_money: { amount: 5000 },
              id: "refund-456",
              created_at: "2026-02-23T10:00:00Z",
            },
          },
        },
      };

      // Square API でpayment詳細を取得
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          payment: {
            note: "PID:pid-001;Product:MJL_5mg_1m",
          },
        })),
      } as any);

      const req = createWebhookRequest(body);
      const res = await POST(req);

      expect(res.status).toBe(200);
      // ordersテーブルにupdateが呼ばれたことを確認
      expect(ordersChain.update).toHaveBeenCalled();
      // キャッシュ削除が呼ばれたことを確認
      expect(invalidateDashboardCache).toHaveBeenCalledWith("pid-001");
    });

    it("payment_idが空なら何もせず200を返す", async () => {
      const body = {
        type: "refund.created",
        data: {
          object: {
            refund: { payment_id: "" },
          },
        },
      };

      const req = createWebhookRequest(body);
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // --- 決済イベント ---
  describe("決済イベント (payment.created / payment.updated)", () => {
    it("COMPLETED の支払いで新規注文をINSERT", async () => {
      const ordersChain = createChain({ data: null, error: null });
      setTableChain("orders", ordersChain);

      // Square API: payment 詳細
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({
            payment: {
              id: "pay-001",
              note: "PID:pid-001;Product:MJL_5mg_1m",
              created_at: "2026-02-23T10:00:00Z",
              amount_money: { amount: 15000 },
              order_id: "order-001",
              customer_id: "cust-001",
            },
          })),
        } as any)
        // Square API: order 詳細
        .mockResolvedValueOnce({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({
            orders: [{
              line_items: [{ name: "マジンドール 5mg 1ヶ月", quantity: "1" }],
              fulfillments: [{
                shipment_details: {
                  recipient: {
                    display_name: "山田太郎",
                    phone_number: "09012345678",
                    address: {
                      postal_code: "1000001",
                      administrative_district_level_1: "東京都",
                      locality: "千代田区",
                      address_line_1: "千代田1-1",
                    },
                  },
                },
              }],
            }],
          })),
        } as any);

      const body = {
        type: "payment.created",
        data: {
          object: {
            payment: {
              id: "pay-001",
              status: "COMPLETED",
            },
          },
        },
      };

      const req = createWebhookRequest(body);
      const res = await POST(req);

      expect(res.status).toBe(200);
      // ordersテーブルにinsertが呼ばれたことを確認（新規注文）
      expect(ordersChain.insert).toHaveBeenCalled();
      // キャッシュ削除が呼ばれた
      expect(invalidateDashboardCache).toHaveBeenCalledWith("pid-001");
    });

    it("COMPLETED 以外のstatusは無視して200を返す", async () => {
      const body = {
        type: "payment.created",
        data: {
          object: {
            payment: { id: "pay-002", status: "PENDING" },
          },
        },
      };

      const req = createWebhookRequest(body);
      const res = await POST(req);

      expect(res.status).toBe(200);
      // fetchが呼ばれないこと（詳細取得をスキップ）
      expect(fetch).not.toHaveBeenCalled();
    });

    it("payment_idが空なら何もせず200", async () => {
      const body = {
        type: "payment.created",
        data: {
          object: {
            payment: { id: "", status: "COMPLETED" },
          },
        },
      };

      const req = createWebhookRequest(body);
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("再処方注文（Reorder付き）でmarkReorderPaid + カルテ自動作成", async () => {
      const reordersChain = createChain({ data: [{ id: 42 }], error: null });
      const ordersChain = createChain({ data: null, error: null });
      setTableChain("reorders", reordersChain);
      setTableChain("orders", ordersChain);

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({
            payment: {
              id: "pay-reorder",
              note: "PID:pid-001;Product:MJL_10mg_3m;Reorder:42",
              created_at: "2026-02-23T10:00:00Z",
              amount_money: { amount: 45000 },
            },
          })),
        } as any);

      const body = {
        type: "payment.created",
        data: {
          object: {
            payment: { id: "pay-reorder", status: "COMPLETED" },
          },
        },
      };

      const req = createWebhookRequest(body);
      const res = await POST(req);

      expect(res.status).toBe(200);
      // reordersテーブルの更新が呼ばれた
      expect(reordersChain.update).toHaveBeenCalled();
      // カルテ自動作成が呼ばれた
      // productCode正規表現 [^\s(]+ はセミコロンも含む
      expect(createReorderPaymentKarte).toHaveBeenCalledWith(
        "pid-001", expect.stringContaining("MJL_10mg_3m"), expect.any(String), undefined, "test-tenant"
      );
    });

    it("既存注文がある場合はUPDATE（shipping情報を保持）", async () => {
      // 既存注文にtracking_numberがある場合
      const ordersChain = createChain({
        data: { id: "pay-exist", tracking_number: "JP123456", shipping_date: "2026-02-20", shipping_status: "shipped" },
        error: null,
      });
      setTableChain("orders", ordersChain);

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({
            payment: {
              id: "pay-exist",
              note: "PID:pid-001;Product:MJL_5mg_1m",
              created_at: "2026-02-23T10:00:00Z",
              amount_money: { amount: 15000 },
            },
          })),
        } as any);

      const body = {
        type: "payment.updated",
        data: {
          object: {
            payment: { id: "pay-exist", status: "COMPLETED" },
          },
        },
      };

      const req = createWebhookRequest(body);
      const res = await POST(req);

      expect(res.status).toBe(200);
      // updateが呼ばれた（insertではなくupdate）
      expect(ordersChain.update).toHaveBeenCalled();
    });
  });

  // --- 不明イベント ---
  describe("不明イベント", () => {
    it("catalog.updated などの不明イベントは200で無視", async () => {
      const body = { type: "catalog.updated", data: {} };
      const req = createWebhookRequest(body);
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // --- エラーハンドリング ---
  describe("エラーハンドリング", () => {
    it("不正なJSONでもSquareに200を返す（停止回避）", async () => {
      const req = new Request("http://localhost:3000/api/square/webhook", {
        method: "POST",
        body: "not-json{{{",
      });

      const res = await POST(req);
      // 不正JSONでもSquareには200で応答
      expect(res.status).toBe(200);
    });
  });
});
