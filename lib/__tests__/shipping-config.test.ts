// lib/__tests__/shipping-config.test.ts — 配送設定 + 追跡URL のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();

vi.mock("@/lib/settings", () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
}));

import { getShippingConfig, setShippingConfig, getYamatoConfig } from "@/lib/shipping/config";
import { DEFAULT_SHIPPING_CONFIG, getTrackingUrl } from "@/lib/shipping/types";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- getShippingConfig ----------
describe("getShippingConfig", () => {
  it("DB値null -> DEFAULT_SHIPPING_CONFIG を返す", async () => {
    mockGetSetting.mockResolvedValue(null);

    const result = await getShippingConfig();
    expect(result).toEqual(DEFAULT_SHIPPING_CONFIG);
  });

  it("有効JSON -> デフォルトとマージ", async () => {
    const partial = {
      defaultCarrier: "japanpost",
      yamato: { senderName: "テストクリニック" },
    };
    mockGetSetting.mockResolvedValue(JSON.stringify(partial));

    const result = await getShippingConfig();
    expect(result.defaultCarrier).toBe("japanpost");
    expect(result.yamato.senderName).toBe("テストクリニック");
    // マージされるのでデフォルト値も保持
    expect(result.yamato.senderPostal).toBe(DEFAULT_SHIPPING_CONFIG.yamato.senderPostal);
    expect(result.japanpost).toEqual(DEFAULT_SHIPPING_CONFIG.japanpost);
  });

  it("yamato部分のみ上書き -> japanpostはデフォルト", async () => {
    const partial = {
      yamato: { senderName: "別のクリニック", itemName: "化粧品" },
    };
    mockGetSetting.mockResolvedValue(JSON.stringify(partial));

    const result = await getShippingConfig();
    expect(result.yamato.senderName).toBe("別のクリニック");
    expect(result.yamato.itemName).toBe("化粧品");
    expect(result.yamato.senderPostal).toBe(DEFAULT_SHIPPING_CONFIG.yamato.senderPostal);
    expect(result.japanpost).toEqual(DEFAULT_SHIPPING_CONFIG.japanpost);
  });

  it("壊れたJSON -> デフォルトにフォールバック", async () => {
    mockGetSetting.mockResolvedValue("not valid json{{{");

    const result = await getShippingConfig();
    expect(result).toEqual(DEFAULT_SHIPPING_CONFIG);
  });

  it("tenantId渡し -> getSettingに渡る", async () => {
    mockGetSetting.mockResolvedValue(null);

    await getShippingConfig("tenant-ship");
    expect(mockGetSetting).toHaveBeenCalledWith("general", "shipping_config", "tenant-ship");
  });
});

// ---------- setShippingConfig ----------
describe("setShippingConfig", () => {
  it("差分マージ保存", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);

    await setShippingConfig({ defaultCarrier: "japanpost" });

    const savedJson = mockSetSetting.mock.calls[0][2];
    const saved = JSON.parse(savedJson);
    expect(saved.defaultCarrier).toBe("japanpost");
    // yamato, japanpostはデフォルト値がマージされる
    expect(saved.yamato).toEqual(DEFAULT_SHIPPING_CONFIG.yamato);
    expect(saved.japanpost).toEqual(DEFAULT_SHIPPING_CONFIG.japanpost);
  });

  it("yamato部分だけ更新 -> japanpostはそのまま", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);

    await setShippingConfig({
      yamato: { ...DEFAULT_SHIPPING_CONFIG.yamato, senderName: "新クリニック" },
    });

    const savedJson = mockSetSetting.mock.calls[0][2];
    const saved = JSON.parse(savedJson);
    expect(saved.yamato.senderName).toBe("新クリニック");
    expect(saved.japanpost).toEqual(DEFAULT_SHIPPING_CONFIG.japanpost);
  });

  it("setSettingが正しい引数で呼ばれる", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);

    await setShippingConfig({}, "tenant-abc");

    expect(mockSetSetting).toHaveBeenCalledWith(
      "general",
      "shipping_config",
      expect.any(String),
      "tenant-abc",
    );
  });
});

// ---------- getYamatoConfig ----------
describe("getYamatoConfig", () => {
  it("getShippingConfig().yamato を返す", async () => {
    mockGetSetting.mockResolvedValue(null);

    const result = await getYamatoConfig();
    expect(result).toEqual(DEFAULT_SHIPPING_CONFIG.yamato);
  });

  it("カスタム値がある場合はマージされたyamatoを返す", async () => {
    const partial = { yamato: { senderName: "カスタム名" } };
    mockGetSetting.mockResolvedValue(JSON.stringify(partial));

    const result = await getYamatoConfig();
    expect(result.senderName).toBe("カスタム名");
    expect(result.senderPostal).toBe(DEFAULT_SHIPPING_CONFIG.yamato.senderPostal);
  });
});

// ---------- getTrackingUrl ----------
describe("getTrackingUrl", () => {
  it("yamato -> クロネコヤマトURL", () => {
    const url = getTrackingUrl("yamato", "1234567890");
    expect(url).toContain("kuronekoyamato.co.jp");
    expect(url).toContain("1234567890");
  });

  it("japanpost -> 日本郵便URL", () => {
    const url = getTrackingUrl("japanpost", "9876543210");
    expect(url).toContain("post.japanpost.jp");
    expect(url).toContain("9876543210");
  });

  it("追跡番号がURLに含まれる", () => {
    const trackingNo = "TRACK-ABC-123";
    const yamatoUrl = getTrackingUrl("yamato", trackingNo);
    const jpUrl = getTrackingUrl("japanpost", trackingNo);
    expect(yamatoUrl).toContain(trackingNo);
    expect(jpUrl).toContain(trackingNo);
  });
});
