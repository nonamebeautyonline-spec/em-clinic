// lib/__tests__/ai-workflows-sales-intake.test.ts
// 営業用インテーク ワークフローのテスト
// 対象: lib/ai-workflows/workflows/sales-intake.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

// Anthropic APIモック
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: (...args: unknown[]) => mockCreate(...args) };
    },
  };
});

import { salesIntakeWorkflow } from "@/lib/ai-workflows/workflows/sales-intake";
import type { ClassifyResult, GenerateContext } from "@/lib/ai-workflows/types";

const { hooks } = salesIntakeWorkflow;

describe("salesIntakeWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  // === ワークフロー設定 ===
  describe("ワークフロー設定", () => {
    it("正しいIDとバージョンを持つ", () => {
      expect(salesIntakeWorkflow.id).toBe("sales-intake");
      expect(salesIntakeWorkflow.version).toBe("1.0.0");
      expect(salesIntakeWorkflow.label).toBe("営業一次対応");
    });

    it("4つのカテゴリを定義している", () => {
      expect(salesIntakeWorkflow.classifyCategories).toEqual(["hot", "warm", "cold", "spam"]);
    });
  });

  // === filter ===
  describe("filter", () => {
    const filter = hooks.filter!;

    it("正常なテキストは処理対象にする", async () => {
      const result = await filter({ text: "Lオペについて詳しく知りたいです", source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(true);
    });

    it("5文字未満のテキストはスキップ", async () => {
      const result = await filter({ text: "あいう", source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toContain("5文字未満");
    });

    it("空テキストはスキップ", async () => {
      const result = await filter({ text: "", source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(false);
    });

    it("絵文字のみはスキップ", async () => {
      const result = await filter({ text: "😀😁😂🤣", source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toContain("絵文字のみ");
    });

    it("記号のみはスキップ", async () => {
      const result = await filter({ text: "!!!???...", source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toContain("記号のみ");
    });

    it("数字のみはスキップ", async () => {
      const result = await filter({ text: "12345678", source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toContain("数字のみ");
    });

    it("URL3個以上はスパム判定", async () => {
      const text = "Check out https://a.com https://b.com https://c.com";
      const result = await filter({ text, source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toContain("URL");
    });

    it("同一文字10回以上の繰り返しはスパム判定", async () => {
      const result = await filter({ text: "aaaaaaaaaa test", source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toContain("繰り返し");
    });

    it("自動返信パターンを検出する", async () => {
      const patterns = [
        "不在のため自動返信します",
        "auto-reply message",
        "out of office notification test",
      ];
      for (const text of patterns) {
        const result = await filter({ text, source: "other", previousContacts: [] }, null);
        expect(result.shouldProcess).toBe(false);
        expect(result.reason).toContain("自動返信");
      }
    });

    it("URL2個以下は通す", async () => {
      const text = "https://example.com と https://test.com を見てください";
      const result = await filter({ text, source: "other", previousContacts: [] }, null);
      expect(result.shouldProcess).toBe(true);
    });
  });

  // === classify ===
  describe("classify", () => {
    const classify = hooks.classify!;

    it("APIキー未設定時はエラーを投げる", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      await expect(classify({ text: "テスト", source: "other", previousContacts: [] }, null)).rejects.toThrow("ANTHROPIC_API_KEY");
    });

    it("正常なレスポンスをパースして分類結果を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: '{"category":"hot","confidence":0.9,"shouldReply":true,"escalateToStaff":true,"keyTopics":["導入検討"],"reasoning":"具体的な検討"}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      const result = await classify({ text: "Lオペの導入を検討しています。見積もりをお願いします", source: "website", previousContacts: [] }, null);
      expect(result.category).toBe("hot");
      expect(result.confidence).toBe(0.9);
      expect(result.escalateToStaff).toBe(true);
      expect(result.keyTopics).toContain("導入検討");
    });

    it("JSONパース失敗時はデフォルト値を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "JSONではないテキスト" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      const result = await classify({ text: "テストメッセージです", source: "other", previousContacts: [] }, null);
      expect(result.category).toBe("warm");
      expect(result.confidence).toBe(0.5);
    });

    it("非textコンテンツ時はデフォルト値を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      const result = await classify({ text: "テスト", source: "other", previousContacts: [] }, null);
      expect(result.category).toBe("warm");
    });
  });

  // === sources ===
  describe("sources", () => {
    const sources = hooks.sources!;
    const dummyClassify: ClassifyResult = {
      category: "warm", confidence: 0.7, shouldReply: true, escalateToStaff: false, keyTopics: [], reasoning: "",
    };

    it("過去の接点情報をcandidateExamplesに変換する", async () => {
      const input = {
        text: "テスト",
        source: "other" as const,
        previousContacts: [{ date: "2025-01-01", summary: "初回問い合わせ" }],
      };
      const result = await sources(input, dummyClassify, null);
      expect(result.candidateExamples).toHaveLength(1);
      expect(result.candidateExamples![0]).toEqual({ date: "2025-01-01", summary: "初回問い合わせ" });
    });

    it("クリニック情報をcustomSourcesに集約する", async () => {
      const input = {
        text: "テスト",
        source: "other" as const,
        clinicName: "テストクリニック",
        specialty: "皮膚科",
        location: "東京都",
        previousContacts: [],
      };
      const result = await sources(input, dummyClassify, null);
      expect(result.customSources).toBeDefined();
      expect((result.customSources as Record<string, unknown>).clinicName).toBe("テストクリニック");
      expect((result.customSources as Record<string, unknown>).specialty).toBe("皮膚科");
    });

    it("情報なしの場合は空を返す", async () => {
      const input = { text: "テスト", source: "other" as const, previousContacts: [] };
      const result = await sources(input, dummyClassify, null);
      expect(result.candidateExamples).toBeUndefined();
      expect(result.customSources).toBeUndefined();
    });
  });

  // === generate ===
  describe("generate", () => {
    const generate = hooks.generate;

    it("APIキー未設定時はエラーを投げる", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const ctx = {
        input: { text: "テスト", source: "other" as const, previousContacts: [] },
        classifyResult: { category: "warm", confidence: 0.7, shouldReply: true, escalateToStaff: false, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      } as GenerateContext<{ text: string; source: string; previousContacts: { date: string; summary: string }[] }>;
      await expect(generate(ctx)).rejects.toThrow("ANTHROPIC_API_KEY");
    });

    it("正常なレスポンスからリード分析結果を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: '{"leadScore":85,"temperature":"hot","estimatedChallenges":["予約管理"],"suggestedReply":"ご連絡ありがとうございます","internalBrief":"導入検討中","followUpItems":["デモ調整"],"confidence":0.9}' }],
        usage: { input_tokens: 200, output_tokens: 100 },
      });

      const ctx = {
        input: { text: "導入を検討中です", source: "website" as const, previousContacts: [] },
        classifyResult: { category: "hot", confidence: 0.9, shouldReply: true, escalateToStaff: true, keyTopics: ["導入"], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      } as GenerateContext<{ text: string; source: string; previousContacts: { date: string; summary: string }[] }>;

      const result = await generate(ctx);
      expect(result.output.leadScore).toBe(85);
      expect(result.output.temperature).toBe("hot");
      expect(result.output.suggestedReply).toContain("ご連絡");
      expect(result.modelName).toBe("claude-sonnet-4-6");
    });

    it("JSONパース失敗時はデフォルト値を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "不正なレスポンス" }],
        usage: { input_tokens: 200, output_tokens: 100 },
      });

      const ctx = {
        input: { text: "テスト", source: "other" as const, previousContacts: [] },
        classifyResult: { category: "warm", confidence: 0.6, shouldReply: true, escalateToStaff: false, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      } as GenerateContext<{ text: string; source: string; previousContacts: { date: string; summary: string }[] }>;

      const result = await generate(ctx);
      expect(result.output.leadScore).toBe(50);
      expect(result.output.temperature).toBe("warm");
    });
  });

  // === handoff ===
  describe("handoff", () => {
    const handoff = hooks.handoff!;

    it("hotリードは24時間以内連絡のアクションアイテムを含む", async () => {
      const ctx = {
        output: {
          leadScore: 90,
          temperature: "hot" as const,
          estimatedChallenges: [],
          suggestedReply: "",
          internalBrief: "高温度リード",
          followUpItems: ["デモ調整"],
          confidence: 0.9,
        },
        input: { text: "テスト", source: "other" as const, previousContacts: [] },
        classifyResult: { category: "hot", confidence: 0.9, shouldReply: true, escalateToStaff: true, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      };
      const result = await handoff(ctx);
      expect(result.handoffSummary.urgency).toBe("high");
      expect(result.handoffSummary.actionItems).toContain("24時間以内に連絡");
      expect(result.handoffSummary.targetType).toBe("human");
    });

    it("spamはtargetType=noneになる", async () => {
      const ctx = {
        output: {
          leadScore: 5,
          temperature: "spam" as const,
          estimatedChallenges: [],
          suggestedReply: "",
          internalBrief: "スパム",
          followUpItems: [],
          confidence: 0.95,
        },
        input: { text: "spam", source: "other" as const, previousContacts: [] },
        classifyResult: { category: "spam", confidence: 0.95, shouldReply: false, escalateToStaff: false, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      };
      const result = await handoff(ctx);
      expect(result.handoffSummary.targetType).toBe("none");
      expect(result.handoffSummary.urgency).toBe("low");
    });

    it("coldリードはurgency=lowになる", async () => {
      const ctx = {
        output: {
          leadScore: 20,
          temperature: "cold" as const,
          estimatedChallenges: [],
          suggestedReply: "",
          internalBrief: "時期尚早",
          followUpItems: [],
          confidence: 0.7,
        },
        input: { text: "テスト", source: "other" as const, previousContacts: [] },
        classifyResult: { category: "cold", confidence: 0.7, shouldReply: true, escalateToStaff: false, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      };
      const result = await handoff(ctx);
      expect(result.handoffSummary.urgency).toBe("low");
      expect(result.handoffSummary.targetType).toBe("human");
    });
  });
});
