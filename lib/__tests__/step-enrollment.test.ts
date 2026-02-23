// lib/__tests__/step-enrollment.test.ts
// ステップ配信のトリガー・エンロール・離脱・条件評価のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: [], error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// behavior-filters モック
vi.mock("@/lib/behavior-filters", () => ({
  getVisitCounts: vi.fn(async () => new Map()),
  getPurchaseAmounts: vi.fn(async () => new Map()),
  getLastVisitDates: vi.fn(async () => new Map()),
  getReorderCounts: vi.fn(async () => new Map()),
  matchBehaviorCondition: vi.fn(() => true),
}));

import {
  calculateNextSendAt,
  enrollPatient,
  checkFollowTriggerScenarios,
  checkKeywordTriggerScenarios,
  checkTagTriggerScenarios,
  exitAllStepEnrollments,
  evaluateStepConditions,
  jumpToStep,
} from "@/lib/step-enrollment";

import {
  getVisitCounts,
  getPurchaseAmounts,
  getLastVisitDates,
  getReorderCounts,
  matchBehaviorCondition,
} from "@/lib/behavior-filters";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
});

// ============================================================
// calculateNextSendAt（純粋関数テスト）
// ============================================================
describe("calculateNextSendAt", () => {
  const base = new Date("2026-01-15T03:00:00.000Z"); // JST 12:00

  it("minutes 遅延: 30分後を返す", () => {
    const result = calculateNextSendAt("minutes", 30, null, base);
    expect(new Date(result).getTime()).toBe(
      new Date("2026-01-15T03:30:00.000Z").getTime()
    );
  });

  it("minutes 遅延: 0分 → 同時刻", () => {
    const result = calculateNextSendAt("minutes", 0, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime());
  });

  it("minutes 遅延: 60分 = 1時間", () => {
    const result = calculateNextSendAt("minutes", 60, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime() + 60 * 60 * 1000);
  });

  it("hours 遅延: 2時間後を返す", () => {
    const result = calculateNextSendAt("hours", 2, null, base);
    expect(new Date(result).getTime()).toBe(
      new Date("2026-01-15T05:00:00.000Z").getTime()
    );
  });

  it("hours 遅延: 24時間後を返す", () => {
    const result = calculateNextSendAt("hours", 24, null, base);
    expect(new Date(result).getTime()).toBe(
      new Date("2026-01-16T03:00:00.000Z").getTime()
    );
  });

  it("days 遅延: 1日後（sendTime指定なし）", () => {
    const result = calculateNextSendAt("days", 1, null, base);
    expect(new Date(result).getTime()).toBe(
      new Date("2026-01-16T03:00:00.000Z").getTime()
    );
  });

  it("days 遅延: 3日後（sendTime指定なし）", () => {
    const result = calculateNextSendAt("days", 3, null, base);
    expect(new Date(result).getTime()).toBe(
      new Date("2026-01-18T03:00:00.000Z").getTime()
    );
  });

  it("days 遅延: sendTime指定あり（JST 10:00 = UTC 01:00）", () => {
    const result = calculateNextSendAt("days", 1, "10:00", base);
    expect(new Date(result).getTime()).toBe(
      new Date("2026-01-16T01:00:00.000Z").getTime()
    );
  });

  it("days 遅延: sendTime指定あり（JST 18:30 = UTC 09:30）", () => {
    const result = calculateNextSendAt("days", 2, "18:30", base);
    expect(new Date(result).getTime()).toBe(
      new Date("2026-01-17T09:30:00.000Z").getTime()
    );
  });

  it("baseTime 省略時は現在時刻ベースで計算される", () => {
    const before = Date.now();
    const result = calculateNextSendAt("minutes", 5);
    const after = Date.now();
    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before + 300000 - 1000);
    expect(resultTime).toBeLessThanOrEqual(after + 300000 + 1000);
  });

  it("未知の delayType は時間を変更しない", () => {
    const result = calculateNextSendAt("unknown", 10, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime());
  });

  it("ISO 8601形式の文字列を返す", () => {
    const result = calculateNextSendAt("minutes", 5, null, base);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ============================================================
// enrollPatient
// ============================================================
describe("enrollPatient", () => {
  it("正常: 最初のステップを取得してenrollmentをinsertする", async () => {
    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 10, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    const scenarioChain = createChain({
      data: { total_enrolled: 5 },
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    await enrollPatient(1, "patient-1", "line-uid-1", "test-tenant");

    expect(enrollChain.insert).toHaveBeenCalled();
  });

  it("ステップなし → スキップ（insertしない）", async () => {
    const stepChain = createChain({ data: null, error: null });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain();
    tableChains["step_enrollments"] = enrollChain;

    await enrollPatient(1, "patient-1", "line-uid-1", "test-tenant");

    expect(enrollChain.insert).not.toHaveBeenCalled();
  });

  it("重複エラー (23505) → 正常に無視する", async () => {
    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 5, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });
    tableChains["step_enrollments"] = enrollChain;

    await expect(
      enrollPatient(1, "patient-1", "line-uid-1", "test-tenant")
    ).resolves.toBeUndefined();
  });

  it("insert の一般エラー → console.error してreturn", async () => {
    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "hours", delay_value: 1, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    tableChains["step_enrollments"] = enrollChain;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await enrollPatient(1, "patient-1", undefined, "test-tenant");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[step-enrollment] enroll error:"),
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });

  it("lineUid省略時はnullが設定される", async () => {
    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    const scenarioChain = createChain({ data: { total_enrolled: 0 }, error: null });
    tableChains["step_scenarios"] = scenarioChain;

    await enrollPatient(1, "patient-1");

    expect(enrollChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ line_uid: null })
    );
  });
});

// ============================================================
// checkFollowTriggerScenarios
// ============================================================
describe("checkFollowTriggerScenarios", () => {
  it("シナリオが見つかったらenrollPatientを呼ぶ", async () => {
    const scenarioChain = createChain({
      data: [{ id: 10 }, { id: 20 }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    await checkFollowTriggerScenarios("patient-1", "line-uid-1", "test-tenant");

    // insert が2回呼ばれる（シナリオ2件分）
    expect(enrollChain.insert).toHaveBeenCalledTimes(2);
  });

  it("シナリオなし → 何もしない", async () => {
    const scenarioChain = createChain({ data: [], error: null });
    tableChains["step_scenarios"] = scenarioChain;

    const enrollChain = createChain();
    tableChains["step_enrollments"] = enrollChain;

    await checkFollowTriggerScenarios("patient-1", "line-uid-1", "test-tenant");

    expect(enrollChain.insert).not.toHaveBeenCalled();
  });

  it("シナリオがnull → エラーなく完了", async () => {
    const scenarioChain = createChain({ data: null, error: null });
    tableChains["step_scenarios"] = scenarioChain;

    await expect(
      checkFollowTriggerScenarios("patient-1", "line-uid-1")
    ).resolves.toBeUndefined();
  });
});

// ============================================================
// checkKeywordTriggerScenarios
// ============================================================
describe("checkKeywordTriggerScenarios", () => {
  it("完全一致: キーワードが一致したらenroll", async () => {
    const scenarioChain = createChain({
      data: [{ id: 1, trigger_keyword: "予約", trigger_keyword_match: "exact" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios("予約", "patient-1", "uid-1", "test-tenant");

    expect(enrollChain.insert).toHaveBeenCalledTimes(1);
  });

  it("完全一致: 前後スペースをtrimして一致", async () => {
    const scenarioChain = createChain({
      data: [{ id: 1, trigger_keyword: "予約", trigger_keyword_match: "exact" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios(" 予約 ", "patient-1");

    expect(enrollChain.insert).toHaveBeenCalledTimes(1);
  });

  it("完全一致: 不一致ならenrollしない", async () => {
    const scenarioChain = createChain({
      data: [{ id: 1, trigger_keyword: "予約", trigger_keyword_match: "exact" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const enrollChain = createChain();
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios("キャンセル", "patient-1");

    expect(enrollChain.insert).not.toHaveBeenCalled();
  });

  it("部分一致: キーワードを含めばenroll", async () => {
    const scenarioChain = createChain({
      data: [{ id: 2, trigger_keyword: "予約", trigger_keyword_match: "partial" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios("明日の予約をお願いします", "patient-1");

    expect(enrollChain.insert).toHaveBeenCalledTimes(1);
  });

  it("部分一致: 含まない場合はenrollしない", async () => {
    const scenarioChain = createChain({
      data: [{ id: 2, trigger_keyword: "予約", trigger_keyword_match: "partial" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const enrollChain = createChain();
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios("こんにちは", "patient-1");

    expect(enrollChain.insert).not.toHaveBeenCalled();
  });

  it("正規表現: パターンに一致したらenroll", async () => {
    const scenarioChain = createChain({
      data: [{ id: 3, trigger_keyword: "^(予約|キャンセル)$", trigger_keyword_match: "regex" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios("キャンセル", "patient-1");

    expect(enrollChain.insert).toHaveBeenCalledTimes(1);
  });

  it("正規表現: 不正な正規表現はスキップ（エラーにならない）", async () => {
    const scenarioChain = createChain({
      data: [{ id: 3, trigger_keyword: "[invalid", trigger_keyword_match: "regex" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const enrollChain = createChain();
    tableChains["step_enrollments"] = enrollChain;

    await expect(
      checkKeywordTriggerScenarios("test", "patient-1")
    ).resolves.toBeUndefined();

    expect(enrollChain.insert).not.toHaveBeenCalled();
  });

  it("trigger_keyword が空のシナリオはスキップ", async () => {
    const scenarioChain = createChain({
      data: [{ id: 4, trigger_keyword: null, trigger_keyword_match: "exact" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const enrollChain = createChain();
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios("予約", "patient-1");

    expect(enrollChain.insert).not.toHaveBeenCalled();
  });

  it("正規表現: 数字パターンに一致", async () => {
    const scenarioChain = createChain({
      data: [{ id: 5, trigger_keyword: "予約\\d+", trigger_keyword_match: "regex" }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    await checkKeywordTriggerScenarios("予約123", "patient-1");

    expect(enrollChain.insert).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// checkTagTriggerScenarios
// ============================================================
describe("checkTagTriggerScenarios", () => {
  it("タグIDに一致するシナリオがあればenroll", async () => {
    const scenarioChain = createChain({
      data: [{ id: 5 }],
      error: null,
    });
    tableChains["step_scenarios"] = scenarioChain;

    const stepChain = createChain({
      data: { sort_order: 1, delay_type: "minutes", delay_value: 0, send_time: null },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ data: { id: 1 }, error: null });
    tableChains["step_enrollments"] = enrollChain;

    await checkTagTriggerScenarios("patient-1", 42, "uid-1", "test-tenant");

    expect(enrollChain.insert).toHaveBeenCalledTimes(1);
  });

  it("タグIDに一致するシナリオがなければ何もしない", async () => {
    const scenarioChain = createChain({ data: [], error: null });
    tableChains["step_scenarios"] = scenarioChain;

    const enrollChain = createChain();
    tableChains["step_enrollments"] = enrollChain;

    await checkTagTriggerScenarios("patient-1", 999);

    expect(enrollChain.insert).not.toHaveBeenCalled();
  });
});

// ============================================================
// exitAllStepEnrollments
// ============================================================
describe("exitAllStepEnrollments", () => {
  it("アクティブなenrollmentを全て離脱させる", async () => {
    const enrollChain = createChain({ error: null });
    tableChains["step_enrollments"] = enrollChain;

    await exitAllStepEnrollments("patient-1", "予約完了", "test-tenant");

    expect(enrollChain.update).toHaveBeenCalled();
    expect(enrollChain.eq).toHaveBeenCalledWith("patient_id", "patient-1");
    expect(enrollChain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("エラー時はconsole.errorを出力", async () => {
    const enrollChain = createChain({ error: { message: "DB error" } });
    tableChains["step_enrollments"] = enrollChain;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await exitAllStepEnrollments("patient-1", "テスト離脱");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[step-enrollment] exit error:"),
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });

  it("tenantId省略時もエラーなく実行", async () => {
    const enrollChain = createChain({ error: null });
    tableChains["step_enrollments"] = enrollChain;

    await expect(
      exitAllStepEnrollments("patient-1", "テスト")
    ).resolves.toBeUndefined();
  });
});

// ============================================================
// evaluateStepConditions
// ============================================================
describe("evaluateStepConditions", () => {
  it("空のルール → false", async () => {
    const result = await evaluateStepConditions([], "patient-1", "test-tenant");
    expect(result).toBe(false);
  });

  it("null のルール → false", async () => {
    const result = await evaluateStepConditions(null as any, "patient-1", "test-tenant");
    expect(result).toBe(false);
  });

  it("tag 条件（any_include）: タグが1つでもあれば true", async () => {
    const tagChain = createChain({
      data: [{ tag_id: 1 }],
      error: null,
    });
    tableChains["patient_tags"] = tagChain;

    const rules = [{ type: "tag", tag_ids: [1, 2], tag_match: "any_include" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("tag 条件（all_include）: 全タグが必要 → 不足で false", async () => {
    const tagChain = createChain({
      data: [{ tag_id: 1 }],
      error: null,
    });
    tableChains["patient_tags"] = tagChain;

    const rules = [{ type: "tag", tag_ids: [1, 2], tag_match: "all_include" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(false);
  });

  it("tag 条件（all_include）: 全タグ揃っていれば true", async () => {
    const tagChain = createChain({
      data: [{ tag_id: 1 }, { tag_id: 2 }],
      error: null,
    });
    tableChains["patient_tags"] = tagChain;

    const rules = [{ type: "tag", tag_ids: [1, 2], tag_match: "all_include" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("tag 条件（any_exclude）: 除外タグがなければ true", async () => {
    const tagChain = createChain({ data: [], error: null });
    tableChains["patient_tags"] = tagChain;

    const rules = [{ type: "tag", tag_ids: [99], tag_match: "any_exclude" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("tag 条件（all_exclude）: 全タグは揃っていない → true", async () => {
    const tagChain = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_tags"] = tagChain;

    const rules = [{ type: "tag", tag_ids: [1, 2], tag_match: "all_exclude" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("tag 条件: tag_ids が空 → true", async () => {
    const rules = [{ type: "tag", tag_ids: [], tag_match: "any_include" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("tag 条件: tag_id (単数) フォールバック", async () => {
    const tagChain = createChain({
      data: [{ tag_id: 5 }],
      error: null,
    });
    tableChains["patient_tags"] = tagChain;

    const rules = [{ type: "tag", tag_id: 5 }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("mark 条件: マークが一致すれば true", async () => {
    const markChain = createChain({
      data: { mark: "hot" },
      error: null,
    });
    tableChains["patient_marks"] = markChain;

    const rules = [{ type: "mark", mark_values: ["hot", "warm"] }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("mark 条件: マーク不一致 → false", async () => {
    const markChain = createChain({
      data: { mark: "cold" },
      error: null,
    });
    tableChains["patient_marks"] = markChain;

    const rules = [{ type: "mark", mark_values: ["hot", "warm"] }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(false);
  });

  it("mark 条件: マークなし → 'none' 扱い", async () => {
    const markChain = createChain({ data: null, error: null });
    tableChains["patient_marks"] = markChain;

    const rules = [{ type: "mark", mark_values: ["none"] }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("visit_count 条件: matchBehaviorCondition がtrueならtrue", async () => {
    vi.mocked(getVisitCounts).mockResolvedValue(new Map([["patient-1", 3]]));
    vi.mocked(matchBehaviorCondition).mockReturnValue(true);

    const rules = [{ type: "visit_count", behavior_operator: ">=", behavior_value: "2" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("purchase_amount 条件: 購入額が条件を満たせばtrue", async () => {
    vi.mocked(getPurchaseAmounts).mockResolvedValue(new Map([["patient-1", 50000]]));
    vi.mocked(matchBehaviorCondition).mockReturnValue(true);

    const rules = [{ type: "purchase_amount", behavior_operator: ">=", behavior_value: "30000" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("last_visit 条件: 来院日なし → false", async () => {
    vi.mocked(getLastVisitDates).mockResolvedValue(new Map());

    const rules = [{ type: "last_visit", behavior_operator: "within_days", behavior_value: "30" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(false);
  });

  it("reorder_count 条件: 再処方回数チェック", async () => {
    vi.mocked(getReorderCounts).mockResolvedValue(new Map([["patient-1", 2]]));
    vi.mocked(matchBehaviorCondition).mockReturnValue(true);

    const rules = [{ type: "reorder_count", behavior_operator: ">=", behavior_value: "1" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("未知の条件タイプ → true（スキップ扱い）", async () => {
    const rules = [{ type: "unknown_type" }];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });

  it("AND条件: 1つでも不一致 → false", async () => {
    const tagChain = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_tags"] = tagChain;

    const markChain = createChain({ data: { mark: "cold" }, error: null });
    tableChains["patient_marks"] = markChain;

    const rules = [
      { type: "tag", tag_ids: [1], tag_match: "any_include" },
      { type: "mark", mark_values: ["hot"] },
    ];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(false);
  });

  it("AND条件: 全条件通過 → true", async () => {
    const tagChain = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_tags"] = tagChain;

    const markChain = createChain({ data: { mark: "hot" }, error: null });
    tableChains["patient_marks"] = markChain;

    const rules = [
      { type: "tag", tag_ids: [1], tag_match: "any_include" },
      { type: "mark", mark_values: ["hot", "warm"] },
    ];
    const result = await evaluateStepConditions(rules, "patient-1", "test-tenant");
    expect(result).toBe(true);
  });
});

// ============================================================
// jumpToStep
// ============================================================
describe("jumpToStep", () => {
  it("正常: ジャンプ先ステップの遅延を計算してenrollmentを更新", async () => {
    const stepChain = createChain({
      data: { sort_order: 3, delay_type: "hours", delay_value: 2, send_time: null, step_type: "message" },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ error: null });
    tableChains["step_enrollments"] = enrollChain;

    await jumpToStep(1, 3, 10, "test-tenant");

    expect(enrollChain.update).toHaveBeenCalled();
    expect(enrollChain.eq).toHaveBeenCalledWith("id", 1);
  });

  it("ジャンプ先なし → completed に更新", async () => {
    const stepChain = createChain({ data: null, error: null });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ error: null });
    tableChains["step_enrollments"] = enrollChain;

    await jumpToStep(1, 99, 10, "test-tenant");

    expect(enrollChain.update).toHaveBeenCalled();
  });

  it("condition ステップ → 即時実行（遅延なし）", async () => {
    const stepChain = createChain({
      data: { sort_order: 2, delay_type: "days", delay_value: 1, send_time: null, step_type: "condition" },
      error: null,
    });
    tableChains["step_items"] = stepChain;

    const enrollChain = createChain({ error: null });
    tableChains["step_enrollments"] = enrollChain;

    await jumpToStep(1, 2, 10, "test-tenant");

    expect(enrollChain.update).toHaveBeenCalled();
  });
});
