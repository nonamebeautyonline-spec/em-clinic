// lib/__tests__/flex-message.test.ts
// Flex Message設定・色バリデーション・テンプレートテスト
import { describe, it, expect } from "vitest";
import { DEFAULT_FLEX_CONFIG } from "@/lib/flex-message/types";
import type { FlexMessageConfig, FlexColorConfig } from "@/lib/flex-message/types";

// === デフォルト設定の完全性テスト ===
describe("Flex Message デフォルト設定", () => {
  it("colors が全プロパティを持つ", () => {
    const { colors } = DEFAULT_FLEX_CONFIG;
    expect(colors.headerBg).toBeTruthy();
    expect(colors.headerText).toBeTruthy();
    expect(colors.accentColor).toBeTruthy();
    expect(colors.bodyText).toBeTruthy();
    expect(colors.buttonColor).toBeTruthy();
  });

  it("reservation が全プロパティを持つ", () => {
    const { reservation } = DEFAULT_FLEX_CONFIG;
    expect(reservation.createdHeader).toBeTruthy();
    expect(reservation.createdPhoneNotice).toBeTruthy();
    expect(reservation.createdNote).toBeTruthy();
    expect(reservation.changedHeader).toBeTruthy();
    expect(reservation.changedPhoneNotice).toBeTruthy();
    expect(reservation.canceledHeader).toBeTruthy();
    expect(reservation.canceledNote).toBeTruthy();
  });

  it("shipping が全プロパティを持つ", () => {
    const { shipping } = DEFAULT_FLEX_CONFIG;
    expect(shipping.header).toBeTruthy();
    expect(shipping.deliveryNotice1).toBeTruthy();
    expect(shipping.deliveryNotice2).toBeTruthy();
    expect(shipping.storageNotice1).toBeTruthy();
    expect(shipping.storageNotice2).toBeTruthy();
    expect(shipping.buttonLabel).toBeTruthy();
    expect(shipping.footerNote).toBeTruthy();
    expect(shipping.truckImageUrl).toBeTruthy();
    expect(shipping.progressBarUrl).toBeTruthy();
  });
});

// === 色コードバリデーション ===
describe("Flex Message 色コードバリデーション", () => {
  function isValidHexColor(color: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(color);
  }

  it("デフォルト色は全て有効なHEXカラー", () => {
    const { colors } = DEFAULT_FLEX_CONFIG;
    expect(isValidHexColor(colors.headerBg)).toBe(true);
    expect(isValidHexColor(colors.headerText)).toBe(true);
    expect(isValidHexColor(colors.accentColor)).toBe(true);
    expect(isValidHexColor(colors.bodyText)).toBe(true);
    expect(isValidHexColor(colors.buttonColor)).toBe(true);
  });

  it("不正なHEXカラーを検出", () => {
    expect(isValidHexColor("#xyz123")).toBe(false);
    expect(isValidHexColor("ec4899")).toBe(false);
    expect(isValidHexColor("#ec48")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });

  it("headerBg はピンク系", () => {
    expect(DEFAULT_FLEX_CONFIG.colors.headerBg).toBe("#ec4899");
  });

  it("headerText は白", () => {
    expect(DEFAULT_FLEX_CONFIG.colors.headerText).toBe("#ffffff");
  });
});

// === 設定マージロジック ===
describe("Flex Message 設定マージ", () => {
  function mergeFlexConfig(
    defaults: FlexMessageConfig,
    overrides: Partial<FlexMessageConfig>
  ): FlexMessageConfig {
    return {
      colors: { ...defaults.colors, ...overrides.colors },
      reservation: { ...defaults.reservation, ...overrides.reservation },
      shipping: { ...defaults.shipping, ...overrides.shipping },
    };
  }

  it("部分的な上書きが可能", () => {
    const merged = mergeFlexConfig(DEFAULT_FLEX_CONFIG, {
      colors: { headerBg: "#ff0000" } as FlexColorConfig,
    });
    expect(merged.colors.headerBg).toBe("#ff0000");
    expect(merged.colors.headerText).toBe("#ffffff"); // デフォルト維持
  });

  it("上書きなしならデフォルト全維持", () => {
    const merged = mergeFlexConfig(DEFAULT_FLEX_CONFIG, {});
    expect(merged).toEqual(DEFAULT_FLEX_CONFIG);
  });

  it("reservation テキスト個別上書き", () => {
    const merged = mergeFlexConfig(DEFAULT_FLEX_CONFIG, {
      reservation: { createdHeader: "カスタム予約確定" } as any,
    });
    expect(merged.reservation.createdHeader).toBe("カスタム予約確定");
    expect(merged.reservation.canceledHeader).toBe("予約がキャンセルされました"); // デフォルト維持
  });
});

// === 追跡番号フォーマット ===
describe("Flex Message 追跡番号フォーマット", () => {
  function formatTrackingNumber(num: string): string {
    if (!num) return "";
    const digits = num.replace(/\D/g, "");
    if (digits.length === 12) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
    }
    return num;
  }

  it("12桁 → XXXX-XXXX-XXXX", () => {
    expect(formatTrackingNumber("123456789012")).toBe("1234-5678-9012");
  });

  it("12桁以外はそのまま", () => {
    expect(formatTrackingNumber("JP1234567890")).toBe("JP1234567890");
  });

  it("空文字 → 空文字", () => {
    expect(formatTrackingNumber("")).toBe("");
  });
});

// === 予約通知テキストの検証 ===
describe("Flex Message 予約通知テキスト", () => {
  it("予約確定通知に電話番号案内が含まれる", () => {
    const { reservation } = DEFAULT_FLEX_CONFIG;
    expect(reservation.createdPhoneNotice).toContain("090-");
  });

  it("キャンセル通知にマイページ案内が含まれる", () => {
    const { reservation } = DEFAULT_FLEX_CONFIG;
    expect(reservation.canceledNote).toContain("マイページ");
  });
});

// === 発送通知テキストの検証 ===
describe("Flex Message 発送通知テキスト", () => {
  it("冷蔵保管の注意文がある", () => {
    const { shipping } = DEFAULT_FLEX_CONFIG;
    expect(shipping.storageNotice1).toContain("冷蔵");
  });

  it("冷凍保存の警告文がある", () => {
    const { shipping } = DEFAULT_FLEX_CONFIG;
    expect(shipping.storageNotice2).toContain("冷凍");
  });

  it("ボタンラベルが設定されている", () => {
    expect(DEFAULT_FLEX_CONFIG.shipping.buttonLabel).toBe("配送状況を確認");
  });

  it("画像URLが有効なURLフォーマット", () => {
    expect(DEFAULT_FLEX_CONFIG.shipping.truckImageUrl).toMatch(/^https?:\/\//);
    expect(DEFAULT_FLEX_CONFIG.shipping.progressBarUrl).toMatch(/^https?:\/\//);
  });
});
