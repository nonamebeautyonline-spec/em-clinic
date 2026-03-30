// AI Routing テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// determineQueue は純粋関数なのでモック不要
import { determineQueue, getPriorityLabel } from "@/lib/ai-routing";

describe("determineQueue", () => {
  it("support-intake → support キュー", () => {
    const result = determineQueue("support-intake");
    expect(result.queueName).toBe("support");
  });

  it("sales-intake → sales キュー", () => {
    const result = determineQueue("sales-intake");
    expect(result.queueName).toBe("sales");
  });

  it("onboarding-intake → onboarding キュー", () => {
    const result = determineQueue("onboarding-intake");
    expect(result.queueName).toBe("onboarding");
  });

  it("line-reply → support キュー（デフォルト）", () => {
    const result = determineQueue("line-reply");
    expect(result.queueName).toBe("support");
  });

  it("未知のワークフロー → support キュー（フォールバック）", () => {
    const result = determineQueue("unknown-workflow");
    expect(result.queueName).toBe("support");
  });

  it("urgency=critical → priority=90", () => {
    const result = determineQueue("support-intake", { urgency: "critical" });
    expect(result.priority).toBe(90);
  });

  it("urgency=high → priority=70", () => {
    const result = determineQueue("support-intake", { urgency: "high" });
    expect(result.priority).toBe(70);
  });

  it("urgency=medium → priority=50", () => {
    const result = determineQueue("support-intake", { urgency: "medium" });
    expect(result.priority).toBe(50);
  });

  it("urgency=low → priority=30", () => {
    const result = determineQueue("support-intake", { urgency: "low" });
    expect(result.priority).toBe(30);
  });

  it("urgency未指定 → キューのデフォルト優先度", () => {
    const result = determineQueue("support-intake");
    expect(result.priority).toBe(50);
  });

  it("incident_suspected=true → incident キュー + priority=90", () => {
    const result = determineQueue("support-intake", {
      context: { incident_suspected: true },
    });
    expect(result.queueName).toBe("incident");
    expect(result.priority).toBe(90);
  });

  it("handoffSummary が undefined でもエラーにならない", () => {
    const result = determineQueue("support-intake", undefined);
    expect(result.queueName).toBe("support");
    expect(result.priority).toBe(50);
  });
});

describe("getPriorityLabel", () => {
  it("90以上 → critical", () => {
    expect(getPriorityLabel(90)).toBe("critical");
    expect(getPriorityLabel(100)).toBe("critical");
  });

  it("70-89 → high", () => {
    expect(getPriorityLabel(70)).toBe("high");
    expect(getPriorityLabel(89)).toBe("high");
  });

  it("50-69 → medium", () => {
    expect(getPriorityLabel(50)).toBe("medium");
    expect(getPriorityLabel(69)).toBe("medium");
  });

  it("50未満 → low", () => {
    expect(getPriorityLabel(30)).toBe("low");
    expect(getPriorityLabel(0)).toBe("low");
  });
});
