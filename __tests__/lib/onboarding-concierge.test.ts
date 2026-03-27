// __tests__/lib/onboarding-concierge.test.ts
// オンボーディングAIコンシェルジュ定義のテスト

import { describe, it, expect } from "vitest";
import {
  ONBOARDING_EXPLANATIONS,
  DETAIL_PROMPTS,
  CONCIERGE_SYSTEM_PROMPT,
  type OnboardingStep,
} from "@/lib/onboarding-concierge";

const ALL_STEPS: OnboardingStep[] = ["line", "payment", "products", "schedule"];

describe("ONBOARDING_EXPLANATIONS", () => {
  it("全4ステップの解説が定義されている", () => {
    for (const step of ALL_STEPS) {
      expect(ONBOARDING_EXPLANATIONS[step]).toBeDefined();
      expect(typeof ONBOARDING_EXPLANATIONS[step]).toBe("string");
    }
  });

  it("各解説が空でない", () => {
    for (const step of ALL_STEPS) {
      expect(ONBOARDING_EXPLANATIONS[step].length).toBeGreaterThan(20);
    }
  });

  it("日本語で記述されている", () => {
    for (const step of ALL_STEPS) {
      // ひらがな・カタカナ・漢字を含むか
      expect(ONBOARDING_EXPLANATIONS[step]).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/);
    }
  });
});

describe("DETAIL_PROMPTS", () => {
  it("全4ステップのプロンプトが定義されている", () => {
    for (const step of ALL_STEPS) {
      expect(DETAIL_PROMPTS[step]).toBeDefined();
      expect(typeof DETAIL_PROMPTS[step]).toBe("string");
    }
  });

  it("各プロンプトに具体的な指示が含まれている", () => {
    for (const step of ALL_STEPS) {
      // 番号付きリストを含むか
      expect(DETAIL_PROMPTS[step]).toMatch(/1\./);
      expect(DETAIL_PROMPTS[step]).toMatch(/2\./);
    }
  });
});

describe("CONCIERGE_SYSTEM_PROMPT", () => {
  it("日本語で回答する指示がある", () => {
    expect(CONCIERGE_SYSTEM_PROMPT).toContain("日本語");
  });

  it("文字数制限の指示がある", () => {
    expect(CONCIERGE_SYSTEM_PROMPT).toMatch(/600文字/);
  });

  it("Lオペ for CLINICの名前が含まれている", () => {
    expect(CONCIERGE_SYSTEM_PROMPT).toContain("Lオペ for CLINIC");
  });
});
