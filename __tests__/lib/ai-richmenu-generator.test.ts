// __tests__/lib/ai-richmenu-generator.test.ts
// AI リッチメニュー画像生成ロジックのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Anthropic SDKモック
const mockCreate = vi.fn();
function MockAnthropic() {
  return { messages: { create: mockCreate } };
}
vi.mock("@anthropic-ai/sdk", () => ({
  default: MockAnthropic,
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-api-key"),
}));

import { generateRichMenuImage, type AiRichMenuRequest } from "@/lib/ai-richmenu-generator";
import { getSettingOrEnv } from "@/lib/settings";

describe("generateRichMenuImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettingOrEnv).mockResolvedValue("test-api-key");
  });

  it("APIキー未設定時はエラーをスロー", async () => {
    vi.mocked(getSettingOrEnv).mockResolvedValue(null);

    const request: AiRichMenuRequest = {
      prompt: "test",
      sizeType: "full",
      buttonCount: 6,
    };

    await expect(generateRichMenuImage(request)).rejects.toThrow("ANTHROPIC_API_KEY が未設定です");
  });

  it("SVGが正しく抽出される", async () => {
    const svgContent = '<svg viewBox="0 0 2500 1686"><rect fill="#fff" width="2500" height="1686"/></svg>';
    mockCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: `生成しました。\n\`\`\`svg\n${svgContent}\n\`\`\`\n\n\`\`\`json\n{ "buttonLabels": ["予約", "問診"] }\n\`\`\``,
      }],
    });

    const request: AiRichMenuRequest = {
      prompt: "クリニック向け",
      sizeType: "full",
      buttonCount: 2,
      buttonLabels: ["予約", "問診"],
    };

    const result = await generateRichMenuImage(request);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("viewBox");
    expect(result.buttonLabels).toEqual(["予約", "問診"]);
  });

  it("halfサイズの場合は843pxの高さが使われる", async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: '```svg\n<svg viewBox="0 0 2500 843"><rect fill="#fff" width="2500" height="843"/></svg>\n```\n```json\n{"buttonLabels":["A","B"]}\n```',
      }],
    });

    const request: AiRichMenuRequest = {
      prompt: "コンパクト",
      sizeType: "half",
      buttonCount: 2,
    };

    const result = await generateRichMenuImage(request);
    expect(result.svg).toContain("843");
  });

  it("SVGにviewBoxがない場合は自動追加される", async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: '```svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>\n```\n```json\n{"buttonLabels":[]}\n```',
      }],
    });

    const request: AiRichMenuRequest = {
      prompt: "test",
      sizeType: "full",
      buttonCount: 1,
    };

    const result = await generateRichMenuImage(request);
    expect(result.svg).toContain('viewBox="0 0 2500 1686"');
  });

  it("AI応答にSVGがない場合はエラーをスロー", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "SVGを生成できませんでした" }],
    });

    const request: AiRichMenuRequest = {
      prompt: "test",
      sizeType: "full",
      buttonCount: 1,
    };

    await expect(generateRichMenuImage(request)).rejects.toThrow("SVGを抽出できませんでした");
  });

  it("ボタンラベルJSONが壊れている場合はリクエストのラベルを使用", async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: '```svg\n<svg viewBox="0 0 2500 1686"><rect/></svg>\n```\n```json\n{invalid json}\n```',
      }],
    });

    const request: AiRichMenuRequest = {
      prompt: "test",
      sizeType: "full",
      buttonCount: 2,
      buttonLabels: ["A", "B"],
    };

    const result = await generateRichMenuImage(request);
    expect(result.buttonLabels).toEqual(["A", "B"]);
  });

  it("ボタンラベルJSONもリクエストラベルもない場合は空配列", async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: '```svg\n<svg viewBox="0 0 2500 1686"><rect/></svg>\n```',
      }],
    });

    const request: AiRichMenuRequest = {
      prompt: "test",
      sizeType: "full",
      buttonCount: 1,
    };

    const result = await generateRichMenuImage(request);
    expect(result.buttonLabels).toEqual([]);
  });
});

// バリデーションスキーマテスト
describe("aiRichMenuGenerateSchema", () => {
  it("必須フィールドのバリデーション", async () => {
    const { aiRichMenuGenerateSchema } = await vi.importActual<typeof import("@/lib/validations/line-common")>("@/lib/validations/line-common");

    // prompt必須
    const noPrompt = aiRichMenuGenerateSchema.safeParse({ sizeType: "full", buttonCount: 6 });
    expect(noPrompt.success).toBe(false);

    // 正常
    const valid = aiRichMenuGenerateSchema.safeParse({ prompt: "テスト" });
    expect(valid.success).toBe(true);
  });

  it("sizeTypeはfull/halfのみ", async () => {
    const { aiRichMenuGenerateSchema } = await vi.importActual<typeof import("@/lib/validations/line-common")>("@/lib/validations/line-common");

    const invalid = aiRichMenuGenerateSchema.safeParse({ prompt: "test", sizeType: "invalid" });
    expect(invalid.success).toBe(false);

    const valid = aiRichMenuGenerateSchema.safeParse({ prompt: "test", sizeType: "half" });
    expect(valid.success).toBe(true);
  });

  it("buttonCountは1-6の範囲", async () => {
    const { aiRichMenuGenerateSchema } = await vi.importActual<typeof import("@/lib/validations/line-common")>("@/lib/validations/line-common");

    const tooMany = aiRichMenuGenerateSchema.safeParse({ prompt: "test", buttonCount: 7 });
    expect(tooMany.success).toBe(false);

    const zero = aiRichMenuGenerateSchema.safeParse({ prompt: "test", buttonCount: 0 });
    expect(zero.success).toBe(false);

    const valid = aiRichMenuGenerateSchema.safeParse({ prompt: "test", buttonCount: 4 });
    expect(valid.success).toBe(true);
  });
});
