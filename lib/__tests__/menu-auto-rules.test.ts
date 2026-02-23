// lib/__tests__/menu-auto-rules.test.ts
// メニュー自動切替ルールの条件評価・フィールド比較テスト
import { describe, it, expect } from "vitest";
import type { MenuRuleCondition, MenuAutoRule } from "@/lib/menu-auto-rules";

// === matchFieldValue のロジック再実装 ===
function matchFieldValue(actual: string, op: string, expected: string): boolean {
  const numA = Number(actual);
  const numE = Number(expected);
  const isNum = !isNaN(numA) && !isNaN(numE) && actual !== "" && expected !== "";

  switch (op) {
    case "=": return actual === expected;
    case "!=": return actual !== expected;
    case "contains": return actual.includes(expected);
    case ">": return isNum ? numA > numE : actual > expected;
    case "<": return isNum ? numA < numE : actual < expected;
    default: return false;
  }
}

// === matchesCondition のロジック再実装 ===
function matchesCondition(
  cond: MenuRuleCondition,
  tagIds: Set<number>,
  mark: string,
  fields: Map<number, string>,
): boolean {
  switch (cond.type) {
    case "tag": {
      const ids = cond.tag_ids || [];
      if (ids.length === 0) return false;
      if (cond.tag_match === "all") return ids.every(id => tagIds.has(id));
      return ids.some(id => tagIds.has(id));
    }
    case "mark": {
      const vals = cond.mark_values || [];
      return vals.includes(mark);
    }
    case "field": {
      const val = fields.get(cond.field_id || 0) || "";
      return matchFieldValue(val, cond.field_operator || "=", cond.field_value || "");
    }
    default:
      return false;
  }
}

// === matchesRule のロジック再実装 ===
function matchesRule(
  rule: { conditions: MenuRuleCondition[]; conditionOperator: "AND" | "OR" },
  tagIds: Set<number>,
  mark: string,
  fields: Map<number, string>,
): boolean {
  if (rule.conditions.length === 0) return false;
  const results = rule.conditions.map(c => matchesCondition(c, tagIds, mark, fields));
  return rule.conditionOperator === "OR"
    ? results.some(Boolean)
    : results.every(Boolean);
}

// === matchFieldValue テスト ===
describe("menu-auto-rules matchFieldValue", () => {
  it("= 文字列一致", () => {
    expect(matchFieldValue("Tokyo", "=", "Tokyo")).toBe(true);
    expect(matchFieldValue("Tokyo", "=", "Osaka")).toBe(false);
  });

  it("!= 文字列不一致", () => {
    expect(matchFieldValue("Tokyo", "!=", "Osaka")).toBe(true);
    expect(matchFieldValue("Tokyo", "!=", "Tokyo")).toBe(false);
  });

  it("contains 部分一致", () => {
    expect(matchFieldValue("東京都渋谷区", "contains", "渋谷")).toBe(true);
    expect(matchFieldValue("東京都渋谷区", "contains", "新宿")).toBe(false);
  });

  it("> 数値比較", () => {
    expect(matchFieldValue("100", ">", "50")).toBe(true);
    expect(matchFieldValue("50", ">", "100")).toBe(false);
    expect(matchFieldValue("50", ">", "50")).toBe(false);
  });

  it("< 数値比較", () => {
    expect(matchFieldValue("50", "<", "100")).toBe(true);
    expect(matchFieldValue("100", "<", "50")).toBe(false);
  });

  it("> 文字列比較（数値でない場合）", () => {
    expect(matchFieldValue("b", ">", "a")).toBe(true);
    expect(matchFieldValue("a", ">", "b")).toBe(false);
  });

  it("空文字列の数値比較は文字列比較にフォールバック", () => {
    // actual="" はNaN → isNum=false → 文字列比較
    expect(matchFieldValue("", ">", "100")).toBe(false);
  });

  it("未知のオペレーター → false", () => {
    expect(matchFieldValue("a", "like", "a")).toBe(false);
  });
});

