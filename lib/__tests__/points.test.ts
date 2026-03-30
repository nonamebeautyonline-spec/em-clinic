// lib/__tests__/points.test.ts — ポイント残高/付与/消費/履歴/設定のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

const { getBalance, grantPoints, usePoints, getHistory, getPointSettings } =
  await import("@/lib/points");

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

/* ---------- getBalance ---------- */

describe("getBalance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("残高レコードが存在する場合、balance_afterを返す", async () => {
    mockFrom.mockReturnValue(
      createMockChain({ balance_after: 500 }),
    );
    const result = await getBalance(TENANT, PATIENT);
    expect(result).toBe(500);
  });

  it("残高レコードが無い場合、0を返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null));
    const result = await getBalance(TENANT, PATIENT);
    expect(result).toBe(0);
  });

  it("DBエラー時に例外をスローする", async () => {
    mockFrom.mockReturnValue(
      createMockChain(null, { message: "db error" }),
    );
    await expect(getBalance(TENANT, PATIENT)).rejects.toThrow(
      "ポイント残高の取得に失敗しました",
    );
  });
});

/* ---------- grantPoints ---------- */

describe("grantPoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常にポイントを付与してエントリを返す", async () => {
    const entry = {
      id: "ledger-1",
      tenant_id: TENANT,
      patient_id: PATIENT,
      amount: 100,
      balance_after: 600,
      reason: "購入特典",
      reference_type: "order",
      reference_id: "order-1",
    };

    // 1回目: getBalance用（既存残高500）, 2回目: insert用
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain({ balance_after: 500 });
      return createMockChain(entry);
    });

    const result = await grantPoints(TENANT, PATIENT, 100, "購入特典", "order", "order-1");
    expect(result.amount).toBe(100);
    expect(result.balance_after).toBe(600);
  });

  it("付与ポイントが0以下の場合エラーをスローする", async () => {
    await expect(
      grantPoints(TENANT, PATIENT, 0, "テスト", "manual"),
    ).rejects.toThrow("付与ポイントは正の整数である必要があります");

    await expect(
      grantPoints(TENANT, PATIENT, -10, "テスト", "manual"),
    ).rejects.toThrow("付与ポイントは正の整数である必要があります");
  });

  it("DB INSERT失敗時にエラーをスローする", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain({ balance_after: 100 });
      return createMockChain(null, { message: "insert failed" });
    });

    await expect(
      grantPoints(TENANT, PATIENT, 50, "テスト", "manual"),
    ).rejects.toThrow("ポイント付与に失敗しました");
  });
});

/* ---------- usePoints ---------- */

describe("usePoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("残高十分な場合にポイントを消費してエントリを返す", async () => {
    const entry = {
      id: "ledger-2",
      tenant_id: TENANT,
      patient_id: PATIENT,
      amount: -200,
      balance_after: 300,
      reason: "注文利用",
      reference_type: "order",
      reference_id: "order-2",
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain({ balance_after: 500 });
      return createMockChain(entry);
    });

    const result = await usePoints(TENANT, PATIENT, 200, "注文利用", "order", "order-2");
    expect(result.amount).toBe(-200);
    expect(result.balance_after).toBe(300);
  });

  it("残高不足の場合エラーをスローする", async () => {
    mockFrom.mockReturnValue(createMockChain({ balance_after: 50 }));

    await expect(
      usePoints(TENANT, PATIENT, 100, "注文利用", "order"),
    ).rejects.toThrow("ポイント残高不足です（現在: 50pt, 必要: 100pt）");
  });

  it("利用ポイントが0以下の場合エラーをスローする", async () => {
    await expect(
      usePoints(TENANT, PATIENT, 0, "テスト", "manual"),
    ).rejects.toThrow("利用ポイントは正の整数である必要があります");
  });
});

/* ---------- getHistory ---------- */

describe("getHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("履歴レコードの配列を返す", async () => {
    const entries = [
      { id: "l1", amount: 100, balance_after: 100 },
      { id: "l2", amount: -50, balance_after: 50 },
    ];
    mockFrom.mockReturnValue(createMockChain(entries));

    const result = await getHistory(TENANT, PATIENT);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("l1");
  });

  it("レコードが無い場合は空配列を返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null));
    const result = await getHistory(TENANT, PATIENT);
    expect(result).toEqual([]);
  });

  it("DBエラー時に例外をスローする", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));
    await expect(getHistory(TENANT, PATIENT)).rejects.toThrow(
      "ポイント履歴の取得に失敗しました",
    );
  });
});

/* ---------- getPointSettings ---------- */

describe("getPointSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("設定レコードが存在する場合そのまま返す", async () => {
    const settings = {
      id: "s1",
      tenant_id: TENANT,
      points_per_yen: 2,
      expiry_months: 6,
      is_active: true,
    };
    mockFrom.mockReturnValue(createMockChain(settings));
    const result = await getPointSettings(TENANT);
    expect(result.points_per_yen).toBe(2);
    expect(result.expiry_months).toBe(6);
  });

  it("設定が無い場合デフォルト値を返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null));
    const result = await getPointSettings(TENANT);
    expect(result.points_per_yen).toBe(1);
    expect(result.expiry_months).toBe(12);
    expect(result.is_active).toBe(true);
  });
});
