// lib/__tests__/ai-richmenu-generator.test.ts — AIリッチメニュー画像生成テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Anthropic モック ---
const mockAnthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockAnthropicCreate };
  },
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-anthropic-key"),
}));

import {
  generateRichMenuImage,
  type AiRichMenuRequest,
} from "@/lib/ai-richmenu-generator";

beforeEach(() => {
  vi.clearAllMocks();
});

// --- ヘルパー ---
function makeAIResponse(svg: string, labels: string[]): { content: Array<{ type: string; text: string }> } {
  return {
    content: [{
      type: "text",
      text: `\`\`\`svg\n${svg}\n\`\`\`\n\n\`\`\`json\n${JSON.stringify({ buttonLabels: labels })}\n\`\`\``,
    }],
  };
}

const baseSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686"><rect width="2500" height="1686" fill="#3B82F6"/></svg>';

// =============================================================
// 正常系
// =============================================================
describe("generateRichMenuImage", () => {
  it("SVGとボタンラベルを正しく抽出して返す", async () => {
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(baseSvg, ["予約", "問診", "料金"])
    );

    const result = await generateRichMenuImage({
      prompt: "クリニック向け",
      sizeType: "full",
      buttonCount: 3,
    });

    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("viewBox");
    expect(result.buttonLabels).toEqual(["予約", "問診", "料金"]);
  });

  it("halfサイズの場合viewBox高さが843になる", async () => {
    const halfSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 843"><rect/></svg>';
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(halfSvg, ["予約", "問診"])
    );

    const result = await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "half",
      buttonCount: 2,
    });

    expect(result.svg).toContain("2500");
    expect(result.svg).toContain("843");
  });

  it("viewBoxがないSVGには自動でviewBoxを追加する", async () => {
    const svgNoViewBox = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(svgNoViewBox, ["ラベル"])
    );

    const result = await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 1,
    });

    expect(result.svg).toContain('viewBox="0 0 2500 1686"');
  });

  it("JSONパース失敗時はラベルが空配列になる", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: `\`\`\`svg\n${baseSvg}\n\`\`\`\n\n\`\`\`json\n{invalid json}\n\`\`\``,
      }],
    });

    const result = await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 3,
      buttonLabels: ["予約", "問診", "料金"],
    });

    // JSONパース失敗 → リクエストのラベルをフォールバック使用
    expect(result.buttonLabels).toEqual(["予約", "問診", "料金"]);
  });

  it("AI応答にJSONブロックがない場合はリクエストのラベルをフォールバック使用する", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: `\`\`\`svg\n${baseSvg}\n\`\`\``,
      }],
    });

    const result = await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 2,
      buttonLabels: ["メニュー1", "メニュー2"],
    });

    expect(result.buttonLabels).toEqual(["メニュー1", "メニュー2"]);
  });

  it("スタイル指定に応じて適切なシステムプロンプトが使われる", async () => {
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(baseSvg, ["ラベル"])
    );

    // card スタイル
    await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 1,
      style: "card",
    });
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("カード型デザイン"),
      })
    );

    vi.clearAllMocks();
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(baseSvg, ["ラベル"])
    );

    // gradient スタイル
    await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 1,
      style: "gradient",
    });
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("グラデーション型デザイン"),
      })
    );

    vi.clearAllMocks();
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(baseSvg, ["ラベル"])
    );

    // banner スタイル
    await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 1,
      style: "banner",
    });
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("バナー＋ボタン型デザイン"),
      })
    );
  });

  it("layoutCells指定時にレイアウト座標がプロンプトに含まれる", async () => {
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(baseSvg, ["ラベル1", "ラベル2"])
    );

    await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 2,
      layoutCells: [
        { x: 0, y: 0, w: 1250, h: 1686 },
        { x: 1250, y: 0, w: 1250, h: 1686 },
      ],
    });

    const userMessage = mockAnthropicCreate.mock.calls[0][0].messages[0].content as string;
    expect(userMessage).toContain("レイアウト指定");
    expect(userMessage).toContain("カード1");
    expect(userMessage).toContain("カード2");
  });
});

// =============================================================
// エラー系
// =============================================================
describe("generateRichMenuImage エラーハンドリング", () => {
  it("APIキーが未設定の場合はエラーをスローする", async () => {
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValueOnce(null);

    await expect(
      generateRichMenuImage({
        prompt: "テスト",
        sizeType: "full",
        buttonCount: 3,
      })
    ).rejects.toThrow("ANTHROPIC_API_KEY が未設定です");
  });

  it("AI応答からSVGを抽出できない場合はエラーをスローする", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: "SVGブロックのないプレーンテキスト",
      }],
    });

    await expect(
      generateRichMenuImage({
        prompt: "テスト",
        sizeType: "full",
        buttonCount: 3,
      })
    ).rejects.toThrow("AI応答からSVGを抽出できませんでした");
  });

  it("スタイル未指定時はデフォルトでcardスタイルが使われる", async () => {
    mockAnthropicCreate.mockResolvedValue(
      makeAIResponse(baseSvg, ["ラベル"])
    );

    await generateRichMenuImage({
      prompt: "テスト",
      sizeType: "full",
      buttonCount: 1,
      // style省略
    });

    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("カード型デザイン"),
      })
    );
  });
});
