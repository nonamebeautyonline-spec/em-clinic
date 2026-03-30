import { describe, it, expect } from "vitest";
import {
  calculateOutcomeMetrics,
  compareOutcomes,
  type OutcomeMetrics,
} from "@/lib/ai-outcome-evals";

// ---------------------------------------------------------------------------
// ヘルパー: タスクデータ生成
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<{
  id: string;
  status: string;
  handoff_status: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
  completed_at: string | null;
  trace: { classifyResult?: { confidence?: number } } | null;
}> = {}) {
  return {
    id: overrides.id ?? "t1",
    status: overrides.status ?? "completed",
    handoff_status: overrides.handoff_status ?? "resolved",
    input_tokens: overrides.input_tokens ?? 100,
    output_tokens: overrides.output_tokens ?? 50,
    created_at: overrides.created_at ?? "2026-03-30T10:00:00Z",
    completed_at: "completed_at" in overrides ? overrides.completed_at! : "2026-03-30T10:01:00Z",
    trace: overrides.trace === undefined
      ? { classifyResult: { confidence: 0.9 } }
      : overrides.trace,
  };
}

function makeFeedback(taskId: string, type: string) {
  return { task_id: taskId, feedback_type: type };
}

// ---------------------------------------------------------------------------
// calculateOutcomeMetrics
// ---------------------------------------------------------------------------

