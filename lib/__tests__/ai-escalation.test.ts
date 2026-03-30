// lib/__tests__/ai-escalation.test.ts — エスカレーション詳細生成テスト

// --- モック定義 ---
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));

import Anthropic from "@anthropic-ai/sdk";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateEscalationDetail,
  type EscalationDetail,
} from "../ai-escalation";
import type { ClassificationResult } from "../ai-reply-classify";

// --- モックヘルパー ---
function mockAnthropicCreate(responseText: string) {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: responseText }],
    usage: { input_tokens: 80, output_tokens: 60 },
  });
  vi.mocked(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    function (this: Record<string, unknown>) {
      this.messages = { create: mockCreate };
    }
  );
  return mockCreate;
}

// --- 共通パラメータ ---
const baseClassification: ClassificationResult = {
  category: "medical",
  should_reply: false,
  escalate_to_staff: true,
  key_topics: ["副作用", "体調不良"],
  reasoning: "医療的な判断が必要",
  confidence: 0.9,
};

const baseParams = {
  apiKey: "test-api-key",
  messages: ["薬を飲んだ後に発疹が出ました"],
  contextMessages: [
    { direction: "incoming", content: "先日処方された薬について相談です" },
    { direction: "outgoing", content: "どのようなご相談でしょうか？" },
  ],
  classificationResult: baseClassification,
  patientName: "テスト太郎",
};

// --- エスカレーション詳細テンプレート ---
function makeEscalationJson(overrides: Partial<EscalationDetail> = {}): string {
  const detail: EscalationDetail = {
    urgency: "high",
    summary: "患者が服薬後に発疹を報告。副作用の可能性があり医療判断が必要。",
    missing_info: ["服用した薬名", "発疹の発生時刻"],
    suggested_next_action: "医師に確認し、服薬中止の判断を仰ぐ",
    escalation_team: "医療",
    ...overrides,
  };
  return JSON.stringify(detail);
}

describe("generateEscalationDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. 正常系: medical + escalate → EscalationDetail が返る
  it("正常系: 構造化されたEscalationDetailを返す", async () => {
    mockAnthropicCreate(makeEscalationJson());

    const result = await generateEscalationDetail(baseParams);

    expect(result).not.toBeNull();
    expect(result!.detail.urgency).toBe("high");
    expect(result!.detail.summary).toContain("発疹");
    expect(result!.detail.missing_info).toHaveLength(2);
    expect(result!.detail.suggested_next_action).toBeTruthy();
    expect(result!.detail.escalation_team).toBe("医療");
    expect(result!.inputTokens).toBe(80);
    expect(result!.outputTokens).toBe(60);
  });

  // 2. urgency判定: medicalカテゴリ → urgencyがhighまたはmedium
  it("medicalカテゴリではurgencyがhighまたはmediumになる", async () => {
    mockAnthropicCreate(makeEscalationJson({ urgency: "medium" }));

    const result = await generateEscalationDetail(baseParams);

    expect(result).not.toBeNull();
    expect(["high", "medium"]).toContain(result!.detail.urgency);
  });

  // 3. team判定: category=medical → escalation_team="医療"
  it("medicalカテゴリではescalation_teamが医療になる", async () => {
    mockAnthropicCreate(makeEscalationJson({ escalation_team: "医療" }));

    const result = await generateEscalationDetail({
      ...baseParams,
      classificationResult: {
        ...baseClassification,
        category: "medical",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.detail.escalation_team).toBe("医療");
  });

  // 4. APIエラー時 → null を返す
  it("APIエラー時はnullを返す", async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error("API connection error"));
    vi.mocked(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      function (this: Record<string, unknown>) {
        this.messages = { create: mockCreate };
      }
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateEscalationDetail(baseParams);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[ai-escalation] エスカレーション詳細生成エラー:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  // 5. JSONパース失敗時 → null を返す
  it("JSONパース失敗時はnullを返す", async () => {
    mockAnthropicCreate("これはJSONではありません。申し訳ございません。");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateEscalationDetail(baseParams);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[ai-escalation] エスカレーション詳細生成エラー:",
      expect.any(SyntaxError)
    );
    consoleSpy.mockRestore();
  });
});
