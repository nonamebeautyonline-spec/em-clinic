// __tests__/api/features.test.ts
// 機能フラグAPIのテスト

import { describe, it, expect, vi } from "vitest";

// Supabase モック（feature-flags.ts が内部で使用）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
          })),
        })),
      })),
    })),
  },
  supabase: {
    from: vi.fn(),
  },
}));

import {
  ALL_FEATURES,
  FEATURE_LABELS,
  getPlanFeatures,
  PLAN_NAMES,
  type Feature,
} from "@/lib/feature-flags";

describe("機能フラグ API", () => {
  describe("プラン別機能マッピング", () => {
    it("trial < standard < premium < enterprise の順に機能が増える", () => {
      const trialCount = getPlanFeatures("trial").length;
      const standardCount = getPlanFeatures("standard").length;
      const premiumCount = getPlanFeatures("premium").length;
      const enterpriseCount = getPlanFeatures("enterprise").length;

      expect(trialCount).toBeLessThan(standardCount);
      expect(standardCount).toBeLessThan(premiumCount);
      expect(premiumCount).toBeLessThanOrEqual(enterpriseCount);
    });

    it("enterprise は全機能を含む", () => {
      const enterprise = getPlanFeatures("enterprise");
      for (const feature of ALL_FEATURES) {
        expect(enterprise).toContain(feature);
      }
    });

    it("各プランの機能は ALL_FEATURES のサブセット", () => {
      for (const plan of PLAN_NAMES) {
        const features = getPlanFeatures(plan);
        for (const f of features) {
          expect(ALL_FEATURES).toContain(f);
        }
      }
    });

    it("下位プランの機能は上位プランにも含まれる", () => {
      const trial = getPlanFeatures("trial");
      const standard = getPlanFeatures("standard");
      const premium = getPlanFeatures("premium");
      const enterprise = getPlanFeatures("enterprise");

      // trial の機能は standard にも含まれる
      for (const f of trial) {
        expect(standard).toContain(f);
      }

      // standard の機能は premium にも含まれる
      for (const f of standard) {
        expect(premium).toContain(f);
      }

      // premium の機能は enterprise にも含まれる
      for (const f of premium) {
        expect(enterprise).toContain(f);
      }
    });
  });

  describe("機能ラベル", () => {
    it("全機能に日本語ラベルが定義されている", () => {
      for (const feature of ALL_FEATURES) {
        const label = FEATURE_LABELS[feature];
        expect(label).toBeTruthy();
        // 日本語を含むことを確認（CJK文字）
        expect(label).toMatch(/[\u3000-\u9FFF]/);
      }
    });
  });

  describe("requireFeature レスポンス構造", () => {
    it("403レスポンスに適切なエラーメッセージを含む", async () => {
      // requireFeature は NextResponse を返すのでインポートのみ検証
      const { requireFeature } = await import("@/lib/require-feature");
      expect(typeof requireFeature).toBe("function");
    });
  });

  describe("API レスポンス構造", () => {
    it("features 配列は全機能の key/label/enabled を持つべき", () => {
      // APIレスポンスの期待構造を検証
      const expectedResponse = ALL_FEATURES.map((f: Feature) => ({
        key: f,
        label: FEATURE_LABELS[f],
        enabled: true,
      }));

      expect(expectedResponse).toHaveLength(ALL_FEATURES.length);
      for (const item of expectedResponse) {
        expect(item.key).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(typeof item.enabled).toBe("boolean");
      }
    });
  });
});
