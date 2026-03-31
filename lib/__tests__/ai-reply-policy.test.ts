// lib/__tests__/ai-reply-policy.test.ts — AI返信ポリシーエンジンのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClassificationResult } from "@/lib/ai-reply-classify";

// --- Supabaseモック ---
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockQueryBuilder) },
}));

// strictWithTenantモック: クエリビルダーにeqチェーンを追加して返す
vi.mock("@/lib/tenant", () => ({
  strictWithTenant: (query: unknown, _tenantId: string | null) => {
    // order()の戻り値（= mockQueryBuilder自体）をそのまま返す
    return query;
  },
  tenantPayload: (tenantId: string | null) => ({ tenant_id: tenantId }),
}));

import { evaluatePolicy } from "@/lib/ai-reply-policy";
import type { PolicyRule } from "@/lib/ai-reply-policy";

// ============================================================
// ヘルパー
// ============================================================

/** デフォルトの分類結果を生成 */
function makeClassification(overrides?: Partial<ClassificationResult>): ClassificationResult {
  return {
    category: "operational",
    should_reply: true,
    escalate_to_staff: false,
    key_topics: [],
    reasoning: "テスト用",
    confidence: 0.9,
    ...overrides,
  };
}

/** ポリシールールを生成 */
function makeRule(overrides: Partial<PolicyRule> & Pick<PolicyRule, "id">): PolicyRule {
  return {
    rule_name: `テストルール${overrides.id}`,
    rule_type: "category",
    priority: 10,
    conditions: {},
    action: { decision: "auto_reply_ok" },
    is_active: true,
    ...overrides,
  };
}

/** mockQueryBuilderのorder()が返すPromise結果を設定 */
function mockRulesResponse(rules: PolicyRule[] | null, error: unknown = null) {
  // order()はチェーンの最後なので、thenableにする
  mockQueryBuilder.order.mockResolvedValue({ data: rules, error });
}

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

// ============================================================
// テスト
// ============================================================

