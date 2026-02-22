// Claude API 医学用語補正テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Claude API モック ---
const mockMessagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function AnthropicMock() {
    return {
      messages: {
        create: mockMessagesCreate,
      },
    };
  }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => "test-api-key"),
}));

beforeEach(() => {
  vi.resetModules();
  mockMessagesCreate.mockReset();
});

describe("refineMedicalText", () => {
  it("誤認識を補正できる", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          refined: "マンジャロ2.5mgを処方します",
          corrections: ["まんじゃろ → マンジャロ"],
        }),
      }],
    });

    const { refineMedicalText } = await import("@/lib/voice/medical-refine");
    const result = await refineMedicalText(
      "まんじゃろ2.5mgを処方します",
      [{ term: "マンジャロ", reading: "まんじゃろ" }],
      "test-tenant"
    );

    expect(result.was_modified).toBe(true);
    expect(result.refined).toBe("マンジャロ2.5mgを処方します");
    expect(result.corrections).toContain("まんじゃろ → マンジャロ");
  });

  it("補正不要な場合はそのまま返す", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          refined: "マンジャロを処方します",
          corrections: [],
        }),
      }],
    });

    const { refineMedicalText } = await import("@/lib/voice/medical-refine");
    const result = await refineMedicalText(
      "マンジャロを処方します",
      [{ term: "マンジャロ" }],
      "test-tenant"
    );

    expect(result.was_modified).toBe(false);
    expect(result.refined).toBe("マンジャロを処方します");
    expect(result.corrections).toEqual([]);
  });

  it("辞書が空の場合は補正なしで返す", async () => {
    const { refineMedicalText } = await import("@/lib/voice/medical-refine");
    const result = await refineMedicalText("テスト", [], "test-tenant");

    expect(result.was_modified).toBe(false);
    expect(result.refined).toBe("テスト");
    // Claude API は呼ばれない
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("API キー未設定の場合は補正なしで返す", async () => {
    // getSettingOrEnv を null に変更
    const settingsMod = await import("@/lib/settings");
    vi.mocked(settingsMod.getSettingOrEnv).mockResolvedValueOnce(undefined);

    const { refineMedicalText } = await import("@/lib/voice/medical-refine");
    const result = await refineMedicalText(
      "テスト",
      [{ term: "マンジャロ" }],
      "test-tenant"
    );

    expect(result.was_modified).toBe(false);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("Claude API エラー時は補正なしで返す", async () => {
    mockMessagesCreate.mockRejectedValue(new Error("API error"));

    const { refineMedicalText } = await import("@/lib/voice/medical-refine");
    const result = await refineMedicalText(
      "テスト",
      [{ term: "マンジャロ" }],
      "test-tenant"
    );

    expect(result.was_modified).toBe(false);
    expect(result.refined).toBe("テスト");
  });

  it("Claude API がコードブロック内 JSON を返しても対応できる", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: '```json\n{"refined": "フィナステリド1mgを処方", "corrections": ["ふぃなすてりど → フィナステリド"]}\n```',
      }],
    });

    const { refineMedicalText } = await import("@/lib/voice/medical-refine");
    const result = await refineMedicalText(
      "ふぃなすてりど1mgを処方",
      [{ term: "フィナステリド" }],
      "test-tenant"
    );

    expect(result.was_modified).toBe(true);
    expect(result.refined).toBe("フィナステリド1mgを処方");
  });

  it("haiku モデルを使用する", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({ refined: "テスト", corrections: [] }),
      }],
    });

    const { refineMedicalText } = await import("@/lib/voice/medical-refine");
    await refineMedicalText("テスト", [{ term: "テスト" }], "test-tenant");

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
      })
    );
  });
});
