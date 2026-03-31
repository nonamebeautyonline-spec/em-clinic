// lib/__tests__/industry-menu-config.test.ts
// 業種別メニュー表示制御のテスト
import { describe, it, expect } from "vitest";
import {
  INDUSTRY_MENU_MAP,
  isMenuVisibleForIndustry,
  getVisibleMenuKeys,
} from "../industry-menu-config";

describe("INDUSTRY_MENU_MAP", () => {
  // === clinic ===
  describe("clinic", () => {
    it("karte が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.clinic).toContain("karte");
    });

    it("stylists が含まれない", () => {
      expect(INDUSTRY_MENU_MAP.clinic).not.toContain("stylists");
    });

    it("dashboard が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.clinic).toContain("dashboard");
    });
  });

  // === salon ===
  describe("salon", () => {
    it("stylists が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.salon).toContain("stylists");
    });

    it("karte が含まれない", () => {
      expect(INDUSTRY_MENU_MAP.salon).not.toContain("karte");
    });

    it("salon_karte が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.salon).toContain("salon_karte");
    });

    it("hotpepper が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.salon).toContain("hotpepper");
    });
  });

  // === ec ===
  describe("ec", () => {
    it("ec_settings が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.ec).toContain("ec_settings");
    });

    it("stylists が含まれない", () => {
      expect(INDUSTRY_MENU_MAP.ec).not.toContain("stylists");
    });

    it("rfm が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.ec).toContain("rfm");
    });

    it("shipping が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.ec).toContain("shipping");
    });
  });

  // === other ===
  describe("other", () => {
    it("line が含まれる", () => {
      expect(INDUSTRY_MENU_MAP.other).toContain("line");
    });

    it("最小限のメニューセット（clinic/salon専用メニューは除外）", () => {
      expect(INDUSTRY_MENU_MAP.other).not.toContain("karte");
      expect(INDUSTRY_MENU_MAP.other).not.toContain("stylists");
      expect(INDUSTRY_MENU_MAP.other).not.toContain("salon_karte");
      expect(INDUSTRY_MENU_MAP.other).not.toContain("ec_settings");
    });

    it("dashboard, settings, help は含まれる", () => {
      expect(INDUSTRY_MENU_MAP.other).toContain("dashboard");
      expect(INDUSTRY_MENU_MAP.other).toContain("settings");
      expect(INDUSTRY_MENU_MAP.other).toContain("help");
    });
  });
});

describe("isMenuVisibleForIndustry", () => {
  it("salon で stylists は表示可能", () => {
    expect(isMenuVisibleForIndustry("salon", "stylists")).toBe(true);
  });

  it("clinic で stylists は表示不可", () => {
    expect(isMenuVisibleForIndustry("clinic", "stylists")).toBe(false);
  });

  it("ec で ec_settings は表示可能", () => {
    expect(isMenuVisibleForIndustry("ec", "ec_settings")).toBe(true);
  });
});

describe("getVisibleMenuKeys", () => {
  it("allowedMenuKeys=null の場合、業種フィルタのみ適用", () => {
    const keys = getVisibleMenuKeys("salon", null);
    expect(keys).toEqual(INDUSTRY_MENU_MAP.salon);
  });

  it("salon でロール許可が [dashboard, stylists, karte] の場合、karteは除外される", () => {
    const keys = getVisibleMenuKeys("salon", [
      "dashboard",
      "stylists",
      "karte",
    ]);
    // karte は salon の INDUSTRY_MENU_MAP に含まれないのでフィルタされる
    expect(keys).toContain("dashboard");
    expect(keys).toContain("stylists");
    expect(keys).not.toContain("karte");
  });

  it("ロール許可に含まれないメニューは除外される", () => {
    const keys = getVisibleMenuKeys("salon", ["dashboard"]);
    // dashboard のみ返る（salonのメニューで且つロール許可されたもの）
    expect(keys).toEqual(["dashboard"]);
  });

  it("空のallowedMenuKeysの場合、何も返さない", () => {
    const keys = getVisibleMenuKeys("salon", []);
    expect(keys).toEqual([]);
  });
});
