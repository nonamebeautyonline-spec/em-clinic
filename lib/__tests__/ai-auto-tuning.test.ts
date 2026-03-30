// AI Auto-Tuning テスト（generateTuningSuggestions のロジック）
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabaseモック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ data: [], error: null }),
          eq: () => ({
            gte: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        order: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

// モック後にインポート
import {
  generateTuningSuggestions,
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
});
