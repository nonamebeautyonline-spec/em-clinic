// lib/__tests__/mypage-config.test.ts — マイページ設定のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();

vi.mock("@/lib/settings", () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
}));

import { getMypageConfig, setMypageConfig } from "@/lib/mypage/config";
import { DEFAULT_MYPAGE_CONFIG } from "@/lib/mypage/types";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- getMypageConfig ----------
describe("getMypageConfig", () => {
  it("DB値null -> デフォルト返却", async () => {
    mockGetSetting.mockResolvedValue(null);

    const result = await getMypageConfig();
    expect(result).toEqual(DEFAULT_MYPAGE_CONFIG);
  });

  it("有効JSON -> デフォルトとマージ", async () => {
    const partial = { colors: { primary: "#000000" }, sections: { showOrders: false } };
    mockGetSetting.mockResolvedValue(JSON.stringify(partial));

    const result = await getMypageConfig();
    expect(result.colors.primary).toBe("#000000");
    // マージされるのでデフォルト値も保持
    expect(result.colors.primaryHover).toBe(DEFAULT_MYPAGE_CONFIG.colors.primaryHover);
    expect(result.sections.showOrders).toBe(false);
    expect(result.sections.showReservation).toBe(DEFAULT_MYPAGE_CONFIG.sections.showReservation);
  });

  it("colors部分上書き -> 残りはデフォルト", async () => {
    const partial = { colors: { primary: "#111111", primaryHover: "#222222" } };
    mockGetSetting.mockResolvedValue(JSON.stringify(partial));

    const result = await getMypageConfig();
    expect(result.colors.primary).toBe("#111111");
    expect(result.colors.primaryHover).toBe("#222222");
    expect(result.colors.primaryLight).toBe(DEFAULT_MYPAGE_CONFIG.colors.primaryLight);
    expect(result.colors.pageBg).toBe(DEFAULT_MYPAGE_CONFIG.colors.pageBg);
    expect(result.colors.primaryText).toBe(DEFAULT_MYPAGE_CONFIG.colors.primaryText);
  });

  it("壊れたJSON -> デフォルトにフォールバック", async () => {
    mockGetSetting.mockResolvedValue("{broken json!!!");

    const result = await getMypageConfig();
    expect(result).toEqual(DEFAULT_MYPAGE_CONFIG);
  });

  it("tenantId渡し -> getSettingに渡る", async () => {
    mockGetSetting.mockResolvedValue(null);

    await getMypageConfig("tenant-123");
    expect(mockGetSetting).toHaveBeenCalledWith("mypage", "config", "tenant-123");
  });
});

// ---------- setMypageConfig ----------
describe("setMypageConfig", () => {
  it("差分だけ渡してもマージされる", async () => {
    // getMypageConfig内でgetSettingが呼ばれる（null -> デフォルト）
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);

    await setMypageConfig({ colors: { ...DEFAULT_MYPAGE_CONFIG.colors, primary: "#ff0000" } });

    const savedJson = mockSetSetting.mock.calls[0][2];
    const saved = JSON.parse(savedJson);
    expect(saved.colors.primary).toBe("#ff0000");
    // デフォルト値がマージされている
    expect(saved.sections).toEqual(DEFAULT_MYPAGE_CONFIG.sections);
    expect(saved.content).toEqual(DEFAULT_MYPAGE_CONFIG.content);
    expect(saved.labels).toEqual(DEFAULT_MYPAGE_CONFIG.labels);
  });

  it("setSetting が JSON.stringify で呼ばれる", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);

    await setMypageConfig({});

    expect(mockSetSetting).toHaveBeenCalledWith(
      "mypage",
      "config",
      expect.any(String), // JSON.stringifyされた文字列
      undefined,
    );
    // 第3引数がJSONとしてパース可能であること
    const savedJson = mockSetSetting.mock.calls[0][2];
    expect(() => JSON.parse(savedJson)).not.toThrow();
  });

  it("setSettingの戻り値がそのまま返る", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(false);

    const result = await setMypageConfig({});
    expect(result).toBe(false);
  });
});
