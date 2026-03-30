// lib/__tests__/webhook-replay.test.ts
// Webhookリプレイ機能のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockProcessSquareEvent = vi.fn().mockResolvedValue(undefined);
const mockProcessGmoEvent = vi.fn().mockResolvedValue(undefined);
const mockProcessStripeEvent = vi.fn().mockResolvedValue(undefined);
const mockGetActiveSquareAccount = vi.fn().mockResolvedValue({
  accessToken: "sq-token",
  env: "sandbox",
});

vi.mock("@/lib/webhook-handlers/square", () => ({
  processSquareEvent: (...args: unknown[]) => mockProcessSquareEvent(...args),
}));

vi.mock("@/lib/webhook-handlers/gmo", () => ({
  processGmoEvent: (...args: unknown[]) => mockProcessGmoEvent(...args),
}));

vi.mock("@/lib/webhook-handlers/stripe", () => ({
  processStripeEvent: (...args: unknown[]) => mockProcessStripeEvent(...args),
}));

vi.mock("@/lib/square-account-server", () => ({
  getActiveSquareAccount: (...args: unknown[]) => mockGetActiveSquareAccount(...args),
}));

const { replayWebhookEvent } = await import("@/lib/webhook-replay");

/* ---------- ヘルパー ---------- */

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte", "like", "ilike", "contains", "containedBy", "filter", "or", "order", "limit", "range", "single", "maybeSingle", "match", "textSearch", "csv", "rpc", "count", "head"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    tenant_id: "tenant-001",
    event_source: "square",
    event_id: "evt-001",
    status: "failed",
    payload: { type: "payment.completed" },
    original_payload: { type: "payment.completed", data: {} },
    error_message: "タイムアウト",
    retry_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    last_retried_at: null,
    ...overrides,
  };
}

/* ---------- テスト ---------- */

describe("webhook-replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントが見つからない場合はエラーを返す", async () => {
    mockFrom.mockImplementation(() =>
      createMockChain(null, { message: "not found" })
    );

    const result = await replayWebhookEvent(999, null);
    expect(result.success).toBe(false);
    expect(result.error).toBe("イベントが見つかりません");
  });

  it("statusがfailed以外の場合はリプレイ不可", async () => {
    mockFrom.mockImplementation(() =>
      createMockChain(makeEvent({ status: "completed" }))
    );

    const result = await replayWebhookEvent(1, "tenant-001");
    expect(result.success).toBe(false);
    expect(result.error).toContain("failed ではありません");
  });

  it("ペイロードがない場合はリプレイ不可", async () => {
    mockFrom.mockImplementation(() =>
      createMockChain(makeEvent({ original_payload: null, payload: null }))
    );

    const result = await replayWebhookEvent(1, "tenant-001");
    expect(result.success).toBe(false);
    expect(result.error).toBe("リプレイ用ペイロードがありません");
  });

  it("squareイベントを正常にリプレイできる", async () => {
    mockFrom.mockImplementation(() =>
      createMockChain(makeEvent({ event_source: "square" }))
    );

    const result = await replayWebhookEvent(1, "tenant-001");
    expect(result.success).toBe(true);
    expect(mockProcessSquareEvent).toHaveBeenCalledTimes(1);
    expect(mockGetActiveSquareAccount).toHaveBeenCalled();
  });

  it("gmoイベントを正常にリプレイできる", async () => {
    const gmoPayload = {
      status: "CAPTURE",
      orderId: "ord-001",
      amount: "1000",
      accessId: "acc-001",
      patientId: "p-001",
      productCode: "PC001",
      productName: "テスト商品",
      reorderId: "",
    };
    mockFrom.mockImplementation(() =>
      createMockChain(makeEvent({ event_source: "gmo", original_payload: gmoPayload }))
    );

    const result = await replayWebhookEvent(1, "tenant-001");
    expect(result.success).toBe(true);
    expect(mockProcessGmoEvent).toHaveBeenCalledTimes(1);
  });

  it("stripeイベントを正常にリプレイできる", async () => {
    mockFrom.mockImplementation(() =>
      createMockChain(makeEvent({ event_source: "stripe", original_payload: { type: "checkout.session.completed" } }))
    );

    const result = await replayWebhookEvent(1, "tenant-001");
    expect(result.success).toBe(true);
    expect(mockProcessStripeEvent).toHaveBeenCalledTimes(1);
  });

  it("未対応のevent_sourceはエラーを返す", async () => {
    mockFrom.mockImplementation(() =>
      createMockChain(makeEvent({ event_source: "unknown_provider" }))
    );

    const result = await replayWebhookEvent(1, "tenant-001");
    expect(result.success).toBe(false);
    expect(result.error).toContain("未対応のevent_source");
  });

  it("ハンドラがエラーをスローした場合はfailedに更新する", async () => {
    mockFrom.mockImplementation(() =>
      createMockChain(makeEvent({ event_source: "square" }))
    );
    mockProcessSquareEvent.mockRejectedValueOnce(new Error("処理失敗"));

    const result = await replayWebhookEvent(1, "tenant-001");
    expect(result.success).toBe(false);
    expect(result.error).toBe("処理失敗");
  });
});
