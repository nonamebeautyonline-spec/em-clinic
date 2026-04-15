// AI Auto-Tuning テスト（generateTuningSuggestions + DB関数）
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック ---
function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "eq", "gte", "order", "limit", "insert", "update", "in"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

const mockFrom = vi.fn(() => createMockChain([], null));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// モック後にインポート
import {
  generateTuningSuggestions,
  analyzeTenantPerformance,
  listSuggestions,
  applySuggestion,
  rejectSuggestion,
  SOURCE_TYPES,
  type TenantPerformance,
} from "../ai-auto-tuning";

function makePerformance(overrides: Partial<TenantPerformance> = {}): TenantPerformance {
  return {
    tenantId: "test-tenant",
    totalTasks: 100,
    approvedCount: 80,
    rejectedCount: 10,
    editedCount: 10,
    approvalRate: 0.8,
    rejectionRate: 0.1,
    avgConfidence: 0.8,
    avgInputTokens: 200,
    avgOutputTokens: 300,
    totalTokenCost: 50000,
    topRejectCategories: [],
    ...overrides,
  };
}

describe("generateTuningSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("承認率が低い場合、confidence_threshold提案を生成する", async () => {
    const perf = makePerformance({
      approvalRate: 0.5,
      totalTasks: 20,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    const confSuggestion = suggestions.find((s) => s.suggestion_type === "confidence_threshold");
    expect(confSuggestion).toBeDefined();
    expect(confSuggestion!.suggested_config).toHaveProperty("confidence_threshold", 0.8);
  });

  it("承認率が高い場合、confidence_threshold提案は生成されない", async () => {
    const perf = makePerformance({
      approvalRate: 0.9,
      totalTasks: 20,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    const confSuggestion = suggestions.find((s) => s.suggestion_type === "confidence_threshold");
    expect(confSuggestion).toBeUndefined();
  });

  it("トークンコストが高い場合、model_routing提案を生成する", async () => {
    const perf = makePerformance({
      avgOutputTokens: 800,
      totalTasks: 10,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    const routingSuggestion = suggestions.find((s) => s.suggestion_type === "model_routing");
    expect(routingSuggestion).toBeDefined();
    expect(routingSuggestion!.suggested_config).toHaveProperty("use_haiku_for_simple", true);
  });

  it("却下率が高い場合、prompt_improvement提案を生成する", async () => {
    const perf = makePerformance({
      rejectionRate: 0.4,
      totalTasks: 15,
      topRejectCategories: [{ category: "tone", count: 5 }],
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    const promptSuggestion = suggestions.find((s) => s.suggestion_type === "prompt_improvement");
    expect(promptSuggestion).toBeDefined();
    expect(promptSuggestion!.suggested_config).toHaveProperty("add_examples_for_categories");
  });

  it("編集率が高い場合、tone_adjustment提案を生成する", async () => {
    const perf = makePerformance({
      editedCount: 30,
      totalTasks: 100,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    const toneSuggestion = suggestions.find((s) => s.suggestion_type === "tone_adjustment");
    expect(toneSuggestion).toBeDefined();
  });

  it("タスク数が少ない場合は提案を生成しない", async () => {
    const perf = makePerformance({
      approvalRate: 0.3,
      rejectionRate: 0.5,
      totalTasks: 3,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    // totalTasks < 10 なので confidence_threshold と prompt_improvement は生成されない
    expect(suggestions.find((s) => s.suggestion_type === "confidence_threshold")).toBeUndefined();
    expect(suggestions.find((s) => s.suggestion_type === "prompt_improvement")).toBeUndefined();
  });

  it("全指標が良好な場合、提案は空になる", async () => {
    const perf = makePerformance({
      approvalRate: 0.95,
      rejectionRate: 0.02,
      editedCount: 3,
      totalTasks: 100,
      avgOutputTokens: 200,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    expect(suggestions).toHaveLength(0);
  });

  it("全提案のstatusはpendingである", async () => {
    const perf = makePerformance({
      approvalRate: 0.4,
      rejectionRate: 0.4,
      editedCount: 30,
      avgOutputTokens: 800,
      totalTasks: 50,
      topRejectCategories: [{ category: "quality", count: 10 }],
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    for (const s of suggestions) {
      expect(s.status).toBe("pending");
    }
  });

  it("editedCount=0 の場合、tone_adjustment提案は生成されない", async () => {
    const perf = makePerformance({
      editedCount: 0,
      totalTasks: 100,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    const toneSuggestion = suggestions.find((s) => s.suggestion_type === "tone_adjustment");
    expect(toneSuggestion).toBeUndefined();
  });

  it("編集率が20%以下の場合、tone_adjustment提案は生成されない", async () => {
    const perf = makePerformance({
      editedCount: 15, // 15/100 = 15%
      totalTasks: 100,
    });

    const suggestions = await generateTuningSuggestions("test-tenant", perf);

    const toneSuggestion = suggestions.find((s) => s.suggestion_type === "tone_adjustment");
    expect(toneSuggestion).toBeUndefined();
  });
});

// ── SOURCE_TYPES ──

describe("SOURCE_TYPES", () => {
  it("6種類のソースタイプが定義されている", () => {
    expect(SOURCE_TYPES).toHaveLength(6);
    expect(SOURCE_TYPES).toContain("faq");
    expect(SOURCE_TYPES).toContain("rule");
    expect(SOURCE_TYPES).toContain("approved_reply");
    expect(SOURCE_TYPES).toContain("memory");
    expect(SOURCE_TYPES).toContain("state");
    expect(SOURCE_TYPES).toContain("live_data");
  });
});

// ── analyzeTenantPerformance ──

describe("analyzeTenantPerformance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タスクが0件の場合、デフォルト値を返す", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // ai_tasks
        return createMockChain([], null);
      }
      return createMockChain([], null);
    });

    const result = await analyzeTenantPerformance("t1");
    expect(result.tenantId).toBe("t1");
    expect(result.totalTasks).toBe(0);
    expect(result.approvalRate).toBe(0);
    expect(result.avgConfidence).toBe(0.5);
  });

  it("タスクとフィードバックから統計を算出する", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // ai_tasks
        return createMockChain([
          { id: "t1", status: "completed", workflow_type: "reply", input_tokens: 100, output_tokens: 200 },
          { id: "t2", status: "completed", workflow_type: "reply", input_tokens: 150, output_tokens: 250 },
        ], null);
      }
      // ai_task_feedback
      return createMockChain([
        { task_id: "t1", feedback_type: "approve", reject_category: null },
        { task_id: "t2", feedback_type: "reject", reject_category: "tone" },
      ], null);
    });

    const result = await analyzeTenantPerformance("t1", 7);
    expect(result.totalTasks).toBe(2);
    expect(result.approvedCount).toBe(1);
    expect(result.rejectedCount).toBe(1);
    expect(result.approvalRate).toBe(0.5);
    expect(result.rejectionRate).toBe(0.5);
    expect(result.avgInputTokens).toBe(125);
    expect(result.avgOutputTokens).toBe(225);
    expect(result.topRejectCategories).toHaveLength(1);
    expect(result.topRejectCategories[0].category).toBe("tone");
  });

  it("タスク取得エラーでもクラッシュしない", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "db error" }));

    const result = await analyzeTenantPerformance("t1");
    expect(result.totalTasks).toBe(0);
  });
});

// ── listSuggestions ──

describe("listSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("テナントIDとステータスでフィルタできる", async () => {
    const suggestions = [{ id: 1, suggestion_type: "test", status: "pending" }];
    mockFrom.mockReturnValue(createMockChain(suggestions));

    const result = await listSuggestions("t1", "pending");
    expect(result).toHaveLength(1);
  });

  it("引数なしで全件取得できる", async () => {
    mockFrom.mockReturnValue(createMockChain([]));

    const result = await listSuggestions();
    expect(result).toEqual([]);
  });

  it("エラー時は空配列を返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await listSuggestions("t1");
    expect(result).toEqual([]);
  });
});

// ── applySuggestion / rejectSuggestion ──

describe("applySuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("成功時にtrueを返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, null));

    const result = await applySuggestion(1);
    expect(result).toBe(true);
  });

  it("エラー時にfalseを返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await applySuggestion(1);
    expect(result).toBe(false);
  });
});

describe("rejectSuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("成功時にtrueを返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, null));

    const result = await rejectSuggestion(1);
    expect(result).toBe(true);
  });

  it("エラー時にfalseを返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await rejectSuggestion(1);
    expect(result).toBe(false);
  });
});
