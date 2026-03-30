import { describe, it, expect } from "vitest";
import {
  calculateTaskQAScore,
  aggregateWorkflowQA,
  inferQALabel,
  type QAScoreInput,
} from "@/lib/ai-qa-score";

// ---------------------------------------------------------------------------
// calculateTaskQAScore
// ---------------------------------------------------------------------------

describe("calculateTaskQAScore", () => {
  it("approve は基本スコア 100 を返す", () => {
    const score = calculateTaskQAScore([{ feedbackType: "approve" }]);
    expect(score).toBe(100);
  });

  it("reject は基本スコア 0 を返す", () => {
    const score = calculateTaskQAScore([{ feedbackType: "reject" }]);
    expect(score).toBe(0);
  });

  it("edit は基本スコア 40 を返す", () => {
    const score = calculateTaskQAScore([{ feedbackType: "edit" }]);
    expect(score).toBe(40);
  });

  it("escalate は基本スコア 20 を返す", () => {
    const score = calculateTaskQAScore([{ feedbackType: "escalate" }]);
    expect(score).toBe(20);
  });

  it("confidence を加味する（score * (0.5 + conf * 0.5)）", () => {
    // approve(100) * (0.5 + 0.6 * 0.5) = 100 * 0.8 = 80
    const score = calculateTaskQAScore([
      { feedbackType: "approve", confidence: 0.6 },
    ]);
    expect(score).toBe(80);
  });

  it("confidence=0 なら score * 0.5 になる", () => {
    // approve(100) * (0.5 + 0 * 0.5) = 50
    const score = calculateTaskQAScore([
      { feedbackType: "approve", confidence: 0 },
    ]);
    expect(score).toBe(50);
  });

  it("rating を加味する（score * (rating / 5)）", () => {
    // approve(100) * 1.0(conf) * (3/5) = 60
    const score = calculateTaskQAScore([
      { feedbackType: "approve", rating: 3 },
    ]);
    expect(score).toBe(60);
  });

  it("confidence と rating の両方を加味する", () => {
    // edit(40) * (0.5 + 0.8*0.5) * (4/5) = 40 * 0.9 * 0.8 = 28.8
    const score = calculateTaskQAScore([
      { feedbackType: "edit", confidence: 0.8, rating: 4 },
    ]);
    expect(score).toBe(28.8);
  });

  it("複数フィードバック時は平均を返す", () => {
    // approve=100, reject=0 → 平均50
    const score = calculateTaskQAScore([
      { feedbackType: "approve" },
      { feedbackType: "reject" },
    ]);
    expect(score).toBe(50);
  });

  it("空配列時は 0 を返す", () => {
    const score = calculateTaskQAScore([]);
    expect(score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// aggregateWorkflowQA
// ---------------------------------------------------------------------------

describe("aggregateWorkflowQA", () => {
  it("各 rate を正しく計算する", () => {
    const feedbacks = [
      { feedbackType: "approve" as const, taskId: "t1" },
      { feedbackType: "approve" as const, taskId: "t2" },
      { feedbackType: "reject" as const, taskId: "t3" },
      { feedbackType: "edit" as const, taskId: "t4" },
      { feedbackType: "escalate" as const, taskId: "t5" },
    ];

    const result = aggregateWorkflowQA(feedbacks);

    expect(result.totalFeedback).toBe(5);
    expect(result.approveRate).toBe(40); // 2/5 = 40%
    expect(result.rejectRate).toBe(20); // 1/5 = 20%
    expect(result.editRate).toBe(20); // 1/5 = 20%
    expect(result.escalateRate).toBe(20); // 1/5 = 20%
  });

  it("avgScore はタスク別スコアの平均", () => {
    const feedbacks = [
      { feedbackType: "approve" as const, taskId: "t1" }, // score=100
      { feedbackType: "reject" as const, taskId: "t2" }, // score=0
    ];

    const result = aggregateWorkflowQA(feedbacks);
    // (100 + 0) / 2 = 50
    expect(result.avgScore).toBe(50);
  });

  it("同一タスクの複数フィードバックはタスク単位でまとめてスコア計算", () => {
    const feedbacks = [
      { feedbackType: "approve" as const, taskId: "t1" }, // t1: (100+0)/2=50
      { feedbackType: "reject" as const, taskId: "t1" },
      { feedbackType: "approve" as const, taskId: "t2" }, // t2: 100
    ];

    const result = aggregateWorkflowQA(feedbacks);
    // (50 + 100) / 2 = 75
    expect(result.avgScore).toBe(75);
  });

  it("topFailureCategories は count 降順でソートされる", () => {
    const feedbacks = [
      {
        feedbackType: "reject" as const,
        taskId: "t1",
        failureCategory: "hallucination",
      },
      {
        feedbackType: "reject" as const,
        taskId: "t2",
        failureCategory: "hallucination",
      },
      {
        feedbackType: "reject" as const,
        taskId: "t3",
        failureCategory: "hallucination",
      },
      {
        feedbackType: "reject" as const,
        taskId: "t4",
        failureCategory: "wrong_tone",
      },
      {
        feedbackType: "reject" as const,
        taskId: "t5",
        failureCategory: "outdated",
      },
      {
        feedbackType: "reject" as const,
        taskId: "t6",
        failureCategory: "outdated",
      },
    ];

    const result = aggregateWorkflowQA(feedbacks);

    expect(result.topFailureCategories[0]).toEqual({
      category: "hallucination",
      count: 3,
    });
    expect(result.topFailureCategories[1]).toEqual({
      category: "outdated",
      count: 2,
    });
    expect(result.topFailureCategories[2]).toEqual({
      category: "wrong_tone",
      count: 1,
    });
  });

  it("noEvidenceCount を正しくカウントする", () => {
    const feedbacks = [
      {
        feedbackType: "reject" as const,
        taskId: "t1",
        failureCategory: "no_evidence",
      },
      {
        feedbackType: "reject" as const,
        taskId: "t2",
        failureCategory: "no_evidence",
      },
      {
        feedbackType: "reject" as const,
        taskId: "t3",
        failureCategory: "hallucination",
      },
    ];

    const result = aggregateWorkflowQA(feedbacks);
    expect(result.noEvidenceCount).toBe(2);
  });

  it("空配列時はゼロ値を返す", () => {
    const result = aggregateWorkflowQA([]);

    expect(result.avgScore).toBe(0);
    expect(result.totalFeedback).toBe(0);
    expect(result.approveRate).toBe(0);
    expect(result.topFailureCategories).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// inferQALabel
// ---------------------------------------------------------------------------

describe("inferQALabel", () => {
  it("traceWarnings に evidence を含む場合は no_evidence", () => {
    expect(inferQALabel(undefined, undefined, ["no evidence found"])).toBe(
      "no_evidence",
    );
  });

  it("コメントに hallucination を含む場合", () => {
    expect(inferQALabel("hallucination detected", undefined, [])).toBe(
      "hallucination",
    );
  });

  it("コメントに 事実と異なる を含む場合は hallucination", () => {
    expect(inferQALabel("事実と異なる内容です", undefined, [])).toBe(
      "hallucination",
    );
  });

  it("コメントに 幻覚 を含む場合は hallucination", () => {
    expect(inferQALabel("幻覚がある", undefined, [])).toBe("hallucination");
  });

  it("コメントに 間違い を含む場合は hallucination", () => {
    expect(inferQALabel("間違いがあります", undefined, [])).toBe(
      "hallucination",
    );
  });

  it("コメントに トーン を含む場合は wrong_tone", () => {
    expect(inferQALabel("トーンが違います", undefined, [])).toBe("wrong_tone");
  });

  it("コメントに 口調 を含む場合は wrong_tone", () => {
    expect(inferQALabel("口調がおかしい", undefined, [])).toBe("wrong_tone");
  });

  it("コメントに 言い方 を含む場合は wrong_tone", () => {
    expect(inferQALabel("言い方を変えて", undefined, [])).toBe("wrong_tone");
  });

  it("コメントに 部署 を含む場合は wrong_routing", () => {
    expect(inferQALabel("部署が違う", undefined, [])).toBe("wrong_routing");
  });

  it("コメントに 担当 を含む場合は wrong_routing", () => {
    expect(inferQALabel("担当者に回して", undefined, [])).toBe("wrong_routing");
  });

  it("rejectCategory に routing を含む場合は wrong_routing", () => {
    expect(inferQALabel(undefined, "routing_error", [])).toBe("wrong_routing");
  });

  it("コメントに 古い を含む場合は outdated", () => {
    expect(inferQALabel("情報が古い", undefined, [])).toBe("outdated");
  });

  it("コメントに 更新 を含む場合は outdated", () => {
    expect(inferQALabel("更新が必要", undefined, [])).toBe("outdated");
  });

  it("コメントに 最新 を含む場合は outdated", () => {
    expect(inferQALabel("最新の情報ではない", undefined, [])).toBe("outdated");
  });

  it("どのパターンにも一致しない場合は other", () => {
    expect(inferQALabel("よくわからない", undefined, [])).toBe("other");
  });

  it("コメントも rejectCategory も undefined の場合は other", () => {
    expect(inferQALabel(undefined, undefined, [])).toBe("other");
  });

  it("evidence の traceWarning は他のパターンより優先される", () => {
    // コメントに hallucination があっても evidence が優先
    expect(
      inferQALabel("hallucination detected", undefined, [
        "missing evidence",
      ]),
    ).toBe("no_evidence");
  });
});
