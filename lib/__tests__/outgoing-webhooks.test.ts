// lib/__tests__/outgoing-webhooks.test.ts — アウトゴーイングWebhookテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["select", "insert", "update", "delete", "eq", "neq", "is", "not",
   "order", "limit", "single", "maybeSingle"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
}));

// fetchモック
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

import { fireOutgoingWebhooks, getOutgoingWebhooks } from "../outgoing-webhooks";

describe("fireOutgoingWebhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("tenantId がない場合はスキップ", async () => {
    await fireOutgoingWebhooks("follow", { patientId: "p1" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("アクティブなWebhookがない場合はスキップ", async () => {
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    await fireOutgoingWebhooks("follow", { tenantId: "t1", patientId: "p1" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("data=null の場合はスキップ", async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));

    await fireOutgoingWebhooks("follow", { tenantId: "t1", patientId: "p1" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("マッチするイベントタイプのWebhookにPOST送信する", async () => {
    const webhooks = [{
      id: "w1",
      name: "テストHook",
      url: "https://example.com/hook",
      event_types: ["follow"],
      secret: null,
      is_active: true,
      tenant_id: "t1",
    }];
    mockFrom.mockReturnValue(createChain({ data: webhooks, error: null }));

    await fireOutgoingWebhooks("follow", { tenantId: "t1", patientId: "p1" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("ワイルドカード(*) のWebhookはすべてのイベントにマッチする", async () => {
    const webhooks = [{
      id: "w2",
      name: "全イベントHook",
      url: "https://example.com/all",
      event_types: ["*"],
      secret: null,
      is_active: true,
      tenant_id: "t1",
    }];
    mockFrom.mockReturnValue(createChain({ data: webhooks, error: null }));

    await fireOutgoingWebhooks("payment_completed", { tenantId: "t1", patientId: "p1" });
    expect(mockFetch).toHaveBeenCalled();
  });

  it("イベントタイプが一致しないWebhookはスキップ", async () => {
    const webhooks = [{
      id: "w3",
      name: "予約専用Hook",
      url: "https://example.com/reserve",
      event_types: ["reservation_made"],
      secret: null,
      is_active: true,
      tenant_id: "t1",
    }];
    mockFrom.mockReturnValue(createChain({ data: webhooks, error: null }));

    await fireOutgoingWebhooks("follow", { tenantId: "t1", patientId: "p1" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("secret付きWebhookはX-Webhook-Signatureヘッダーを付与する", async () => {
    const webhooks = [{
      id: "w4",
      name: "署名付きHook",
      url: "https://example.com/signed",
      event_types: ["follow"],
      secret: "my-secret-key",
      is_active: true,
      tenant_id: "t1",
    }];
    mockFrom.mockReturnValue(createChain({ data: webhooks, error: null }));

    await fireOutgoingWebhooks("follow", { tenantId: "t1", patientId: "p1" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/signed",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Webhook-Signature": expect.any(String),
        }),
      }),
    );
  });

  it("fetch失敗してもエラーが伝播しない（fire-and-forget）", async () => {
    const webhooks = [{
      id: "w5",
      name: "失敗Hook",
      url: "https://example.com/fail",
      event_types: ["follow"],
      secret: null,
      is_active: true,
      tenant_id: "t1",
    }];
    mockFrom.mockReturnValue(createChain({ data: webhooks, error: null }));
    mockFetch.mockRejectedValue(new Error("Network error"));

    // エラーが投げられないことを確認
    await expect(
      fireOutgoingWebhooks("follow", { tenantId: "t1", patientId: "p1" }),
    ).resolves.toBeUndefined();
  });
});

describe("getOutgoingWebhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Webhook一覧を返す", async () => {
    const webhooks = [{
      id: "w1",
      name: "Hook1",
      url: "https://example.com",
      event_types: ["follow"],
      secret: null,
      is_active: true,
    }];
    mockFrom.mockReturnValue(createChain({ data: webhooks, error: null }));

    const result = await getOutgoingWebhooks("t1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Hook1");
  });

  it("data=null の場合は空配列", async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const result = await getOutgoingWebhooks("t1");
    expect(result).toEqual([]);
  });

  it("event_types が文字列の場合はパースされる", async () => {
    const webhooks = [{
      id: "w1",
      name: "Hook1",
      url: "https://example.com",
      event_types: JSON.stringify(["follow", "payment_completed"]),
      secret: null,
      is_active: true,
    }];
    mockFrom.mockReturnValue(createChain({ data: webhooks, error: null }));

    const result = await getOutgoingWebhooks("t1");
    expect(result[0].event_types).toEqual(["follow", "payment_completed"]);
  });
});
