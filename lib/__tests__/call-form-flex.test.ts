// lib/__tests__/call-form-flex.test.ts — LINE通話フォーム Flex Messageテスト

const mockGetFlexConfig = vi.fn();

vi.mock("@/lib/flex-message/config", () => ({
  getFlexConfig: (...args: any[]) => mockGetFlexConfig(...args),
}));

vi.mock("@/lib/flex-message/types", () => ({
  DEFAULT_FLEX_CONFIG: {
    colors: {
      buttonColor: "#06C755",
      headerBg: "#06C755",
      headerText: "#FFFFFF",
    },
  },
}));

import { buildCallFormFlex } from "@/lib/call-form-flex";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFlexConfig.mockResolvedValue({
    colors: { buttonColor: "#FF6600", headerBg: "#FF6600", headerText: "#FFFFFF" },
  });
});

describe("buildCallFormFlex", () => {
  it("基本構造が正しい（type=flex, altText, bubble）", async () => {
    const result = await buildCallFormFlex("https://line.me/call/123");
    expect(result.type).toBe("flex");
    expect(result.altText).toBe("通話リクエスト");
    expect(result.contents.type).toBe("bubble");
    expect(result.contents.size).toBe("kilo");
  });

  it("lineCallUrl がボタンの action.uri に設定される", async () => {
    const url = "https://line.me/call/test-call-url";
    const result = await buildCallFormFlex(url);
    const button = result.contents.footer.contents[0];
    expect(button.action.type).toBe("uri");
    expect(button.action.uri).toBe(url);
    expect(button.action.label).toBe("通話を開始する");
  });

  it("テナント設定の色がボタンに反映される", async () => {
    mockGetFlexConfig.mockResolvedValue({
      colors: { buttonColor: "#FF0000" },
    });
    const result = await buildCallFormFlex("https://line.me/call/123", "tenant-1");
    const button = result.contents.footer.contents[0];
    expect(button.color).toBe("#FF0000");
  });

  it("getFlexConfig がエラーでもデフォルト色にフォールバック", async () => {
    mockGetFlexConfig.mockRejectedValue(new Error("DB error"));
    const result = await buildCallFormFlex("https://line.me/call/123");
    const button = result.contents.footer.contents[0];
    // DEFAULT_FLEX_CONFIG の buttonColor = "#06C755"
    expect(button.color).toBe("#06C755");
  });

  it("body に通話リクエストのテキストが含まれる", async () => {
    const result = await buildCallFormFlex("https://line.me/call/123");
    const body = result.contents.body;
    expect(body.type).toBe("box");
    // ネストされたboxからテキストを検索
    const flatTexts = JSON.stringify(body);
    expect(flatTexts).toContain("通話リクエスト");
    expect(flatTexts).toContain("タップして通話を開始できます");
  });

  it("tenantId を getFlexConfig に渡す", async () => {
    await buildCallFormFlex("https://line.me/call/123", "my-tenant");
    expect(mockGetFlexConfig).toHaveBeenCalledWith("my-tenant");
  });
});