// === matchesCondition テスト ===
describe("menu-auto-rules matchesCondition", () => {
  const tagIds = new Set([1, 2, 3]);
  const mark = "対応済み";
  const fields = new Map<number, string>([[10, "Tokyo"], [20, "100"]]);

  it("タグ条件: any — いずれかのタグを含む", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [1, 5], tag_match: "any" },
      tagIds, mark, fields
    )).toBe(true); // 1を含む
  });

  it("タグ条件: any — どれも含まない", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [4, 5], tag_match: "any" },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("タグ条件: all — 全てのタグを含む", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [1, 2], tag_match: "all" },
      tagIds, mark, fields
    )).toBe(true);
  });

  it("タグ条件: all — 一部欠けている", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [1, 4], tag_match: "all" },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("タグ条件: 空のtag_ids → false", () => {
    expect(matchesCondition(
      { type: "tag", tag_ids: [] },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("マーク条件: 一致", () => {
    expect(matchesCondition(
      { type: "mark", mark_values: ["対応済み", "確認中"] },
      tagIds, mark, fields
    )).toBe(true);
  });

  it("マーク条件: 不一致", () => {
    expect(matchesCondition(
      { type: "mark", mark_values: ["未対応"] },
      tagIds, mark, fields
    )).toBe(false);
  });

  it("フィールド条件: 一致", () => {
    expect(matchesCondition(
      { type: "field", field_id: 10, field_operator: "=", field_value: "Tokyo" },
      tagIds, mark, fields
    )).toBe(true);
  });

  it("フィールド条件: 数値比較", () => {
    expect(matchesCondition(
      { type: "field", field_id: 20, field_operator: ">", field_value: "50" },
      tagIds, mark, fields
    )).toBe(true); // 100 > 50
  });

  it("存在しないフィールド → 空文字として比較", () => {
    expect(matchesCondition(
      { type: "field", field_id: 999, field_operator: "=", field_value: "" },
      tagIds, mark, fields
    )).toBe(true); // "" === ""
  });

  it("未知のtype → false", () => {
    expect(matchesCondition(
      { type: "unknown" as any },
      tagIds, mark, fields
    )).toBe(false);
  });
});

// === matchesRule テスト ===
describe("menu-auto-rules matchesRule", () => {
  const tagIds = new Set([1, 2, 3]);
  const mark = "対応済み";
  const fields = new Map<number, string>([[10, "Tokyo"]]);

  it("AND: 全条件マッチ → true", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [1], tag_match: "any" as const },
        { type: "mark" as const, mark_values: ["対応済み"] },
      ],
      conditionOperator: "AND" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(true);
  });

  it("AND: 1つ不一致 → false", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [1], tag_match: "any" as const },
        { type: "mark" as const, mark_values: ["未対応"] },
      ],
      conditionOperator: "AND" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(false);
  });

  it("OR: いずれかマッチ → true", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [999] },
        { type: "mark" as const, mark_values: ["対応済み"] },
      ],
      conditionOperator: "OR" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(true);
  });

  it("OR: 全不一致 → false", () => {
    const rule = {
      conditions: [
        { type: "tag" as const, tag_ids: [999] },
        { type: "mark" as const, mark_values: ["未対応"] },
      ],
      conditionOperator: "OR" as const,
    };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(false);
  });

  it("条件なし → false", () => {
    const rule = { conditions: [], conditionOperator: "AND" as const };
    expect(matchesRule(rule, tagIds, mark, fields)).toBe(false);
  });
});

// === 優先度によるルール評価順 ===
describe("menu-auto-rules 優先度", () => {
  it("priority が小さい方が先に評価される", () => {
    const rules = [
      { id: "r3", priority: 3, enabled: true },
      { id: "r1", priority: 1, enabled: true },
      { id: "r2", priority: 2, enabled: false },
    ];
    const active = rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority);
    expect(active[0].id).toBe("r1");
    expect(active[1].id).toBe("r3");
    expect(active.length).toBe(2); // disabledはフィルタ
  });
});

// =========================================================================
// 以下: エクスポート関数 (loadMenuRules, saveMenuRules, evaluateMenuRules,
//       evaluateMenuRulesForMany) の統合テスト
// =========================================================================