describe("evaluatePolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトはルールなし
    mockRulesResponse([]);
  });

  // ----------------------------------------------------------
  // ルールなし → デフォルトのauto_reply_ok
  // ----------------------------------------------------------
  describe("ルールなし", () => {
    it("ルール0件の場合、auto_reply_okを返す", async () => {
      mockRulesResponse([]);
      const result = await evaluatePolicy(makeClassification(), TENANT_ID);
      expect(result.decision).toBe("auto_reply_ok");
      expect(result.ruleHits).toEqual([]);
      expect(result.escalationReason).toBeNull();
    });

    it("ルールがnullの場合、auto_reply_okを返す", async () => {
      mockRulesResponse(null);
      const result = await evaluatePolicy(makeClassification(), TENANT_ID);
      expect(result.decision).toBe("auto_reply_ok");
    });

    it("DBエラーの場合、auto_reply_okにフォールバック", async () => {
      mockRulesResponse(null, { message: "DB接続エラー" });
      const result = await evaluatePolicy(makeClassification(), TENANT_ID);
      expect(result.decision).toBe("auto_reply_ok");
      expect(result.ruleHits).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // カテゴリマッチ
  // ----------------------------------------------------------
  describe("カテゴリマッチ", () => {
    it("単一カテゴリが一致 → ルールのdecisionを返す", async () => {
      mockRulesResponse([
        makeRule({
          id: 1,
          conditions: { category: "medical" },
          action: { decision: "approval_required" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ category: "medical" }),
        TENANT_ID
      );
      expect(result.decision).toBe("approval_required");
      expect(result.ruleHits).toHaveLength(1);
      expect(result.ruleHits[0].rule_id).toBe(1);
    });

    it("配列カテゴリのいずれかに一致 → マッチ", async () => {
      mockRulesResponse([
        makeRule({
          id: 2,
          conditions: { category: ["medical", "other"] },
          action: { decision: "escalate_to_staff" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ category: "other" }),
        TENANT_ID
      );
      expect(result.decision).toBe("escalate_to_staff");
      expect(result.ruleHits).toHaveLength(1);
    });

    it("カテゴリ不一致 → ルールはスキップされる", async () => {
      mockRulesResponse([
        makeRule({
          id: 3,
          conditions: { category: "medical" },
          action: { decision: "block" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ category: "greeting" }),
        TENANT_ID
      );
      expect(result.decision).toBe("auto_reply_ok");
      expect(result.ruleHits).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------
  // キートピック含有チェック
  // ----------------------------------------------------------
  describe("キートピック含有チェック", () => {
    it("キートピックが部分一致でマッチ", async () => {
      mockRulesResponse([
        makeRule({
          id: 10,
          conditions: { key_topics_contains: ["副作用"] },
          action: { decision: "approval_required" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ key_topics: ["薬の副作用について"] }),
        TENANT_ID
      );
      expect(result.decision).toBe("approval_required");
      expect(result.ruleHits).toHaveLength(1);
    });

    it("大文字小文字を無視してマッチ", async () => {
      mockRulesResponse([
        makeRule({
          id: 11,
          conditions: { key_topics_contains: ["COVID"] },
          action: { decision: "escalate_to_staff" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ key_topics: ["covid-19 検査"] }),
        TENANT_ID
      );
      expect(result.decision).toBe("escalate_to_staff");
    });

    it("キートピックが一致しない → ルールスキップ", async () => {
      mockRulesResponse([
        makeRule({
          id: 12,
          conditions: { key_topics_contains: ["手術"] },
          action: { decision: "block" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ key_topics: ["予約", "診察時間"] }),
        TENANT_ID
      );
      expect(result.decision).toBe("auto_reply_ok");
      expect(result.ruleHits).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------
  // 信頼度閾値チェック
  // ----------------------------------------------------------
  describe("信頼度閾値チェック", () => {
    it("信頼度が閾値未満 → ルールマッチ", async () => {
      mockRulesResponse([
        makeRule({
          id: 20,
          conditions: { confidence_below: 0.5 },
          action: { decision: "approval_required" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ confidence: 0.3 }),
        TENANT_ID
      );
      expect(result.decision).toBe("approval_required");
    });

    it("信頼度が閾値と同値 → マッチしない（>=で除外）", async () => {
      mockRulesResponse([
        makeRule({
          id: 21,
          conditions: { confidence_below: 0.5 },
          action: { decision: "approval_required" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ confidence: 0.5 }),
        TENANT_ID
      );
      expect(result.decision).toBe("auto_reply_ok");
      expect(result.ruleHits).toHaveLength(0);
    });

    it("信頼度が閾値以上 → マッチしない", async () => {
      mockRulesResponse([
        makeRule({
          id: 22,
          conditions: { confidence_below: 0.7 },
          action: { decision: "block" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ confidence: 0.85 }),
        TENANT_ID
      );
      expect(result.decision).toBe("auto_reply_ok");
    });
  });

  // ----------------------------------------------------------
  // 優先度順の評価（最も制限的なdecisionが採用される）
  // ----------------------------------------------------------
  describe("優先度順の評価", () => {
    it("複数ルールマッチ時、最も制限的なdecisionが採用される", async () => {
      mockRulesResponse([
        makeRule({
          id: 30,
          priority: 1,
          conditions: { category: "medical" },
          action: { decision: "auto_reply_ok" },
        }),
        makeRule({
          id: 31,
          priority: 2,
          conditions: { category: "medical" },
          action: { decision: "approval_required" },
        }),
        makeRule({
          id: 32,
          priority: 3,
          conditions: { category: "medical" },
          action: { decision: "escalate_to_staff", message: "医療カテゴリのためエスカレーション" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ category: "medical" }),
        TENANT_ID
      );
      // escalate_to_staff(3) > approval_required(2) > auto_reply_ok(1)
      expect(result.decision).toBe("escalate_to_staff");
      expect(result.ruleHits).toHaveLength(3);
      expect(result.escalationReason).toBe("医療カテゴリのためエスカレーション");
    });

    it("block が最も制限的として採用される", async () => {
      mockRulesResponse([
        makeRule({
          id: 40,
          priority: 1,
          conditions: { category: "medical" },
          action: { decision: "escalate_to_staff", message: "エスカレ理由" },
        }),
        makeRule({
          id: 41,
          priority: 2,
          conditions: { category: "medical" },
          action: { decision: "block", message: "ブロック理由" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ category: "medical" }),
        TENANT_ID
      );
      expect(result.decision).toBe("block");
      expect(result.escalationReason).toBe("ブロック理由");
    });

    it("制限度の低いルールのみマッチ → そのdecisionが使われる", async () => {
      mockRulesResponse([
        makeRule({
          id: 50,
          conditions: { category: "greeting" },
          action: { decision: "auto_reply_ok" },
        }),
        makeRule({
          id: 51,
          conditions: { category: "medical" },
          action: { decision: "block" },
        }),
      ]);
      // greeting分類 → id:50のみマッチ、id:51はスキップ
      const result = await evaluatePolicy(
        makeClassification({ category: "greeting" }),
        TENANT_ID
      );
      expect(result.decision).toBe("auto_reply_ok");
      expect(result.ruleHits).toHaveLength(1);
      expect(result.ruleHits[0].rule_id).toBe(50);
    });
  });

  // ----------------------------------------------------------
  // escalate_to_staffフラグ
  // ----------------------------------------------------------
  describe("escalate_to_staffフラグ", () => {
    it("分類のescalate_to_staffがtrue → 条件マッチ", async () => {
      mockRulesResponse([
        makeRule({
          id: 60,
          conditions: { escalate_to_staff: true },
          action: { decision: "escalate_to_staff", message: "分類器がエスカレーション推奨" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ escalate_to_staff: true }),
        TENANT_ID
      );
      expect(result.decision).toBe("escalate_to_staff");
      expect(result.escalationReason).toBe("分類器がエスカレーション推奨");
    });

    it("分類のescalate_to_staffがfalse → 条件不一致", async () => {
      mockRulesResponse([
        makeRule({
          id: 61,
          conditions: { escalate_to_staff: true },
          action: { decision: "escalate_to_staff" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ escalate_to_staff: false }),
        TENANT_ID
      );
      expect(result.decision).toBe("auto_reply_ok");
      expect(result.ruleHits).toHaveLength(0);
    });

    it("escalate_to_staff条件 + カテゴリ条件の組み合わせ", async () => {
      mockRulesResponse([
        makeRule({
          id: 62,
          conditions: { escalate_to_staff: true, category: "medical" },
          action: { decision: "block", message: "医療エスカレーション→ブロック" },
        }),
      ]);
      // 両方の条件を満たす
      const result = await evaluatePolicy(
        makeClassification({ escalate_to_staff: true, category: "medical" }),
        TENANT_ID
      );
      expect(result.decision).toBe("block");

      // カテゴリが不一致 → マッチしない
      const result2 = await evaluatePolicy(
        makeClassification({ escalate_to_staff: true, category: "greeting" }),
        TENANT_ID
      );
      expect(result2.decision).toBe("auto_reply_ok");
    });
  });

  // ----------------------------------------------------------
  // escalationReasonの設定
  // ----------------------------------------------------------
  describe("escalationReason", () => {
    it("action.messageがない場合、rule_nameがescalationReasonになる", async () => {
      mockRulesResponse([
        makeRule({
          id: 70,
          rule_name: "医療ブロックルール",
          conditions: { category: "medical" },
          action: { decision: "block" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ category: "medical" }),
        TENANT_ID
      );
      expect(result.escalationReason).toBe("医療ブロックルール");
    });

    it("auto_reply_okやapproval_requiredではescalationReasonはnull", async () => {
      mockRulesResponse([
        makeRule({
          id: 71,
          conditions: { category: "operational" },
          action: { decision: "approval_required" },
        }),
      ]);
      const result = await evaluatePolicy(
        makeClassification({ category: "operational" }),
        TENANT_ID
      );
      expect(result.decision).toBe("approval_required");
      expect(result.escalationReason).toBeNull();
    });
  });
});
