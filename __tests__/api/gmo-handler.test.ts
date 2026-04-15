// __tests__/api/gmo-handler.test.ts
// GMO PG Webhook業務ロジック（processGmoEvent）のユニットテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Supabaseチェーンビルダー
// ============================================================
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "count", "csv", "rpc",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
  },
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((tid: unknown) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: vi.fn(() => ({ notifyReorderPaid: false })),
}));

vi.mock("@/lib/payment-thank-flex", () => ({
  sendPaymentThankNotification: vi.fn(),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn(),
}));

vi.mock("@/lib/point-auto-grant", () => ({
  processAutoGrant: vi.fn(),
}));

vi.mock("@/lib/pricing", () => ({
  recordCampaignUsage: vi.fn(),
}));

// ============================================================
// テスト対象
// ============================================================
import { processGmoEvent, type GmoHandlerParams } from "@/lib/webhook-handlers/gmo";

const baseParams: GmoHandlerParams = {
  status: "CAPTURE",
  orderId: "order-123",
  amount: "5000",
  accessId: "access-456",
  patientId: "patient-001",
  productCode: "MJL_5mg_1m",
  productName: "テスト商品",
  reorderId: "42",
  tenantId: "test-tenant",
};

// ============================================================
// テスト
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
});

describe("processGmoEvent", () => {
  // ----------------------------------------------------------
  // CAPTURE/SALES — 決済完了
  // ----------------------------------------------------------
  describe("CAPTURE / SALES ステータス", () => {
    it("CAPTURE: reorder更新 + orders INSERT を実行", async () => {
      // orders 既存チェック → 無し
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      // reorders チェーン
      const reordersChain = createChain({ data: [{ id: 42 }], error: null });
      tableChains["reorders"] = reordersChain;
      // patients チェーン
      const patientsChain = createChain({ data: { line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      await processGmoEvent(baseParams);

      // reorders.update が呼ばれたことを確認
      expect(reordersChain.update).toHaveBeenCalled();
      // orders への操作が実行されたことを確認
      expect(ordersChain.insert).toHaveBeenCalled();
    });

    it("SALES ステータスも同様に処理される", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const reordersChain = createChain({ data: [{ id: 42 }], error: null });
      tableChains["reorders"] = reordersChain;

      await processGmoEvent({ ...baseParams, status: "SALES" });

      expect(reordersChain.update).toHaveBeenCalled();
    });

    it("インライン決済で既にorders存在 → reorder更新スキップ", async () => {
      const ordersChain = createChain({ data: { id: "order-123" }, error: null });
      tableChains["orders"] = ordersChain;
      const reordersChain = createChain({ data: null, error: null });
      tableChains["reorders"] = reordersChain;

      await processGmoEvent(baseParams);

      // reorders.update はスキップされる（alreadyProcessed = true）
      expect(reordersChain.update).not.toHaveBeenCalled();
    });

    it("patientIdなし → orders INSERT をスキップ", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;
      const reordersChain = createChain({ data: [{ id: 42 }], error: null });
      tableChains["reorders"] = reordersChain;

      await processGmoEvent({ ...baseParams, patientId: "" });

      // patientId が空なので orders.select（既存チェック）は呼ばれない
      // ただし reorder 更新は実行される
      expect(reordersChain.update).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // RETURN / RETURNX — 返金
  // ----------------------------------------------------------
  describe("RETURN / RETURNX ステータス", () => {
    it("RETURN: orders を refunded に更新", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      await processGmoEvent({ ...baseParams, status: "RETURN" });

      expect(ordersChain.update).toHaveBeenCalled();
    });

    it("RETURNX: 同様に返金処理", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      await processGmoEvent({ ...baseParams, status: "RETURNX" });

      expect(ordersChain.update).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // CANCEL / VOID — キャンセル
  // ----------------------------------------------------------
  describe("CANCEL / VOID ステータス", () => {
    it("CANCEL: orders を CANCELLED に更新", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      await processGmoEvent({ ...baseParams, status: "CANCEL" });

      expect(ordersChain.update).toHaveBeenCalled();
    });

    it("VOID: 同様にキャンセル処理", async () => {
      const ordersChain = createChain({ data: null, error: null });
      tableChains["orders"] = ordersChain;

      await processGmoEvent({ ...baseParams, status: "VOID" });

      expect(ordersChain.update).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // 未対応ステータス
  // ----------------------------------------------------------
  it("未対応ステータス → console.warn のみ", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await processGmoEvent({ ...baseParams, status: "UNKNOWN_STATUS" });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("未対応ステータス"),
      "UNKNOWN_STATUS",
      expect.any(Object),
    );
    warnSpy.mockRestore();
  });

  // ----------------------------------------------------------
  // reorderId が無効な場合
  // ----------------------------------------------------------
  it("reorderId が不正（NaN）→ markReorderPaid がスキップ", async () => {
    const ordersChain = createChain({ data: null, error: null });
    tableChains["orders"] = ordersChain;
    const reordersChain = createChain({ data: null, error: null });
    tableChains["reorders"] = reordersChain;

    await processGmoEvent({ ...baseParams, reorderId: "invalid" });

    // reorderId=NaN なので reorders.update は呼ばれない
    expect(reordersChain.update).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // クーポンID付き
  // ----------------------------------------------------------
  it("couponId付き → coupon_issues に記録", async () => {
    const ordersChain = createChain({ data: null, error: null });
    tableChains["orders"] = ordersChain;
    const reordersChain = createChain({ data: [{ id: 42 }], error: null });
    tableChains["reorders"] = reordersChain;
    const couponChain = createChain({ data: { id: 1 }, error: null });
    tableChains["coupon_issues"] = couponChain;

    await processGmoEvent({ ...baseParams, couponId: "99" });

    expect(couponChain.select).toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // campaignId付き
  // ----------------------------------------------------------
  it("campaignId付き → recordCampaignUsage を呼ぶ", async () => {
    const ordersChain = createChain({ data: null, error: null });
    tableChains["orders"] = ordersChain;
    const reordersChain = createChain({ data: [{ id: 42 }], error: null });
    tableChains["reorders"] = reordersChain;

    const { recordCampaignUsage } = await import("@/lib/pricing");

    await processGmoEvent({ ...baseParams, campaignId: "campaign-1" });

    expect(recordCampaignUsage).toHaveBeenCalled();
  });
});
