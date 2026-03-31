// lib/__tests__/ai-reply-classify.test.ts — メッセージ分類テスト

// --- モック定義 ---
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));

import Anthropic from "@anthropic-ai/sdk";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyMessage, type ClassificationResult } from "../ai-reply-classify";

// --- モックヘルパー ---
function mockAnthropicCreate(responseText: string) {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: responseText }],
    usage: { input_tokens: 50, output_tokens: 30 },
  });
  vi.mocked(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    function (this: Record<string, unknown>) {
      this.messages = { create: mockCreate };
    }
  );
  return mockCreate;
}

// --- 共通パラメータ ---
const baseParams = {
  apiKey: "test-api-key",
  messages: ["予約を変更したいです"],
  contextMessages: [] as Array<{ direction: string; content: string }>,
  greetingReplyEnabled: false,
};

// --- 分類結果テンプレート ---
function makeClassificationJson(overrides: Partial<ClassificationResult> = {}): string {
  const result: ClassificationResult = {
    category: "operational",
    should_reply: true,
    escalate_to_staff: false,
    key_topics: ["予約変更"],
    reasoning: "予約に関する問い合わせ",
    confidence: 0.95,
    ...overrides,
  };
  return JSON.stringify(result);
}

describe("classifyMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 正常系: JSONがそのまま返る場合 ---
  it("正常なJSONレスポンス → パース成功", async () => {
    const json = makeClassificationJson();
    mockAnthropicCreate(json);

    const { result, inputTokens, outputTokens } = await classifyMessage(baseParams);

    expect(result.category).toBe("operational");
    expect(result.should_reply).toBe(true);
    expect(result.escalate_to_staff).toBe(false);
    expect(result.key_topics).toEqual(["予約変更"]);
    expect(result.confidence).toBe(0.95);
    expect(inputTokens).toBe(50);
    expect(outputTokens).toBe(30);
  });

  // --- 正常系: コードブロック付きJSON ---
  it("```json コードブロック内のJSON → パース成功", async () => {
    const json = makeClassificationJson({ category: "medical" });
    mockAnthropicCreate(`以下が分類結果です。\n\`\`\`json\n${json}\n\`\`\``);

    const { result } = await classifyMessage(baseParams);
    expect(result.category).toBe("medical");
  });

  // --- 正常系: コードブロック（言語指定なし） ---
  it("``` コードブロック（言語指定なし） → パース成功", async () => {
    const json = makeClassificationJson({ category: "greeting" });
    mockAnthropicCreate(`\`\`\`\n${json}\n\`\`\``);

    const { result } = await classifyMessage(baseParams);
    expect(result.category).toBe("greeting");
  });

  // --- 異常系: JSONが含まれない ---
  it("JSONなしレスポンス → エラー", async () => {
    mockAnthropicCreate("分類できませんでした。");

    await expect(classifyMessage(baseParams)).rejects.toThrow(
      "分類結果にJSONが含まれていません"
    );
  });

  // --- 各カテゴリの分類テスト ---
  describe("カテゴリ別分類", () => {
    it("operational: 予約・手続き系", async () => {
      mockAnthropicCreate(
        makeClassificationJson({
          category: "operational",
          key_topics: ["予約", "キャンセル"],
          reasoning: "予約キャンセルの問い合わせ",
        })
      );

      const { result } = await classifyMessage({
        ...baseParams,
        messages: ["明日の予約をキャンセルしたいです"],
      });
      expect(result.category).toBe("operational");
      expect(result.should_reply).toBe(true);
    });

    it("medical: 医学的質問", async () => {
      mockAnthropicCreate(
        makeClassificationJson({
          category: "medical",
          escalate_to_staff: true,
          key_topics: ["副作用", "薬"],
          reasoning: "医学的質問のためエスカレーション推奨",
        })
      );

      const { result } = await classifyMessage({
        ...baseParams,
        messages: ["薬の副作用が心配です"],
      });
      expect(result.category).toBe("medical");
      expect(result.escalate_to_staff).toBe(true);
    });

    it("greeting: 挨拶・お礼（greetingReplyEnabled=false → should_reply=false）", async () => {
      mockAnthropicCreate(
        makeClassificationJson({
          category: "greeting",
          should_reply: false,
          key_topics: ["お礼"],
          reasoning: "挨拶メッセージ",
          confidence: 0.98,
        })
      );

      const { result } = await classifyMessage({
        ...baseParams,
        messages: ["ありがとうございます！"],
        greetingReplyEnabled: false,
      });
      expect(result.category).toBe("greeting");
      expect(result.should_reply).toBe(false);
    });

    it("greeting: greetingReplyEnabled=true → should_reply=true", async () => {
      mockAnthropicCreate(
        makeClassificationJson({
          category: "greeting",
          should_reply: true,
          key_topics: ["お礼"],
          reasoning: "挨拶メッセージ（返信有効）",
        })
      );

      const { result } = await classifyMessage({
        ...baseParams,
        messages: ["ありがとうございます！"],
        greetingReplyEnabled: true,
      });
      expect(result.category).toBe("greeting");
      expect(result.should_reply).toBe(true);
    });

    it("other: 分類不能", async () => {
      mockAnthropicCreate(
        makeClassificationJson({
          category: "other",
          should_reply: false,
          escalate_to_staff: false,
          key_topics: ["不明"],
          reasoning: "カテゴリ外のメッセージ",
          confidence: 0.4,
        })
      );

      const { result } = await classifyMessage({
        ...baseParams,
        messages: ["🎵"],
      });
      expect(result.category).toBe("other");
      expect(result.confidence).toBe(0.4);
    });
  });

  // --- コンテキストメッセージの受け渡し ---
  describe("コンテキストメッセージ", () => {
    it("直近の会話がプロンプトに含まれる", async () => {
      const mockCreate = mockAnthropicCreate(makeClassificationJson());

      await classifyMessage({
        ...baseParams,
        contextMessages: [
          { direction: "incoming", content: "予約したいです" },
          { direction: "outgoing", content: "かしこまりました" },
        ],
      });

      // messages.create の呼び出し引数を検証
      const callArgs = mockCreate.mock.calls[0][0];
      const userContent = callArgs.messages[0].content;
      expect(userContent).toContain("患者: 予約したいです");
      expect(userContent).toContain("スタッフ: かしこまりました");
    });

    it("コンテキストなし → 会話セクションなし", async () => {
      const mockCreate = mockAnthropicCreate(makeClassificationJson());

      await classifyMessage({
        ...baseParams,
        contextMessages: [],
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const userContent = callArgs.messages[0].content;
      expect(userContent).not.toContain("直近の会話");
    });

    it("5件を超えるコンテキスト → 最新5件のみ使用", async () => {
      const mockCreate = mockAnthropicCreate(makeClassificationJson());
      const manyMessages = Array.from({ length: 8 }, (_, i) => ({
        direction: "incoming",
        content: `メッセージ${i + 1}`,
      }));

      await classifyMessage({
        ...baseParams,
        contextMessages: manyMessages,
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const userContent = callArgs.messages[0].content;
      // 最初の3件は含まれず、4〜8のみ
      expect(userContent).not.toContain("メッセージ1");
      expect(userContent).not.toContain("メッセージ3");
      expect(userContent).toContain("メッセージ4");
      expect(userContent).toContain("メッセージ8");
    });
  });

  // --- 複数メッセージの連結 ---
  describe("メッセージ連結", () => {
    it("1件 → そのまま渡す", async () => {
      const mockCreate = mockAnthropicCreate(makeClassificationJson());

      await classifyMessage({
        ...baseParams,
        messages: ["こんにちは"],
      });

      const userContent = mockCreate.mock.calls[0][0].messages[0].content;
      expect(userContent).toContain("こんにちは");
      // 番号付きフォーマットにならない
      expect(userContent).not.toContain("(1)");
    });

    it("複数件 → 番号付きで連結", async () => {
      const mockCreate = mockAnthropicCreate(makeClassificationJson());

      await classifyMessage({
        ...baseParams,
        messages: ["予約したい", "明日空いてますか？"],
      });

      const userContent = mockCreate.mock.calls[0][0].messages[0].content;
      expect(userContent).toContain("(1) 予約したい");
      expect(userContent).toContain("(2) 明日空いてますか？");
    });
  });

  // --- APIパラメータの検証 ---
  it("Haikuモデルが使用される", async () => {
    const mockCreate = mockAnthropicCreate(makeClassificationJson());

    await classifyMessage(baseParams);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
    expect(callArgs.max_tokens).toBe(256);
  });

  // --- greetingReplyEnabled がシステムプロンプトに反映される ---
  it("greetingReplyEnabled=true → systemにgreeting返信有効と記載", async () => {
    const mockCreate = mockAnthropicCreate(makeClassificationJson());

    await classifyMessage({ ...baseParams, greetingReplyEnabled: true });

    const system = mockCreate.mock.calls[0][0].system;
    expect(system).toContain("greetingも返信");
  });

  it("greetingReplyEnabled=false → systemにgreeting返信不要と記載", async () => {
    const mockCreate = mockAnthropicCreate(makeClassificationJson());

    await classifyMessage({ ...baseParams, greetingReplyEnabled: false });

    const system = mockCreate.mock.calls[0][0].system;
    expect(system).toContain("greetingは返信不要");
  });
});
