// lib/__tests__/flex-message-config.test.ts — FLEX通知メッセージ設定のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();

vi.mock("@/lib/settings", () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
}));

import { getFlexConfig, setFlexConfig } from "@/lib/flex-message/config";
import { DEFAULT_FLEX_CONFIG } from "@/lib/flex-message/types";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- getFlexConfig ----------
describe("getFlexConfig", () => {
  it("DB値null -> デフォルト返却", async () => {
    mockGetSetting.mockResolvedValue(null);

    const result = await getFlexConfig();
    expect(result).toEqual(DEFAULT_FLEX_CONFIG);
  });

  it("有効JSON -> デフォルトとマージ", async () => {
    const partial = {
      colors: { headerBg: "#000000" },
      reservation: { createdHeader: "カスタムヘッダー" },
    };
    mockGetSetting.mockResolvedValue(JSON.stringify(partial));

    const result = await getFlexConfig();
    expect(result.colors.headerBg).toBe("#000000");
    expect(result.colors.headerText).toBe(DEFAULT_FLEX_CONFIG.colors.headerText);
    expect(result.reservation.createdHeader).toBe("カスタムヘッダー");
    expect(result.reservation.createdNote).toBe(DEFAULT_FLEX_CONFIG.reservation.createdNote);
  });

  it("colors.headerBgだけ上書き -> 他はデフォルト", async () => {
    const partial = { colors: { headerBg: "#333333" } };
    mockGetSetting.mockResolvedValue(JSON.stringify(partial));

    const result = await getFlexConfig();
    expect(result.colors.headerBg).toBe("#333333");
    expect(result.colors.headerText).toBe(DEFAULT_FLEX_CONFIG.colors.headerText);
    expect(result.colors.accentColor).toBe(DEFAULT_FLEX_CONFIG.colors.accentColor);
    expect(result.colors.bodyText).toBe(DEFAULT_FLEX_CONFIG.colors.bodyText);
    expect(result.colors.buttonColor).toBe(DEFAULT_FLEX_CONFIG.colors.buttonColor);
  });

  it("壊れたJSON -> デフォルトにフォールバック", async () => {
    mockGetSetting.mockResolvedValue("{{invalid");

    const result = await getFlexConfig();
    expect(result).toEqual(DEFAULT_FLEX_CONFIG);
  });

  it("tenantId渡し -> getSettingに渡る", async () => {
    mockGetSetting.mockResolvedValue(null);

    await getFlexConfig("tenant-xyz");
    expect(mockGetSetting).toHaveBeenCalledWith("flex", "config", "tenant-xyz");
  });
});

// ---------- setFlexConfig ----------
describe("setFlexConfig", () => {
  it("差分マージ + 保存", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);

    await setFlexConfig({ colors: { ...DEFAULT_FLEX_CONFIG.colors, headerBg: "#ff0000" } });

    const savedJson = mockSetSetting.mock.calls[0][2];
    const saved = JSON.parse(savedJson);
    expect(saved.colors.headerBg).toBe("#ff0000");
    // デフォルト値がマージされている
    expect(saved.reservation).toEqual(DEFAULT_FLEX_CONFIG.reservation);
    expect(saved.shipping).toEqual(DEFAULT_FLEX_CONFIG.shipping);
  });

  it("setSettingが正しい引数で呼ばれる", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);

    await setFlexConfig({}, "tenant-abc");

    expect(mockSetSetting).toHaveBeenCalledWith(
      "flex",
      "config",
      expect.any(String),
      "tenant-abc",
    );
  });

  it("setSettingの戻り値がそのまま返る", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(false);

    const result = await setFlexConfig({});
    expect(result).toBe(false);
  });
});
