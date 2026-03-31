// lib/__tests__/industry-config.test.ts
// 業種別設定（機能フラグ・用語・セクションラベル）のテスト
import { describe, it, expect } from "vitest";
import {
  generateFeatureFlagSettings,
  getTerm,
  getSectionLabel,
  INDUSTRY_FEATURE_DEFAULTS,
} from "../industry-config";

describe("generateFeatureFlagSettings", () => {
  // === clinic ===
  describe("clinic", () => {
    const settings = generateFeatureFlagSettings("clinic");
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    it("intake_form が true", () => {
      expect(map.intake_form).toBe("true");
    });

    it("hotpepper_sync が含まれない（clinicには未定義）", () => {
      expect(map.hotpepper_sync).toBeUndefined();
    });

    it("on の機能は true として出力される", () => {
      expect(map.broadcast).toBe("true");
      expect(map.reorder).toBe("true");
    });

    it("option の機能は出力されない（ai_reply等）", () => {
      expect(map.ai_reply).toBeUndefined();
    });
  });

  // === salon ===
  describe("salon", () => {
    const settings = generateFeatureFlagSettings("salon");
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    it("hotpepper_sync が true", () => {
      expect(map.hotpepper_sync).toBe("true");
    });

    it("reorder が含まれない（salonには未定義）", () => {
      expect(map.reorder).toBeUndefined();
    });

    it("salon_karte が true", () => {
      expect(map.salon_karte).toBe("true");
    });

    it("ai_reply が false（salonではoff）", () => {
      expect(map.ai_reply).toBe("false");
    });
  });

  // === ec ===
  describe("ec", () => {
    const settings = generateFeatureFlagSettings("ec");
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    it("cart_abandonment が true", () => {
      expect(map.cart_abandonment).toBe("true");
    });

    it("salon_karte が含まれない（ecには未定義）", () => {
      expect(map.salon_karte).toBeUndefined();
    });

    it("ec_integration が true", () => {
      expect(map.ec_integration).toBe("true");
    });

    it("subscription が true", () => {
      expect(map.subscription).toBe("true");
    });
  });

  // === other ===
  describe("other", () => {
    const settings = generateFeatureFlagSettings("other");
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    it("broadcast が true（LINE CRMコアは有効）", () => {
      expect(map.broadcast).toBe("true");
    });

    it("option の機能（reservation等）は出力されない", () => {
      expect(map.reservation).toBeUndefined();
    });
  });
});

describe("getTerm", () => {
  it("salon の customer は「お客様」", () => {
    expect(getTerm("salon", "customer")).toBe("お客様");
  });

  it("clinic の customer は「患者」", () => {
    expect(getTerm("clinic", "customer")).toBe("患者");
  });

  it("ec の customer は「顧客」", () => {
    expect(getTerm("ec", "customer")).toBe("顧客");
  });

  it("other の customer は「友だち」", () => {
    expect(getTerm("other", "customer")).toBe("友だち");
  });

  it("未定義のキーはそのまま返す", () => {
    expect(getTerm("salon", "unknown_key")).toBe("unknown_key");
  });
});

describe("getSectionLabel", () => {
  it("ec の「予約・診察」は「注文管理」に変換される", () => {
    expect(getSectionLabel("ec", "予約・診察")).toBe("注文管理");
  });

  it("salon の「予約・診察」は「予約・施術」に変換される", () => {
    expect(getSectionLabel("salon", "予約・診察")).toBe("予約・施術");
  });

  it("clinic の「予約・診察」はそのまま「予約・診察」", () => {
    expect(getSectionLabel("clinic", "予約・診察")).toBe("予約・診察");
  });

  it("未定義のセクションはそのまま返す", () => {
    expect(getSectionLabel("ec", "存在しないセクション")).toBe(
      "存在しないセクション"
    );
  });
});
