// lib/__tests__/point-auto-grant.test.ts — ポイント自動付与ロジックのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockGrantPoints = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@/lib/points", () => ({
  grantPoints: (...args: unknown[]) => mockGrantPoints(...args),
}));

const { processAutoGrant } = await import("@/lib/point-auto-grant");

/* ---------- ヘルパー ---------- */

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = [
    "from", "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
    "like", "ilike", "contains", "containedBy", "filter", "or",
    "order", "limit", "range", "single", "maybeSingle", "match",
    "textSearch", "csv", "rpc", "count", "head",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) =>
    resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

const TENANT = "tenant-001";
const PATIENT = "patient-001";
const ORDER = "order-001";

/* ---------- テスト ---------- */

describe("processAutoGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGrantPoints.mockResolvedValue({});
  });

  it("必須パラメータが不足している場合0を返す", async () => {
    expect(await processAutoGrant("", PATIENT, ORDER, 1000)).toBe(0);
    expect(await processAutoGrant(TENANT, "", ORDER, 1000)).toBe(0);
    expect(await processAutoGrant(TENANT, PATIENT, "", 1000)).toBe(0);
  });

  it("有効なルールが無い場合0を返す", async () => {
    mockFrom.mockReturnValue(createMockChain([]));
    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 1000);
    expect(result).toBe(0);
    expect(mockGrantPoints).not.toHaveBeenCalled();
  });

  it("per_purchase: 購入金額の割合でポイントを付与する", async () => {
    const rule = {
      id: "rule-1",
      name: "1%還元",
      trigger_type: "per_purchase",
      points_amount: 0,
      trigger_config: { rate: 0.01 },
      is_active: true,
    };

    // 呼び出し順: rules取得 → 重複チェック → ログinsert
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain([rule]); // ルール取得
      if (callCount === 2) return createMockChain(null);   // 重複チェック（なし）
      return createMockChain(null);                         // ログinsert
    });

    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 10000);
    expect(result).toBe(100); // 10000 * 0.01
    expect(mockGrantPoints).toHaveBeenCalledWith(
      TENANT, PATIENT, 100, "自動付与: 1%還元", "order", ORDER,
    );
  });

  it("per_purchase: rateが0以下の場合は付与しない", async () => {
    const rule = {
      id: "rule-bad",
      name: "レート無効",
      trigger_type: "per_purchase",
      points_amount: 0,
      trigger_config: { rate: 0 },
      is_active: true,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain([rule]);
      return createMockChain(null);
    });

    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 5000);
    expect(result).toBe(0);
    expect(mockGrantPoints).not.toHaveBeenCalled();
  });

  it("first_purchase: 初回購入時に固定ポイントを付与する", async () => {
    const rule = {
      id: "rule-2",
      name: "初回500pt",
      trigger_type: "first_purchase",
      points_amount: 500,
      trigger_config: {},
      is_active: true,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain([rule]); // ルール取得
      if (callCount === 2) return createMockChain(null);   // 重複チェック（なし）
      if (callCount === 3) return createMockChain([]);      // 過去ログなし（初回）
      return createMockChain(null);                         // ログinsert
    });

    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 3000);
    expect(result).toBe(500);
    expect(mockGrantPoints).toHaveBeenCalledWith(
      TENANT, PATIENT, 500, "自動付与: 初回500pt", "order", ORDER,
    );
  });

  it("first_purchase: 2回目以降は付与しない", async () => {
    const rule = {
      id: "rule-2",
      name: "初回500pt",
      trigger_type: "first_purchase",
      points_amount: 500,
      trigger_config: {},
      is_active: true,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain([rule]);         // ルール取得
      if (callCount === 2) return createMockChain(null);           // 重複チェック（なし）
      return createMockChain([{ id: "log-existing" }]);            // 過去ログあり
    });

    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 3000);
    expect(result).toBe(0);
    expect(mockGrantPoints).not.toHaveBeenCalled();
  });

  it("amount_threshold: 閾値以上で固定ポイントを付与する", async () => {
    const rule = {
      id: "rule-3",
      name: "5000円以上で200pt",
      trigger_type: "amount_threshold",
      points_amount: 200,
      trigger_config: { min_amount: 5000 },
      is_active: true,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain([rule]);
      if (callCount === 2) return createMockChain(null);
      return createMockChain(null);
    });

    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 6000);
    expect(result).toBe(200);
    expect(mockGrantPoints).toHaveBeenCalled();
  });

  it("amount_threshold: 閾値未満の場合は付与しない", async () => {
    const rule = {
      id: "rule-3",
      name: "5000円以上で200pt",
      trigger_type: "amount_threshold",
      points_amount: 200,
      trigger_config: { min_amount: 5000 },
      is_active: true,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain([rule]);
      if (callCount === 2) return createMockChain(null);
      return createMockChain(null);
    });

    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 3000);
    expect(result).toBe(0);
    expect(mockGrantPoints).not.toHaveBeenCalled();
  });

  it("重複付与を防止する（既にログがある場合）", async () => {
    const rule = {
      id: "rule-1",
      name: "1%還元",
      trigger_type: "per_purchase",
      points_amount: 0,
      trigger_config: { rate: 0.01 },
      is_active: true,
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain([rule]);
      // 重複チェックで既存ログが見つかる
      return createMockChain({ id: "existing-log" });
    });

    const result = await processAutoGrant(TENANT, PATIENT, ORDER, 10000);
    expect(result).toBe(0);
    expect(mockGrantPoints).not.toHaveBeenCalled();
  });
});
