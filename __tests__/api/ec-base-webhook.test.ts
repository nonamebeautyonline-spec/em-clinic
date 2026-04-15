// __tests__/api/ec-base-webhook.test.ts
// BASE Webhook（app/api/ec/base/webhook/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

vi.mock("@/lib/ec-integrations/base", () => ({
  baseAdapter: {
    parseOrder: vi.fn((payload: Record<string, unknown>) => ({
      externalId: (payload.order_id as string) || "BASE-001",
      email: (payload.email as string) || undefined,
      phone: (payload.phone as string) || undefined,
      lineItems: (payload.items as Array<Record<string, unknown>> || []).map((i) => ({
        name: (i.name as string) || "商品",
        quantity: (i.quantity as number) || 1,
        price: (i.price as number) || 0,
      })),
      trackingUrl: (payload.tracking_url as string) || undefined,
    })),
  },
}));

// Supabase モック
const mockFromFn = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFromFn(...args),
  },
}));

import { pushMessage } from "@/lib/line-push";

const { POST } = await import("@/app/api/ec/base/webhook/route");

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

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/ec/base/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト: ec_integrations に1つのBASE連携
  mockFromFn.mockImplementation((table: string) => {
    if (table === "ec_integrations") {
      return createChain({
        data: [{ tenant_id: "test-tenant", shop_domain: "base-shop-1", settings: {} }],
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

describe("POST /api/ec/base/webhook", () => {
  it("不正なJSONの場合400を返す", async () => {
    const req = new NextRequest("http://localhost/api/ec/base/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("JSONパース");
  });

  it("テナントを特定できない場合404を返す", async () => {
    mockFromFn.mockImplementation((table: string) => {
      if (table === "ec_integrations") {
        return createChain({ data: [], error: null });
      }
      return createChain({ data: null, error: null });
    });

    const res = await POST(makeRequest({ event_type: "order.created", email: "test@example.com" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("テナントを特定できません");
  });

  it("order.created: 正常系 — カゴ落ち回収済みマーク", async () => {
    const res = await POST(makeRequest({
      event_type: "order.created",
      email: "test@example.com",
      order_id: "BASE-001",
      items: [{ name: "商品A", quantity: 1, price: 3000 }],
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it("order.shipped: LINE発送通知を送信", async () => {
    const res = await POST(makeRequest({
      event_type: "order.shipped",
      email: "test@example.com",
      order_id: "BASE-002",
      tracking_number: "1234567890",
      delivery_company: "ヤマト運輸",
      tracking_url: "https://track.example.com/1234567890",
      items: [{ name: "テスト商品", quantity: 1, price: 5000 }],
    }));
    expect(res.status).toBe(200);
    expect(vi.mocked(pushMessage)).toHaveBeenCalled();
  });

  it("order.shipped: 患者にline_idがない場合はLINE通知をスキップ", async () => {
    mockFromFn.mockImplementation((table: string) => {
      if (table === "ec_integrations") {
        return createChain({
          data: [{ tenant_id: "test-tenant", shop_domain: "base-shop-1", settings: {} }],
          error: null,
        });
      }
      if (table === "patients") {
        return createChain({
          data: { id: 1, line_id: null },
          error: null,
        });
      }
      return createChain({ data: null, error: null });
    });

    const res = await POST(makeRequest({
      event_type: "order.shipped",
      email: "test@example.com",
      items: [],
    }));
    expect(res.status).toBe(200);
    expect(vi.mocked(pushMessage)).not.toHaveBeenCalled();
  });

  it("未対応イベントでも200を返す", async () => {
    const res = await POST(makeRequest({
      event_type: "product.updated",
    }));
    expect(res.status).toBe(200);
  });

  it("shop_idでテナントマッチング", async () => {
    mockFromFn.mockImplementation((table: string) => {
      if (table === "ec_integrations") {
        return createChain({
          data: [
            { tenant_id: "tenant-a", shop_domain: "shop-a", settings: { shop_id: "base-123" } },
            { tenant_id: "tenant-b", shop_domain: "shop-b", settings: {} },
          ],
          error: null,
        });
      }
      return createChain({ data: null, error: null });
    });

    const res = await POST(makeRequest({
      event_type: "order.created",
      shop_id: "base-123",
      email: "test@example.com",
    }));
    expect(res.status).toBe(200);
  });

  it("内部エラー発生時500を返す", async () => {
    mockFromFn.mockImplementation((table: string) => {
      if (table === "ec_integrations") {
        return createChain({
          data: [{ tenant_id: "test-tenant", shop_domain: "base-shop-1", settings: {} }],
          error: null,
        });
      }
      throw new Error("DB error");
    });

    const res = await POST(makeRequest({
      event_type: "order.created",
      email: "test@example.com",
    }));
    expect(res.status).toBe(500);
  });
});
