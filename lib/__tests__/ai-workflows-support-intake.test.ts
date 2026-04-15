// lib/__tests__/ai-workflows-support-intake.test.ts
// サポート用インテーク ワークフローのテスト
// 対象: lib/ai-workflows/workflows/support-intake.ts

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

import { supportIntakeWorkflow } from "@/lib/ai-workflows/workflows/support-intake";
import type { ClassifyResult, GenerateContext } from "@/lib/ai-workflows/types";

const { hooks } = supportIntakeWorkflow;

describe("supportIntakeWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  // === ワークフロー設定 ===
  describe("ワークフロー設定", () => {
    it("正しいIDとバージョンを持つ", () => {
      expect(supportIntakeWorkflow.id).toBe("support-intake");
      expect(supportIntakeWorkflow.version).toBe("1.0.0");
      expect(supportIntakeWorkflow.label).toBe("問い合わせ一次対応");
    });

    it("6つのカテゴリを定義している", () => {
      expect(supportIntakeWorkflow.classifyCategories).toEqual([
        "bug", "configuration", "operation", "billing", "feature_request", "incident_suspected",
      ]);
    });

    it("handoffTargetはhuman/admin-notification", () => {
      expect(supportIntakeWorkflow.handoffTarget.type).toBe("human");
      expect(supportIntakeWorkflow.handoffTarget.channel).toBe("admin-notification");
    });
  });

  // === filter ===
  describe("filter", () => {
    const filter = hooks.filter!;

    it("正常なテキストは処理対象にする", async () => {
      const result = await filter({ text: "予約画面でエラーが出ます", senderType: "clinic", previousInquiries: [] }, null);
      expect(result.shouldProcess).toBe(true);
    });

    it("5文字未満のテキストはスキップ", async () => {
      const result = await filter({ text: "あ", senderType: "unknown", previousInquiries: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe("too_short");
    });

    it("空テキストはスキップ", async () => {
      const result = await filter({ text: "  ", senderType: "unknown", previousInquiries: [] }, null);
      expect(result.shouldProcess).toBe(false);
    });

    it("絵文字のみはスキップ", async () => {
      const result = await filter({ text: "😀😁😂🤣😃", senderType: "unknown", previousInquiries: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe("emoji_only");
    });

    it("記号のみはスキップ", async () => {
      const result = await filter({ text: "!!!...", senderType: "unknown", previousInquiries: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe("symbol_only");
    });

    it("数字のみはスキップ", async () => {
      const result = await filter({ text: "123456", senderType: "unknown", previousInquiries: [] }, null);
      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe("number_only");
    });

    it("自動返信パターンを検出する", async () => {
      const patterns = [
        { text: "不在です。後日連絡します。", expected: "auto_reply_detected" },
        { text: "これは自動返信メッセージです", expected: "auto_reply_detected" },
        { text: "auto-reply: I'm out of office", expected: "auto_reply_detected" },
        { text: "自動応答でお知らせしております", expected: "auto_reply_detected" },
        { text: "不在通知をお送りしています。", expected: "auto_reply_detected" },
      ];
      for (const { text, expected } of patterns) {
        const result = await filter({ text, senderType: "unknown", previousInquiries: [] }, null);
        expect(result.shouldProcess).toBe(false);
        expect(result.reason).toBe(expected);
      }
    });

    it("テストメッセージはスキップ（5文字以上のもの）", async () => {
      // 5文字未満のテストメッセージは too_short で先に弾かれる
      // テスト送信(5文字)、送信テスト(5文字)は5文字以上
      const testMessages = ["テスト送信", "送信テスト"];
      for (const text of testMessages) {
        const result = await filter({ text, senderType: "unknown", previousInquiries: [] }, null);
        expect(result.shouldProcess).toBe(false);
        expect(result.reason).toBe("test_message");
      }
    });

    it("短いテストメッセージはtoo_shortで弾かれる", async () => {
      // テスト(3文字)、test(4文字)、動作確認(4文字)は5文字未満
      const shortTests = ["テスト", "test", "動作確認"];
      for (const text of shortTests) {
        const result = await filter({ text, senderType: "unknown", previousInquiries: [] }, null);
        expect(result.shouldProcess).toBe(false);
        expect(result.reason).toBe("too_short");
      }
    });

    it("テストを含む普通の文章は通す", async () => {
      const result = await filter({ text: "テスト環境でエラーが出ました", senderType: "clinic", previousInquiries: [] }, null);
      expect(result.shouldProcess).toBe(true);
    });
  });

  // === classify ===
  describe("classify", () => {
    const classify = hooks.classify!;

    it("APIキー未設定時はエラーを投げる", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      await expect(classify({ text: "テスト問い合わせ", senderType: "clinic", previousInquiries: [] }, null)).rejects.toThrow("ANTHROPIC_API_KEY");
    });

    it("正常なレスポンスをパースして分類結果を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: '{"category":"bug","confidence":0.85,"shouldReply":true,"escalateToStaff":true,"keyTopics":["エラー","予約画面"],"reasoning":"バグ報告"}' }],
        usage: { input_tokens: 150, output_tokens: 60 },
      });
      const result = await classify({ text: "予約画面で500エラーが表示されます", senderType: "clinic", previousInquiries: [] }, null);
      expect(result.category).toBe("bug");
      expect(result.confidence).toBe(0.85);
      expect(result.escalateToStaff).toBe(true);
      expect(result.inputTokens).toBe(150);
    });

    it("JSONパース失敗時はデフォルト値を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "レスポンスが不正" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      const result = await classify({ text: "問い合わせします", senderType: "unknown", previousInquiries: [] }, null);
      expect(result.category).toBe("operation");
      expect(result.confidence).toBe(0.5);
      expect(result.escalateToStaff).toBe(true);
    });

    it("非textコンテンツ時はデフォルト値を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      const result = await classify({ text: "テスト", senderType: "unknown", previousInquiries: [] }, null);
      expect(result.category).toBe("operation");
    });
  });

  // === sources ===
  describe("sources", () => {
    const sources = hooks.sources!;
    const dummyClassify: ClassifyResult = {
      category: "bug", confidence: 0.8, shouldReply: true, escalateToStaff: true, keyTopics: [], reasoning: "",
    };

    it("過去の問い合わせをcandidateExamplesに変換する", async () => {
      const input = {
        text: "テスト",
        senderType: "clinic" as const,
        previousInquiries: [
          { summary: "初回問い合わせ", resolvedAt: "2025-01-15" },
          { summary: "未解決の問い合わせ" },
        ],
      };
      const result = await sources(input, dummyClassify, null);
      expect(result.candidateExamples).toHaveLength(2);
      expect(result.candidateExamples![0]).toMatchObject({ summary: "初回問い合わせ", isResolved: true });
      expect(result.candidateExamples![1]).toMatchObject({ summary: "未解決の問い合わせ", isResolved: false });
    });

    it("契約プラン・テナント情報をcustomSourcesに含める", async () => {
      const input = {
        text: "テスト",
        senderType: "clinic" as const,
        contractPlan: "premium",
        tenantName: "テストクリニック",
        previousInquiries: [],
      };
      const result = await sources(input, dummyClassify, null);
      expect(result.customSources).toBeDefined();
      const cs = result.customSources as Record<string, unknown>;
      expect(cs.contractPlan).toBe("premium");
      expect(cs.tenantName).toBe("テストクリニック");
      expect(cs.senderType).toBe("clinic");
    });

    it("情報なしの場合はcandidateExamples・customSourcesなし", async () => {
      const input = { text: "テスト", senderType: "unknown" as const, previousInquiries: [] };
      const result = await sources(input, dummyClassify, null);
      expect(result.candidateExamples).toBeUndefined();
      // senderTypeが "unknown" でもcustomSourcesに入る
      expect(result.customSources).toBeDefined();
    });
  });

  // === generate ===
  describe("generate", () => {
    const generate = hooks.generate;

    it("APIキー未設定時はエラーを投げる", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const ctx = {
        input: { text: "テスト", senderType: "unknown" as const, previousInquiries: [] },
        classifyResult: { category: "operation", confidence: 0.5, shouldReply: true, escalateToStaff: false, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      } as GenerateContext<{ text: string; senderType: string; previousInquiries: { summary: string; resolvedAt?: string }[] }>;
      await expect(generate(ctx)).rejects.toThrow("ANTHROPIC_API_KEY");
    });

    it("正常なレスポンスからサポート回答を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: '{"category":"bug","urgency":"high","suggestedReply":"ご不便をおかけして申し訳ございません","internalSummary":"予約画面の500エラー","department":"engineering","additionalQuestions":["エラーの発生時刻"],"confidence":0.85}' }],
        usage: { input_tokens: 300, output_tokens: 150 },
      });

      const ctx = {
        input: { text: "予約画面で500エラーが出る", senderType: "clinic" as const, previousInquiries: [] },
        classifyResult: { category: "bug", confidence: 0.85, shouldReply: true, escalateToStaff: true, keyTopics: ["エラー"], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      } as GenerateContext<{ text: string; senderType: string; previousInquiries: { summary: string; resolvedAt?: string }[] }>;

      const result = await generate(ctx);
      expect(result.output.category).toBe("bug");
      expect(result.output.urgency).toBe("high");
      expect(result.output.department).toBe("engineering");
      expect(result.output.suggestedReply).toContain("申し訳ございません");
      expect(result.modelName).toBe("claude-sonnet-4-6");
    });

    it("JSONパース失敗時はデフォルト値を返す", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "不正なレスポンス" }],
        usage: { input_tokens: 300, output_tokens: 150 },
      });

      const ctx = {
        input: { text: "テスト", senderType: "unknown" as const, previousInquiries: [] },
        classifyResult: { category: "operation", confidence: 0.6, shouldReply: true, escalateToStaff: false, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      } as GenerateContext<{ text: string; senderType: string; previousInquiries: { summary: string; resolvedAt?: string }[] }>;

      const result = await generate(ctx);
      expect(result.output.category).toBe("operation");
      expect(result.output.urgency).toBe("medium");
      expect(result.output.department).toBe("cs");
    });
  });

  // === handoff ===
  describe("handoff", () => {
    const handoff = hooks.handoff!;

    it("バグ報告のhandoffは正しい構造を返す", async () => {
      const ctx = {
        output: {
          category: "bug",
          urgency: "high" as const,
          suggestedReply: "回答案",
          internalSummary: "予約画面バグ",
          department: "engineering",
          additionalQuestions: ["再現手順"],
          confidence: 0.85,
        },
        input: { text: "テスト", senderType: "clinic" as const, previousInquiries: [] },
        classifyResult: { category: "bug", confidence: 0.85, shouldReply: true, escalateToStaff: true, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      };
      const result = await handoff(ctx);
      expect(result.handoffSummary.targetType).toBe("human");
      expect(result.handoffSummary.targetId).toBe("engineering");
      expect(result.handoffSummary.urgency).toBe("high");
      expect(result.handoffSummary.actionItems).toContain("顧客への返信案を確認・送信");
      expect(result.handoffSummary.actionItems).toContain("確認: 再現手順");
    });

    it("billingの問い合わせはbilling部門に振る", async () => {
      const ctx = {
        output: {
          category: "billing",
          urgency: "medium" as const,
          suggestedReply: "",
          internalSummary: "請求の問い合わせ",
          department: "billing",
          additionalQuestions: [],
          confidence: 0.7,
        },
        input: { text: "テスト", senderType: "clinic" as const, previousInquiries: [] },
        classifyResult: { category: "billing", confidence: 0.7, shouldReply: true, escalateToStaff: true, keyTopics: [], reasoning: "" },
        sourcesResult: {},
        tenantId: null,
      };
      const result = await handoff(ctx);
      expect(result.handoffSummary.targetId).toBe("billing");
      expect(result.handoffSummary.summary).toBe("請求の問い合わせ");
    });
  });
});
