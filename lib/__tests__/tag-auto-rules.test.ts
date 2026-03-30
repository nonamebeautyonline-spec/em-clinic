// lib/__tests__/tag-auto-rules.test.ts — タグ自動付与ルールのテスト

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

const { evaluateTagAutoRules } = await import("@/lib/tag-auto-rules");

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

/**
 * mockFromの各テーブル呼び出しに対してレスポンスを設定するヘルパー
 * tableMap: テーブル名 → { data, error } の配列（呼び出し順）
 */
function setupMockFrom(responses: Array<{ data: unknown; error?: unknown }>) {
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    const resp = responses[callCount] || { data: null };
    callCount++;
    return createMockChain(resp.data, resp.error || null);
  });
}

/* ---------- テスト ---------- */

describe("evaluateTagAutoRules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("auto_ruleが設定されたタグが無い場合は何もしない", async () => {
    setupMockFrom([{ data: [] }]);
    await evaluateTagAutoRules(PATIENT, "reservation_made", TENANT);
    // tag_definitionsのみ問い合わせ、それ以降のDB呼び出しなし
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("トリガーが一致しないルールはスキップされる", async () => {
    const tags = [
      {
        id: 1,
        auto_rule: {
          trigger: "checkout_completed",
          conditions: [],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([{ data: tags }]);
    await evaluateTagAutoRules(PATIENT, "reservation_made", TENANT);
    // 患者データ取得もされない
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("条件なしのルール: 常にタグを付与する", async () => {
    const tags = [
      {
        id: 10,
        auto_rule: {
          trigger: "follow",
          conditions: [],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([
      { data: tags },                              // tag_definitions
      { data: [] },                                 // patient_tags（既存タグ）
      { data: null },                               // patient_marks
      { data: [] },                                 // friend_field_values
      { data: null },                               // addTagIfNotExists: 既存チェック
      { data: null },                               // addTagIfNotExists: insert
    ]);

    await evaluateTagAutoRules(PATIENT, "follow", TENANT);
    // patient_tagsへのinsertが呼ばれるはず
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it("tag条件（any）: いずれかのタグを持っていればマッチ", async () => {
    const tags = [
      {
        id: 20,
        auto_rule: {
          trigger: "reservation_made",
          conditions: [
            { type: "tag", tag_ids: [100, 200], tag_match: "any" },
          ],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([
      { data: tags },                              // tag_definitions
      { data: [{ tag_id: 100 }] },                  // patient_tags（タグ100を保持）
      { data: null },                               // patient_marks
      { data: [] },                                 // friend_field_values
      { data: null },                               // addTagIfNotExists: 既存チェック
      { data: null },                               // addTagIfNotExists: insert
    ]);

    await evaluateTagAutoRules(PATIENT, "reservation_made", TENANT);
    // タグ付与が実行される（insertまで到達）
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it("tag条件（all）: 全てのタグを持っていなければマッチしない", async () => {
    const tags = [
      {
        id: 21,
        auto_rule: {
          trigger: "reservation_made",
          conditions: [
            { type: "tag", tag_ids: [100, 200], tag_match: "all" },
          ],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([
      { data: tags },
      { data: [{ tag_id: 100 }] },                  // 100のみ持っている（200がない）
      { data: null },
      { data: [] },
    ]);

    await evaluateTagAutoRules(PATIENT, "reservation_made", TENANT);
    // タグ付与されない（4回でDB呼び出し終了）
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });

  it("mark条件: マークが一致すればマッチ", async () => {
    const tags = [
      {
        id: 30,
        auto_rule: {
          trigger: "checkout_completed",
          conditions: [
            { type: "mark", mark_values: ["hot", "warm"] },
          ],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([
      { data: tags },
      { data: [] },                                 // patient_tags
      { data: { mark: "hot" } },                     // patient_marks
      { data: [] },                                 // friend_field_values
      { data: null },                               // addTagIfNotExists: 既存チェック
      { data: null },                               // addTagIfNotExists: insert
    ]);

    await evaluateTagAutoRules(PATIENT, "checkout_completed", TENANT);
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it("field条件: フィールド値が一致すればマッチ", async () => {
    const tags = [
      {
        id: 40,
        auto_rule: {
          trigger: "reorder_approved",
          conditions: [
            { type: "field", field_id: 5, field_operator: "=", field_value: "VIP" },
          ],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([
      { data: tags },
      { data: [] },
      { data: null },
      { data: [{ field_id: 5, value: "VIP" }] },   // フィールド値が一致
      { data: null },
      { data: null },
    ]);

    await evaluateTagAutoRules(PATIENT, "reorder_approved", TENANT);
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it("OR条件: いずれかの条件を満たせばマッチ", async () => {
    const tags = [
      {
        id: 50,
        auto_rule: {
          trigger: "follow",
          conditions: [
            { type: "mark", mark_values: ["cold"] },  // マッチしない
            { type: "tag", tag_ids: [999], tag_match: "any" },  // マッチする
          ],
          conditionOperator: "OR",
        },
      },
    ];

    setupMockFrom([
      { data: tags },
      { data: [{ tag_id: 999 }] },                 // タグ999を保持
      { data: { mark: "none" } },                    // markはnone
      { data: [] },
      { data: null },
      { data: null },
    ]);

    await evaluateTagAutoRules(PATIENT, "follow", TENANT);
    // OR条件なので、tag条件のマッチでタグ付与される
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it("AND条件: 全ての条件を満たさなければマッチしない", async () => {
    const tags = [
      {
        id: 51,
        auto_rule: {
          trigger: "follow",
          conditions: [
            { type: "mark", mark_values: ["hot"] },
            { type: "tag", tag_ids: [100], tag_match: "any" },
          ],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([
      { data: tags },
      { data: [{ tag_id: 100 }] },                 // タグ条件OK
      { data: { mark: "cold" } },                    // マーク条件NG
      { data: [] },
    ]);

    await evaluateTagAutoRules(PATIENT, "follow", TENANT);
    // AND条件でmarkが不一致のためタグ付与されない
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });

  it("行動データ条件（Phase1未対応）は常にfalseを返す", async () => {
    const tags = [
      {
        id: 60,
        auto_rule: {
          trigger: "follow",
          conditions: [
            { type: "last_payment_date" },
          ],
          conditionOperator: "AND",
        },
      },
    ];

    setupMockFrom([
      { data: tags },
      { data: [] },
      { data: null },
      { data: [] },
    ]);

    await evaluateTagAutoRules(PATIENT, "follow", TENANT);
    // 行動データ条件はfalseなのでタグ付与されない
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });
});