// --- vi.hoisted で先にモック関数を定義 ---
const {
  mockGetSetting,
  mockSetSetting,
  mockGetSettingOrEnv,
  mockGetVisitCounts,
  mockGetPurchaseAmounts,
  mockGetLastVisitDates,
  mockGetReorderCounts,
  mockMatchBehaviorCondition,
} = vi.hoisted(() => ({
  mockGetSetting: vi.fn(),
  mockSetSetting: vi.fn(),
  mockGetSettingOrEnv: vi.fn(),
  mockGetVisitCounts: vi.fn(),
  mockGetPurchaseAmounts: vi.fn(),
  mockGetLastVisitDates: vi.fn(),
  mockGetReorderCounts: vi.fn(),
  mockMatchBehaviorCondition: vi.fn(),
}));

// --- モック ---
vi.mock("@/lib/settings", () => ({
  getSetting: mockGetSetting,
  setSetting: mockSetSetting,
  getSettingOrEnv: mockGetSettingOrEnv,
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: any) => query),
}));

vi.mock("@/lib/behavior-filters", () => ({
  getVisitCounts: mockGetVisitCounts,
  getPurchaseAmounts: mockGetPurchaseAmounts,
  getLastVisitDates: mockGetLastVisitDates,
  getReorderCounts: mockGetReorderCounts,
  matchBehaviorCondition: mockMatchBehaviorCondition,
}));

// --- Supabase チェーンモック ---
let tableChains: Record<string, any> = {};

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "upsert",
   "order", "limit", "single", "maybeSingle", "in", "is", "not"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

// --- グローバル fetch モック ---
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

// --- テスト対象のインポート ---
import {
  loadMenuRules,
  saveMenuRules,
  evaluateMenuRules,
  evaluateMenuRulesForMany,
} from "@/lib/menu-auto-rules";
import type { MenuAutoRule } from "@/lib/menu-auto-rules";

// --- ヘルパー: テスト用ルールを作成 ---
function makeRule(overrides: Partial<MenuAutoRule> = {}): MenuAutoRule {
  return {
    id: "rule-1",
    name: "テストルール",
    enabled: true,
    conditions: [],
    conditionOperator: "AND",
    target_menu_id: 100,
    priority: 1,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// === loadMenuRules テスト ===
describe("loadMenuRules（エクスポート関数）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("JSON正常パース → ルール配列が返る", async () => {
    const rules = [makeRule({ id: "r1" }), makeRule({ id: "r2" })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    const result = await loadMenuRules("tenant-1");

    expect(mockGetSetting).toHaveBeenCalledWith("line", "menu_auto_rules", "tenant-1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("r1");
    expect(result[1].id).toBe("r2");
  });

  it("getSetting が null → 空配列", async () => {
    mockGetSetting.mockResolvedValue(null);

    const result = await loadMenuRules();

    expect(result).toEqual([]);
  });

  it("不正なJSON → 空配列", async () => {
    mockGetSetting.mockResolvedValue("{broken json!!!");

    const result = await loadMenuRules("t1");

    expect(result).toEqual([]);
  });
});

// === saveMenuRules テスト ===
describe("saveMenuRules（エクスポート関数）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("正常保存 → true", async () => {
    mockSetSetting.mockResolvedValue(true);
    const rules = [makeRule()];

    const result = await saveMenuRules(rules, "tenant-1");

    expect(mockSetSetting).toHaveBeenCalledWith(
      "line",
      "menu_auto_rules",
      JSON.stringify(rules),
      "tenant-1",
    );
    expect(result).toBe(true);
  });

  it("保存失敗 → false", async () => {
    mockSetSetting.mockResolvedValue(false);

    const result = await saveMenuRules([], "t1");

    expect(result).toBe(false);
  });
});