describe("calculateOutcomeMetrics", () => {
  it("全指標を正しく計算する", () => {
    const tasks = [
      makeTask({
        id: "t1",
        handoff_status: "resolved",
        input_tokens: 200,
        output_tokens: 100,
        created_at: "2026-03-30T10:00:00Z",
        completed_at: "2026-03-30T10:02:00Z", // 120秒
        trace: { classifyResult: { confidence: 0.8 } },
      }),
      makeTask({
        id: "t2",
        handoff_status: "pending",
        input_tokens: 300,
        output_tokens: 150,
        created_at: "2026-03-30T10:00:00Z",
        completed_at: "2026-03-30T10:01:00Z", // 60秒
        trace: { classifyResult: { confidence: 0.6 } },
      }),
    ];

    const feedbacks = [
      makeFeedback("t1", "approve"),
      makeFeedback("t1", "approve"),
      makeFeedback("t2", "edit"),
      makeFeedback("t2", "reject"),
    ];

    const result = calculateOutcomeMetrics(tasks, feedbacks);

    // approvalRate: 2/4 = 50%
    expect(result.approvalRate).toBe(50);
    // rejectionRate: 1/4 = 25%
    expect(result.rejectionRate).toBe(25);
    // editRate: 1/4 = 25%
    expect(result.editRate).toBe(25);
    // escalationRate: 0/4 = 0%
    expect(result.escalationRate).toBe(0);
    // resolutionRate: 1/2 = 50%
    expect(result.resolutionRate).toBe(50);
    // humanInterventionRate: (1+0+1)/4 = 50%
    expect(result.humanInterventionRate).toBe(50);
    // avgCompletionTimeSec: (120+60)/2 = 90
    expect(result.avgCompletionTimeSec).toBe(90);
    // avgInputTokens: (200+300)/2 = 250
    expect(result.avgInputTokens).toBe(250);
    // avgOutputTokens: (100+150)/2 = 125
    expect(result.avgOutputTokens).toBe(125);
    // avgConfidence: (0.8+0.6)/2 = 0.7
    expect(result.avgConfidence).toBe(0.7);
  });

  it("タスクなしの場合はゼロ/null を返す", () => {
    const result = calculateOutcomeMetrics([], []);

    expect(result.approvalRate).toBe(0);
    expect(result.rejectionRate).toBe(0);
    expect(result.editRate).toBe(0);
    expect(result.escalationRate).toBe(0);
    expect(result.resolutionRate).toBe(0);
    expect(result.humanInterventionRate).toBe(0);
    expect(result.avgCompletionTimeSec).toBeNull();
    expect(result.avgInputTokens).toBe(0);
    expect(result.avgOutputTokens).toBe(0);
    expect(result.avgConfidence).toBeNull();
  });

  it("フィードバックなしの場合は率が 0 になる", () => {
    const tasks = [makeTask({ id: "t1" })];
    const result = calculateOutcomeMetrics(tasks, []);

    expect(result.approvalRate).toBe(0);
    expect(result.rejectionRate).toBe(0);
    expect(result.editRate).toBe(0);
    expect(result.escalationRate).toBe(0);
    expect(result.humanInterventionRate).toBe(0);
    // タスクベースの指標は計算される
    expect(result.resolutionRate).toBe(100); // resolved
    expect(result.avgInputTokens).toBe(100);
    expect(result.avgOutputTokens).toBe(50);
  });

  it("completed_at が null のタスクは完了時間計算から除外", () => {
    const tasks = [
      makeTask({
        id: "t1",
        completed_at: null,
      }),
    ];
    const result = calculateOutcomeMetrics(tasks, []);

    expect(result.avgCompletionTimeSec).toBeNull();
  });

  it("trace が null のタスクは confidence 計算から除外", () => {
    const tasks = [
      makeTask({ id: "t1", trace: null }),
      makeTask({
        id: "t2",
        trace: { classifyResult: { confidence: 0.8 } },
      }),
    ];
    const result = calculateOutcomeMetrics(tasks, []);

    // t1 は除外、t2 の 0.8 のみ
    expect(result.avgConfidence).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// compareOutcomes
// ---------------------------------------------------------------------------

describe("compareOutcomes", () => {
  /** ベースとなるメトリクス */
  const baseMetrics: OutcomeMetrics = {
    approvalRate: 80,
    rejectionRate: 10,
    editRate: 5,
    escalationRate: 5,
    resolutionRate: 70,
    humanInterventionRate: 20,
    avgCompletionTimeSec: 120,
    avgInputTokens: 500,
    avgOutputTokens: 200,
    avgConfidence: 0.85,
  };

  it("改善を正しく判定する", () => {
    const improved: OutcomeMetrics = {
      ...baseMetrics,
      approvalRate: 90, // +10 → 高い方が良い → improved
      rejectionRate: 5, // -5 → 低い方が良い → improved
    };

    const comparison = compareOutcomes(improved, baseMetrics);

    expect(comparison.changes.approvalRate).toEqual({
      delta: 10,
      improved: true,
    });
    expect(comparison.changes.rejectionRate).toEqual({
      delta: -5,
      improved: true,
    });
  });

  it("悪化を正しく判定する", () => {
    const worsened: OutcomeMetrics = {
      ...baseMetrics,
      approvalRate: 70, // -10 → 高い方が良い → 悪化
      rejectionRate: 15, // +5 → 低い方が良い → 悪化
      avgCompletionTimeSec: 180, // +60 → 短い方が良い → 悪化
    };

    const comparison = compareOutcomes(worsened, baseMetrics);

    expect(comparison.changes.approvalRate).toEqual({
      delta: -10,
      improved: false,
    });
    expect(comparison.changes.rejectionRate).toEqual({
      delta: 5,
      improved: false,
    });
    expect(comparison.changes.avgCompletionTimeSec).toEqual({
      delta: 60,
      improved: false,
    });
  });

  it("変化なし（delta=0）は improved=false になる", () => {
    const comparison = compareOutcomes(baseMetrics, baseMetrics);

    expect(comparison.changes.approvalRate).toEqual({
      delta: 0,
      improved: false,
    });
  });

  it("null 値を含む場合は比較不可（null）", () => {
    const withNull: OutcomeMetrics = {
      ...baseMetrics,
      avgCompletionTimeSec: null,
      avgConfidence: null,
    };

    const comparison = compareOutcomes(withNull, baseMetrics);

    expect(comparison.changes.avgCompletionTimeSec).toBeNull();
    expect(comparison.changes.avgConfidence).toBeNull();
  });

  it("previous が null の指標も比較不可", () => {
    const prevWithNull: OutcomeMetrics = {
      ...baseMetrics,
      avgCompletionTimeSec: null,
    };

    const comparison = compareOutcomes(baseMetrics, prevWithNull);

    expect(comparison.changes.avgCompletionTimeSec).toBeNull();
  });

  it("current と previous をそのまま返す", () => {
    const comparison = compareOutcomes(baseMetrics, baseMetrics);

    expect(comparison.current).toBe(baseMetrics);
    expect(comparison.previous).toBe(baseMetrics);
  });

  it("avgInputTokens の減少は改善と判定する", () => {
    const less: OutcomeMetrics = {
      ...baseMetrics,
      avgInputTokens: 400, // -100 → 少ない方が良い → improved
    };

    const comparison = compareOutcomes(less, baseMetrics);

    expect(comparison.changes.avgInputTokens).toEqual({
      delta: -100,
      improved: true,
    });
  });

  it("avgConfidence の上昇は改善と判定する", () => {
    const better: OutcomeMetrics = {
      ...baseMetrics,
      avgConfidence: 0.95, // +0.1 → 高い方が良い → improved
    };

    const comparison = compareOutcomes(better, baseMetrics);

    expect(comparison.changes.avgConfidence).toEqual({
      delta: 0.1,
      improved: true,
    });
  });
});
