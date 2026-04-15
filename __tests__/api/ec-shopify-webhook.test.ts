// __tests__/api/ec-shopify-webhook.test.ts
// Shopify Webhook（app/api/ec/shopify/webhook/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

// === モック設定 ===
vi.mock("@/lib/tenant", () => ({
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/shipping-notify-flex", () => ({
  buildShippingNotifyMessage: vi.fn().mockReturnValue({ type: "flex", altText: "発送通知" }),
}));

// Supabase モック
const mockFromFn = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFromFn(...args),
  },
}));

import { pushMessage } from "@/lib/line-push";

const { POST } = await import("@/app/api/ec/shopify/webhook/route");

// chain ヘルパー
function createChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "not", "is", "in",
    "order", "limit", "single", "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  chain.maybeSingle = vi.fn().mockReturnValue({
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return chain;
}

const webhookSecret = "test-webhook-secret";
const shopDomain = "test-shop.myshopify.com";

function makeHmac(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

function makeRequest(
  body: Record<string, unknown>,
  opts: { topic?: string; hmac?: string; domain?: string; skipHeaders?: boolean } = {},
) {
  const bodyStr = JSON.stringify(body);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!opts.skipHeaders) {
    headers["x-shopify-hmac-sha256"] = opts.hmac ?? makeHmac(bodyStr, webhookSecret);
    headers["x-shopify-topic"] = opts.topic ?? "orders/create";
    headers["x-shopify-shop-domain"] = opts.domain ?? shopDomain;
  }
  return new NextRequest("http://localhost/api/ec/shopify/webhook", {
    method: "POST",
    headers,
    body: bodyStr,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト: ec_integrations 取得成功
  mockFromFn.mockImplementation((table: string) => {
    if (table === "ec_integrations") {
      return createChain({
        data: { tenant_id: "test-tenant", webhook_secret: webhookSecret },
        error: null,
      });
    }
    if (table === "patients") {
      return createChain({
        data: { id: 1, line_id: "U_line_001" },
        error: null,
      });
    }
    return createChain({ data: null, error: null });
  });
});

describe("POST /api/ec/shopify/webhook", () => {
  it("必須ヘッダーがない場合400を返す", async () => {
    const req = makeRequest({}, { skipHeaders: true });
    // ヘッダーなしの場合
    const rawReq = new NextRequest("http://localhost/api/ec/shopify/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(rawReq);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("必須ヘッダー");
  });

  it("不明なショップドメインの場合404を返す", async () => {
    mockFromFn.mockImplementation((table: string) => {
      if (table === "ec_integrations") {
        return createChain({ data: null, error: null });
      }
      return createChain({ data: null, error: null });
    });
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(404);
  });

  it("HMAC署名が不正な場合401を返す", async () => {
    const res = await POST(makeRequest(
      { email: "test@example.com" },
      { hmac: "invalid-hmac-signature" },
    ));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("署名検証");
  });

  it("orders/create: 正常系 — カゴ落ち回収済みマーク", async () => {
    const res = await POST(makeRequest(
      { email: "test@example.com" },
      { topic: "orders/create" },
    ));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it("orders/fulfilled: LINE発送通知を送信", async () => {
    const body = {
      email: "test@example.com",
      fulfillments: [{
        tracking_number: "1234567890",
        tracking_url: "https://track.example.com/1234567890",
        tracking_company: "ヤマト運輸",
      }],
      line_items: [{ title: "テスト商品", price: "5000", quantity: 1 }],
      name: "#1001",
    };
    const res = await POST(makeRequest(body, { topic: "orders/fulfilled" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(pushMessage)).toHaveBeenCalled();
  });

  it("checkouts/create: カゴ落ち候補として登録", async () => {
    const body = {
      email: "test@example.com",
      line_items: [
        { title: "商品A", price: "3000", quantity: 2, image: { src: "https://img.example.com/a.jpg" } },
      ],
    };
    const res = await POST(makeRequest(body, { topic: "checkouts/create" }));
    expect(res.status).toBe(200);
  });

  it("未対応トピックでも200を返す", async () => {
    const res = await POST(makeRequest(
      {},
      { topic: "products/update" },
    ));
    expect(res.status).toBe(200);
  });

  it("内部エラー発生時500を返す", async () => {
    mockFromFn.mockImplementation((table: string) => {
      if (table === "ec_integrations") {
        return createChain({
          data: { tenant_id: "test-tenant", webhook_secret: webhookSecret },
          error: null,
        });
      }
      // patientsクエリでエラー
      throw new Error("DB connection failed");
    });
    const res = await POST(makeRequest(
      { email: "test@example.com" },
      { topic: "orders/create" },
    ));
    expect(res.status).toBe(500);
  });
});