// === evaluateMenuRules テスト ===
describe("evaluateMenuRules（エクスポート関数）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockFetch.mockReset().mockResolvedValue({ ok: true });
  });

  it("ルール0件 → 早期リターン（Supabase呼び出しなし）", async () => {
    // loadMenuRules が空を返す
    mockGetSetting.mockResolvedValue("[]");

    await evaluateMenuRules("patient-1");

    // Supabase の from が呼ばれないことを確認
    const { supabaseAdmin } = await import("@/lib/supabase");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("有効ルールが無い場合（全て enabled=false）→ 早期リターン", async () => {
    const rules = [makeRule({ enabled: false })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    await evaluateMenuRules("patient-1");

    const { supabaseAdmin } = await import("@/lib/supabase");
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("LINE未連携（line_id なし）→ 早期リターン、fetch 呼ばれない", async () => {
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    // 各テーブルのモックを設定（line_id が null）
    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null }); // line_id なし

    await evaluateMenuRules("patient-1");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("タグ条件でマッチ → assignMenu が呼ばれ、LINE API に fetch される", async () => {
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [10], tag_match: "any" }],
      target_menu_id: 55,
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    // 患者データモック
    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 10 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_123" }, error: null });

    // assignMenu 内部: rich_menus テーブルから line_rich_menu_id を取得
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-abc" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("test-token");

    await evaluateMenuRules("patient-1", "tenant-x");

    // LINE API 呼び出しの確認
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/user/U_LINE_123/richmenu/richmenu-abc",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      },
    );
  });

  it("タグ条件にマッチしない → assignMenu(fetch) が呼ばれない", async () => {
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [999], tag_match: "any" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    // 患者はタグ10しか持っていない → 999にマッチしない
    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 10 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_123" }, error: null });

    await evaluateMenuRules("patient-1");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("マーク条件でマッチ → assignMenu が呼ばれる", async () => {
    const rules = [makeRule({
      conditions: [{ type: "mark", mark_values: ["VIP"] }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "VIP" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_200" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-xyz" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-abc");

    await evaluateMenuRules("patient-2");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("行動データ条件あり → getVisitCounts等が呼ばれる", async () => {
    const rules = [makeRule({
      conditions: [
        { type: "visit_count", behavior_operator: ">=", behavior_value: "3" },
      ],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_300" }, error: null });

    // 行動データモック
    mockGetVisitCounts.mockResolvedValue(new Map([["patient-3", 5]]));
    mockGetPurchaseAmounts.mockResolvedValue(new Map([["patient-3", 10000]]));
    mockGetLastVisitDates.mockResolvedValue(new Map([["patient-3", "2026-01-15"]]));
    mockGetReorderCounts.mockResolvedValue(new Map([["patient-3", 2]]));

    // matchBehaviorCondition が true を返す → マッチする
    mockMatchBehaviorCondition.mockReturnValue(true);

    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-behavior" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-behavior");

    await evaluateMenuRules("patient-3");

    // 行動データ取得関数が呼ばれたか確認
    expect(mockGetVisitCounts).toHaveBeenCalledWith(["patient-3"], undefined, null);
    expect(mockGetPurchaseAmounts).toHaveBeenCalledWith(["patient-3"], undefined, null);
    expect(mockGetLastVisitDates).toHaveBeenCalledWith(["patient-3"], null);
    expect(mockGetReorderCounts).toHaveBeenCalledWith(["patient-3"], null);

    // マッチしたのでfetchが呼ばれる
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("行動データ条件なし → getVisitCounts等は呼ばれない", async () => {
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_400" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-tag" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-tag");

    await evaluateMenuRules("patient-4");

    // 行動データ取得関数は呼ばれない
    expect(mockGetVisitCounts).not.toHaveBeenCalled();
    expect(mockGetPurchaseAmounts).not.toHaveBeenCalled();
    expect(mockGetLastVisitDates).not.toHaveBeenCalled();
    expect(mockGetReorderCounts).not.toHaveBeenCalled();
  });

  it("優先度の高いルールが先にマッチ → 最初のマッチのみ実行", async () => {
    const rules = [
      makeRule({ id: "low", priority: 10, conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }], target_menu_id: 200 }),
      makeRule({ id: "high", priority: 1, conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }], target_menu_id: 100 }),
    ];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_500" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-high" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-prio");

    await evaluateMenuRules("patient-5");

    // fetch は1回だけ（最初にマッチしたルールで終了）
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // rich_menus テーブルに target_menu_id=100（priority=1のルール）で問い合わせ
    expect(tableChains["rich_menus"].eq).toHaveBeenCalledWith("id", 100);
  });

  it("assignMenu: rich_menus に line_rich_menu_id がない場合 → fetch 呼ばれない", async () => {
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_600" }, error: null });
    // line_rich_menu_id が null
    tableChains["rich_menus"] = createChain({ data: null, error: null });

    await evaluateMenuRules("patient-6");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("assignMenu: channel_access_token がない場合 → fetch 呼ばれない", async () => {
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_700" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-no-token" },
      error: null,
    });
    // トークンが null
    mockGetSettingOrEnv.mockResolvedValue(null);

    await evaluateMenuRules("patient-7");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("assignMenu: fetch が例外を投げた場合 → エラーを握りつぶしてクラッシュしない", async () => {
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_800" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-err" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-err");
    mockFetch.mockRejectedValue(new Error("ネットワークエラー"));

    // 例外がスローされないことを確認
    await expect(evaluateMenuRules("patient-8")).resolves.toBeUndefined();
  });

  it("AND条件: 全条件マッチで assignMenu が呼ばれる", async () => {
    const rules = [makeRule({
      conditionOperator: "AND",
      conditions: [
        { type: "tag", tag_ids: [5], tag_match: "any" },
        { type: "mark", mark_values: ["対応済み"] },
      ],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 5 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "対応済み" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_AND" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-and" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-and");

    await evaluateMenuRules("patient-and");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("AND条件: 1つ不一致なら assignMenu は呼ばれない", async () => {
    const rules = [makeRule({
      conditionOperator: "AND",
      conditions: [
        { type: "tag", tag_ids: [5], tag_match: "any" },
        { type: "mark", mark_values: ["VIP"] }, // マッチしない
      ],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 5 }], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "対応済み" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_AND2" }, error: null });

    await evaluateMenuRules("patient-and2");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("OR条件: いずれかマッチで assignMenu が呼ばれる", async () => {
    const rules = [makeRule({
      conditionOperator: "OR",
      conditions: [
        { type: "tag", tag_ids: [999] }, // マッチしない
        { type: "mark", mark_values: ["対応済み"] }, // マッチ
      ],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "対応済み" }, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { line_id: "U_OR" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-or" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-or");

    await evaluateMenuRules("patient-or");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("フィールド条件でマッチ → assignMenu が呼ばれる", async () => {
    const rules = [makeRule({
      conditions: [{ type: "field", field_id: 10, field_operator: "=", field_value: "Tokyo" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: { mark: "none" }, error: null });
    tableChains["friend_field_values"] = createChain({
      data: [{ field_id: 10, value: "Tokyo" }],
      error: null,
    });
    tableChains["patients"] = createChain({ data: { line_id: "U_FIELD" }, error: null });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-field" },
      error: null,
    });
    mockGetSettingOrEnv.mockResolvedValue("token-field");

    await evaluateMenuRules("patient-field");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// === evaluateMenuRulesForMany テスト ===
describe("evaluateMenuRulesForMany（エクスポート関数）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockFetch.mockReset().mockResolvedValue({ ok: true });
  });

  it("複数患者ID → 各患者に対して evaluateMenuRules が実行される", async () => {
    // 全患者でルール0件とする（早期リターン）→ 内部的に loadMenuRules が各患者で呼ばれる
    mockGetSetting.mockResolvedValue("[]");

    await evaluateMenuRulesForMany(["p1", "p2", "p3"]);

    // loadMenuRules が3回呼ばれたか（各患者1回）
    expect(mockGetSetting).toHaveBeenCalledTimes(3);
  });

  it("空配列 → 何も実行されない", async () => {
    await evaluateMenuRulesForMany([]);

    expect(mockGetSetting).not.toHaveBeenCalled();
  });

  it("11人以上 → バッチサイズ10で2回に分けて処理", async () => {
    mockGetSetting.mockResolvedValue("[]");
    const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);

    await evaluateMenuRulesForMany(ids);

    // 15人分の loadMenuRules 呼び出し
    expect(mockGetSetting).toHaveBeenCalledTimes(15);
  });

  it("tenantId が各患者の evaluateMenuRules に渡される", async () => {
    // ルールあり、ただしLINE未連携で早期リターン
    const rules = [makeRule({
      conditions: [{ type: "tag", tag_ids: [1], tag_match: "any" }],
    })];
    mockGetSetting.mockResolvedValue(JSON.stringify(rules));

    // 全テーブルのデフォルトチェーンを作成
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });

    await evaluateMenuRulesForMany(["p1", "p2"], "tenant-abc");

    // getSetting に tenantId が渡されていることを確認
    expect(mockGetSetting).toHaveBeenCalledWith("line", "menu_auto_rules", "tenant-abc");
  });
});
