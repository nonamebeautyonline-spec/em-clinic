// lib/__tests__/plan-config.test.ts
// プラン定義・オプション定義のテスト

import { describe, it, expect } from "vitest";
import {
  MESSAGE_PLANS,
  AI_OPTIONS,
  AI_OPTION_KEYS,
  getPlanByKey,
  getOptionByKey,
  calculateMonthlyTotal,
} from "@/lib/plan-config";

describe("MESSAGE_PLANS", () => {
  it("7つのプランが定義されている", () => {
    expect(MESSAGE_PLANS).toHaveLength(7);
  });

  it("全プランにキー・ラベル・クォータ・月額・超過単価がある", () => {
    for (const plan of MESSAGE_PLANS) {
      expect(plan.key).toBeTruthy();
      expect(plan.label).toBeTruthy();
      expect(plan.messageQuota).toBeGreaterThan(0);
      expect(plan.monthlyPrice).toBeGreaterThan(0);
      expect(plan.overageUnitPrice).toBeGreaterThan(0);
    }
  });

  it("クォータが昇順で並んでいる", () => {
    for (let i = 1; i < MESSAGE_PLANS.length; i++) {
      expect(MESSAGE_PLANS[i].messageQuota).toBeGreaterThan(
        MESSAGE_PLANS[i - 1].messageQuota
      );
    }
  });

  it("月額がクォータに対して概ね妥当（最安vs最大で単価低下）", () => {
    const firstPerMsg =
      MESSAGE_PLANS[0].monthlyPrice / MESSAGE_PLANS[0].messageQuota;
    const lastPerMsg =
      MESSAGE_PLANS[MESSAGE_PLANS.length - 1].monthlyPrice /
      MESSAGE_PLANS[MESSAGE_PLANS.length - 1].messageQuota;
    expect(lastPerMsg).toBeLessThan(firstPerMsg);
  });

  it("Lステップ比2割減の範囲内", () => {
    // Lステップの公開価格（税込）
    const lstepPrices: Record<string, number> = {
      light: 5000, // スタート
      standard: 21780,
      pro: 32780,
      business: 87780,
      business_30: 131780,
      business_50: 142780,
      business_100: 197780,
    };

    for (const plan of MESSAGE_PLANS) {
      const lstep = lstepPrices[plan.key];
      if (lstep) {
        const ratio = plan.monthlyPrice / lstep;
        // 2割減 = 0.8。0.7〜0.85の範囲に収まることを確認
        expect(ratio).toBeGreaterThanOrEqual(0.7);
        expect(ratio).toBeLessThanOrEqual(0.85);
      }
    }
  });
});

describe("AI_OPTIONS", () => {
  it("3つのAIオプションが定義されている", () => {
    expect(AI_OPTIONS).toHaveLength(3);
  });

  it("AI返信: ¥20,000", () => {
    const opt = AI_OPTIONS.find((o) => o.key === "ai_reply");
    expect(opt).toBeDefined();
    expect(opt!.monthlyPrice).toBe(20000);
  });

  it("音声入力: ¥15,000", () => {
    const opt = AI_OPTIONS.find((o) => o.key === "voice_input");
    expect(opt).toBeDefined();
    expect(opt!.monthlyPrice).toBe(15000);
  });

  it("AIカルテ: ¥20,000", () => {
    const opt = AI_OPTIONS.find((o) => o.key === "ai_karte");
    expect(opt).toBeDefined();
    expect(opt!.monthlyPrice).toBe(20000);
  });

  it("AI_OPTION_KEYS にキーが正しく列挙される", () => {
    expect(AI_OPTION_KEYS).toEqual(["ai_reply", "voice_input", "ai_karte"]);
  });
});

describe("getPlanByKey", () => {
  it("存在するキーでプランを取得できる", () => {
    expect(getPlanByKey("standard")).toEqual(
      expect.objectContaining({ key: "standard", messageQuota: 30000 })
    );
  });

  it("存在しないキーは undefined", () => {
    expect(getPlanByKey("nonexistent")).toBeUndefined();
  });
});

describe("getOptionByKey", () => {
  it("存在するキーでオプションを取得できる", () => {
    expect(getOptionByKey("ai_reply")).toEqual(
      expect.objectContaining({ key: "ai_reply", monthlyPrice: 20000 })
    );
  });

  it("存在しないキーは undefined", () => {
    expect(getOptionByKey("nonexistent")).toBeUndefined();
  });
});

describe("calculateMonthlyTotal", () => {
  it("プランのみ（オプションなし）", () => {
    expect(calculateMonthlyTotal("standard", [])).toBe(17000);
  });

  it("プラン + AI返信", () => {
    expect(calculateMonthlyTotal("standard", ["ai_reply"])).toBe(37000);
  });

  it("プラン + 全AIオプション", () => {
    // 17000 + 20000 + 15000 + 20000 = 72000
    expect(
      calculateMonthlyTotal("standard", [
        "ai_reply",
        "voice_input",
        "ai_karte",
      ])
    ).toBe(72000);
  });

  it("存在しないプランは0", () => {
    expect(calculateMonthlyTotal("nonexistent", [])).toBe(0);
  });

  it("存在しないオプションは無視", () => {
    expect(calculateMonthlyTotal("standard", ["nonexistent"])).toBe(17000);
  });
});
