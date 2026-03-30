// lib/__tests__/campaign-audience.test.ts — キャンペーン対象者条件評価のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  strictWithTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@/lib/behavior-filters", () => ({
  getLastPaymentDates: vi.fn(),
  getProductPurchasePatients: vi.fn(),
  getReorderCounts: vi.fn(),
  matchLastPaymentDate: vi.fn(),
  matchBehaviorCondition: vi.fn(),
}));

const { evaluateAudienceCondition } = await import("@/lib/campaign-audience");

// behavior-filtersモックの参照取得
const behaviorFilters = await import("@/lib/behavior-filters");
const {
  getLastPaymentDates,
  getProductPurchasePatients,
  getReorderCounts,
  matchLastPaymentDate,
  matchBehaviorCondition,
} = behaviorFilters as Record<string, ReturnType<typeof vi.fn>>;

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

const TENANT = "test-tenant";
const PATIENT = "patient-001";

/* ---------- evaluateAudienceCondition 全体 ---------- */

describe("evaluateAudienceCondition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ルールが空配列の場合はtrue", async () => {
    const result = await evaluateAudienceCondition(PATIENT, [], TENANT);
    expect(result).toBe(true);
  });

  it("ルールがnull相当の場合はtrue", async () => {
    const result = await evaluateAudienceCondition(PATIENT, undefined as any, TENANT);
    expect(result).toBe(true);
  });
});

/* ---------- タグ条件 ---------- */

describe("タグ条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("any_include — いずれかのタグを持っていればtrue", async () => {
    mockFrom.mockReturnValue(
      createMockChain([{ tag_id: 1 }, { tag_id: 3 }]),
    );

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "tag", tag_ids: [2, 3], tag_match: "any_include" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("any_include — いずれのタグも持っていなければfalse", async () => {
    mockFrom.mockReturnValue(createMockChain([{ tag_id: 1 }]));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "tag", tag_ids: [2, 3], tag_match: "any_include" }],
      TENANT,
    );
    expect(result).toBe(false);
  });

  it("all_include — すべてのタグを持っていればtrue", async () => {
    mockFrom.mockReturnValue(
      createMockChain([{ tag_id: 1 }, { tag_id: 2 }, { tag_id: 3 }]),
    );

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "tag", tag_ids: [1, 2], tag_match: "all_include" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("any_exclude — いずれのタグも持っていなければtrue", async () => {
    mockFrom.mockReturnValue(createMockChain([{ tag_id: 5 }]));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "tag", tag_ids: [1, 2], tag_match: "any_exclude" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("tag_idsが空の場合はtrue（条件なし扱い）", async () => {
    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "tag", tag_ids: [], tag_match: "any_include" }],
      TENANT,
    );
    expect(result).toBe(true);
  });
});

/* ---------- 対応マーク条件 ---------- */

