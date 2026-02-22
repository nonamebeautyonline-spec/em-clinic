// lib/__tests__/feature-flags.test.ts
// 機能フラグのユニットテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

// モックチェーンのセットアップ
function setupMockChain() {
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
}

import {
  hasFeature,
  getEnabledFeatures,
  getPlanFeatures,
  ALL_FEATURES,
  FEATURE_LABELS,
  PLAN_NAMES,
  type Feature,
} from "@/lib/feature-flags";

describe("feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockChain();
  });

  describe("定数", () => {
    it("ALL_FEATURES に9つの機能が含まれる", () => {
      expect(ALL_FEATURES).toHaveLength(9);
      expect(ALL_FEATURES).toContain("broadcast");
      expect(ALL_FEATURES).toContain("ai_reply");
      expect(ALL_FEATURES).toContain("reorder");
    });

    it("FEATURE_LABELS が全機能の日本語ラベルを持つ", () => {
      for (const feature of ALL_FEATURES) {
        expect(FEATURE_LABELS[feature]).toBeTruthy();
        expect(typeof FEATURE_LABELS[feature]).toBe("string");
      }
    });

    it("PLAN_NAMES に4つのプランが含まれる", () => {
      expect(PLAN_NAMES).toEqual(["trial", "standard", "premium", "enterprise"]);
    });
  });

  describe("getPlanFeatures", () => {
    it("trial プランは broadcast と keyword_reply のみ", () => {
      const features = getPlanFeatures("trial");
      expect(features).toContain("broadcast");
      expect(features).toContain("keyword_reply");
      expect(features).toHaveLength(2);
    });

    it("standard プランは5つの機能を持つ", () => {
      const features = getPlanFeatures("standard");
      expect(features).toContain("broadcast");
      expect(features).toContain("rich_menu");
      expect(features).toContain("keyword_reply");
      expect(features).toContain("reorder");
      expect(features).toContain("form_builder");
      expect(features).toHaveLength(5);
    });

    it("premium プランは8つの機能を持つ", () => {
      const features = getPlanFeatures("premium");
      expect(features).toHaveLength(8);
      expect(features).toContain("ai_reply");
      expect(features).toContain("step_scenario");
      expect(features).toContain("analytics");
    });

    it("enterprise プランは全機能を持つ", () => {
      const features = getPlanFeatures("enterprise");
      expect(features).toHaveLength(ALL_FEATURES.length);
      for (const f of ALL_FEATURES) {
        expect(features).toContain(f);
      }
    });

    it("不明なプランは空配列を返す", () => {
      expect(getPlanFeatures("unknown")).toEqual([]);
    });
  });

  describe("hasFeature", () => {
    it("tenantId が null なら全機能有効", async () => {
      expect(await hasFeature(null, "ai_reply")).toBe(true);
      expect(await hasFeature(null, "broadcast")).toBe(true);
      expect(await hasFeature(null, "multi_doctor")).toBe(true);
    });

    it("プランに含まれる機能は有効", async () => {
      // tenant_settings: オーバーライドなし
      mockEq.mockImplementation(function (this: any, col: string, val: string) {
        if (col === "category" && val === "feature_flags") {
          return { ...this, data: [] } as any;
        }
        if (col === "status" && val === "active") {
          return {
            maybeSingle: () => Promise.resolve({ data: { plan_name: "standard" } }),
          };
        }
        return this;
      });

      // tenant_settings SELECT
      const { supabaseAdmin } = await import("@/lib/supabase");
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === "tenant_settings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "tenant_plans") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { plan_name: "standard" } }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      expect(await hasFeature("tenant-1", "broadcast")).toBe(true);
      expect(await hasFeature("tenant-1", "reorder")).toBe(true);
    });

    it("プランに含まれない機能は無効", async () => {
      const { supabaseAdmin } = await import("@/lib/supabase");
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === "tenant_settings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "tenant_plans") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { plan_name: "trial" } }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      expect(await hasFeature("tenant-1", "ai_reply")).toBe(false);
      expect(await hasFeature("tenant-1", "reorder")).toBe(false);
    });

    it("オーバーライドでプラン外の機能を有効にできる", async () => {
      const { supabaseAdmin } = await import("@/lib/supabase");
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === "tenant_settings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [{ key: "ai_reply", value: "true" }],
                  }),
              }),
            }),
          };
        }
        if (table === "tenant_plans") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { plan_name: "trial" } }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      // trial は通常 ai_reply を含まないが、オーバーライドで有効
      expect(await hasFeature("tenant-1", "ai_reply")).toBe(true);
    });

    it("オーバーライドでプラン内の機能を無効にできる", async () => {
      const { supabaseAdmin } = await import("@/lib/supabase");
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === "tenant_settings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [{ key: "broadcast", value: "false" }],
                  }),
              }),
            }),
          };
        }
        if (table === "tenant_plans") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { plan_name: "standard" } }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      // standard は broadcast を含むが、オーバーライドで無効
      expect(await hasFeature("tenant-1", "broadcast")).toBe(false);
    });

    it("プラン未設定のテナントは機能なし", async () => {
      const { supabaseAdmin } = await import("@/lib/supabase");
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === "tenant_settings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "tenant_plans") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      expect(await hasFeature("tenant-1", "broadcast")).toBe(false);
    });
  });

  describe("getEnabledFeatures", () => {
    it("tenantId が null なら全機能を返す", async () => {
      const features = await getEnabledFeatures(null);
      expect(features).toHaveLength(ALL_FEATURES.length);
    });

    it("プランベースの機能一覧を返す", async () => {
      const { supabaseAdmin } = await import("@/lib/supabase");
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === "tenant_settings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "tenant_plans") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { plan_name: "standard" } }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const features = await getEnabledFeatures("tenant-1");
      expect(features).toContain("broadcast");
      expect(features).toContain("reorder");
      expect(features).not.toContain("ai_reply");
    });
  });
});