describe("対応マーク条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("any_match — マークが一致すればtrue", async () => {
    mockFrom.mockReturnValue(createMockChain({ mark: "要対応" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "mark", mark_values: ["要対応", "完了"], mark_match: "any_match" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("any_exclude — マークが含まれなければtrue", async () => {
    mockFrom.mockReturnValue(createMockChain({ mark: "通常" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "mark", mark_values: ["要対応"], mark_match: "any_exclude" }],
      TENANT,
    );
    expect(result).toBe(true);
  });
});

/* ---------- 名前条件 ---------- */

describe("名前条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("contains — 名前に文字列を含む場合true", async () => {
    mockFrom.mockReturnValue(createMockChain({ name: "田中太郎" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "name", name_operator: "contains", name_value: "田中" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("not_contains — 名前に文字列を含まない場合true", async () => {
    mockFrom.mockReturnValue(createMockChain({ name: "佐藤花子" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "name", name_operator: "not_contains", name_value: "田中" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("equals — 名前が完全一致する場合true", async () => {
    mockFrom.mockReturnValue(createMockChain({ name: "山田太郎" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "name", name_operator: "equals", name_value: "山田太郎" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("name_valueが空の場合はtrue（条件なし扱い）", async () => {
    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "name", name_operator: "contains", name_value: "" }],
      TENANT,
    );
    expect(result).toBe(true);
  });
});

/* ---------- 友だち登録日条件 ---------- */

describe("友だち登録日条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("before — 登録日が指定日より前ならtrue", async () => {
    mockFrom.mockReturnValue(
      createMockChain({ created_at: "2024-01-15T00:00:00Z" }),
    );

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "registered_date", date_operator: "before", date_value: "2024-06-01" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("after — 登録日が指定日より後ならtrue", async () => {
    mockFrom.mockReturnValue(
      createMockChain({ created_at: "2025-03-01T00:00:00Z" }),
    );

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "registered_date", date_operator: "after", date_value: "2024-12-31" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("between — 登録日が範囲内ならtrue", async () => {
    mockFrom.mockReturnValue(
      createMockChain({ created_at: "2024-06-15T00:00:00Z" }),
    );

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{
        type: "registered_date",
        date_operator: "between",
        date_value: "2024-01-01",
        date_value_end: "2024-12-31",
      }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("created_atがnullの場合はfalse", async () => {
    mockFrom.mockReturnValue(createMockChain({ created_at: null }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "registered_date", date_operator: "before", date_value: "2025-01-01" }],
      TENANT,
    );
    expect(result).toBe(false);
  });
});

/* ---------- フィールド条件 ---------- */

describe("フィールド条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("= 演算子 — 値が一致すればtrue", async () => {
    mockFrom.mockReturnValue(createMockChain({ value: "東京" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "field", field_id: 1, field_operator: "=", field_value: "東京" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("> 演算子 — 数値比較が正しく動作する", async () => {
    mockFrom.mockReturnValue(createMockChain({ value: "30" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "field", field_id: 2, field_operator: ">", field_value: "20" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("contains 演算子 — 部分一致", async () => {
    mockFrom.mockReturnValue(createMockChain({ value: "東京都渋谷区" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "field", field_id: 3, field_operator: "contains", field_value: "渋谷" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("field_idが未設定の場合はtrue（条件なし扱い）", async () => {
    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "field", field_operator: "=", field_value: "test" }],
      TENANT,
    );
    expect(result).toBe(true);
  });
});

/* ---------- 最終決済日条件 ---------- */

describe("最終決済日条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("決済日が範囲内ならtrue", async () => {
    const mockMap = new Map([[PATIENT, "2024-06-15"]]);
    (getLastPaymentDates as ReturnType<typeof vi.fn>).mockResolvedValue(mockMap);
    (matchLastPaymentDate as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{
        type: "last_payment_date",
        payment_date_from: "2024-01-01",
        payment_date_to: "2024-12-31",
      }],
      TENANT,
    );
    expect(result).toBe(true);
    expect(matchLastPaymentDate).toHaveBeenCalledWith("2024-06-15", "2024-01-01", "2024-12-31");
  });

  it("決済履歴がない場合（mapにキーなし）", async () => {
    const mockMap = new Map();
    (getLastPaymentDates as ReturnType<typeof vi.fn>).mockResolvedValue(mockMap);
    (matchLastPaymentDate as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{
        type: "last_payment_date",
        payment_date_from: "2024-01-01",
        payment_date_to: "2024-12-31",
      }],
      TENANT,
    );
    expect(result).toBe(false);
    expect(matchLastPaymentDate).toHaveBeenCalledWith(null, "2024-01-01", "2024-12-31");
  });
});

/* ---------- 商品購入履歴条件 ---------- */

describe("商品購入履歴条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("purchased — 購入済みならtrue", async () => {
    (getProductPurchasePatients as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Set([PATIENT]),
    );

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{
        type: "product_purchase",
        product_codes: ["SKU001"],
        product_match: "purchased",
      }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("not_purchased — 未購入ならtrue", async () => {
    (getProductPurchasePatients as ReturnType<typeof vi.fn>).mockResolvedValue(new Set());

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{
        type: "product_purchase",
        product_codes: ["SKU001"],
        product_match: "not_purchased",
      }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("product_codesが空の場合はtrue（条件なし扱い）", async () => {
    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "product_purchase", product_codes: [], product_match: "purchased" }],
      TENANT,
    );
    expect(result).toBe(true);
  });
});

/* ---------- 再処方回数条件 ---------- */

describe("再処方回数条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("再処方回数が条件を満たす場合true", async () => {
    (getReorderCounts as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([[PATIENT, 3]]),
    );
    (matchBehaviorCondition as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{
        type: "reorder_count",
        behavior_operator: ">=",
        behavior_value: "2",
      }],
      TENANT,
    );
    expect(result).toBe(true);
    expect(matchBehaviorCondition).toHaveBeenCalledWith(3, ">=", "2", undefined);
  });

  it("再処方回数が0の場合（mapにキーなし）", async () => {
    (getReorderCounts as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());
    (matchBehaviorCondition as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{
        type: "reorder_count",
        behavior_operator: ">=",
        behavior_value: "1",
      }],
      TENANT,
    );
    expect(result).toBe(false);
    expect(matchBehaviorCondition).toHaveBeenCalledWith(0, ">=", "1", undefined);
  });
});

/* ---------- 診察ステータス条件 ---------- */

describe("診察ステータス条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ステータスが一致すればtrue", async () => {
    mockFrom.mockReturnValue(createMockChain({ status: "completed" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "intake_status", status_value: "completed" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("ステータスが不一致ならfalse", async () => {
    mockFrom.mockReturnValue(createMockChain({ status: "pending" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "intake_status", status_value: "completed" }],
      TENANT,
    );
    expect(result).toBe(false);
  });

  it("status_valueが未設定の場合はtrue（条件なし扱い）", async () => {
    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "intake_status" }],
      TENANT,
    );
    expect(result).toBe(true);
  });
});

/* ---------- 予約ステータス条件 ---------- */

describe("予約ステータス条件評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("予約ステータスが一致すればtrue", async () => {
    mockFrom.mockReturnValue(createMockChain({ reserve_status: "confirmed" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "reservation_status", status_value: "confirmed" }],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("予約ステータスが不一致ならfalse", async () => {
    mockFrom.mockReturnValue(createMockChain({ reserve_status: "cancelled" }));

    const result = await evaluateAudienceCondition(
      PATIENT,
      [{ type: "reservation_status", status_value: "confirmed" }],
      TENANT,
    );
    expect(result).toBe(false);
  });
});

/* ---------- AND条件（複数ルール） ---------- */

describe("複数ルールのAND評価", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("すべてのルールを満たす場合のみtrue", async () => {
    // 1番目のルール（tag）: true
    // 2番目のルール（name）: true
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // patient_tags
        return createMockChain([{ tag_id: 1 }]);
      }
      // patients（name）
      return createMockChain({ name: "田中太郎" });
    });

    const result = await evaluateAudienceCondition(
      PATIENT,
      [
        { type: "tag", tag_ids: [1], tag_match: "any_include" },
        { type: "name", name_operator: "contains", name_value: "田中" },
      ],
      TENANT,
    );
    expect(result).toBe(true);
  });

  it("1つでもルールを満たさなければfalse", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // patient_tags — タグ1を持つ
        return createMockChain([{ tag_id: 1 }]);
      }
      // patients（name）— 田中ではない
      return createMockChain({ name: "佐藤花子" });
    });

    const result = await evaluateAudienceCondition(
      PATIENT,
      [
        { type: "tag", tag_ids: [1], tag_match: "any_include" },
        { type: "name", name_operator: "equals", name_value: "田中太郎" },
      ],
      TENANT,
    );
    expect(result).toBe(false);
  });
});
