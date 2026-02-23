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

/**
 * 全テーブルのモックを一括設定するヘルパー
 * planName: テナントのプラン名（null = プラン未設定）
 * overrides: feature_flags オーバーライド
 * activeOptions: tenant_options の有効なオプションキー
 */
async function setupFromMock(opts: {
  planName?: string | null;
  overrides?: Array<{ key: string; value: string }>;
  activeOptions?: string[];
}) {
  const { planName = null, overrides = [], activeOptions = [] } = opts;
  const { supabaseAdmin } = await import("@/lib/supabase");
  (supabaseAdmin.from as any).mockImplementation((table: string) => {
    if (table === "tenant_settings") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: overrides }),
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
                Promise.resolve({
                  data: planName ? { plan_name: planName } : null,
                }),
            }),
          }),
        }),
      };
    }
    if (table === "tenant_options") {
      // hasFeature 用（select("is_active").eq().eq().maybeSingle()）と
      // getEnabledFeatures 用（select("option_key").eq().eq()）両対応
      return {
        select: (cols: string) => ({
          eq: () => ({
            eq: (_col: string, val: string) => {
              if (cols === "is_active") {
                // hasFeature: option_key で個別チェック
                const found = activeOptions.includes(val);
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: found ? { is_active: true } : null,
                    }),
                };
              }
              // getEnabledFeatures: is_active=true の一覧取得
              return Promise.resolve({
                data: activeOptions.map((k) => ({ option_key: k })),
              });
            },
          }),
        }),
      };
    }
    return { select: mockSelect };
  });
}

import {
  hasFeature,
  getEnabledFeatures,
  getPlanFeatures,
  ALL_FEATURES,
  BASE_FEATURES,
  AI_OPTION_FEATURES,
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
    it("ALL_FEATURES に11個の機能が含まれる", () => {
      expect(ALL_FEATURES).toHaveLength(11);
      expect(ALL_FEATURES).toContain("broadcast");
      expect(ALL_FEATURES).toContain("ai_reply");
      expect(ALL_FEATURES).toContain("reorder");
      expect(ALL_FEATURES).toContain("voice_input");
      expect(ALL_FEATURES).toContain("ai_karte");
    });

    it("BASE_FEATURES に8個のベース機能が含まれる", () => {
      expect(BASE_FEATURES).toHaveLength(8);
      expect(BASE_FEATURES).toContain("broadcast");
      expect(BASE_FEATURES).toContain("reorder");
      expect(BASE_FEATURES).not.toContain("ai_reply");
    });

    it("AI_OPTION_FEATURES に3つのAIオプションが含まれる", () => {
      expect(AI_OPTION_FEATURES).toHaveLength(3);
      expect(AI_OPTION_FEATURES).toContain("ai_reply");
      expect(AI_OPTION_FEATURES).toContain("voice_input");
      expect(AI_OPTION_FEATURES).toContain("ai_karte");
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

    it("不明なプランはベース機能を返す", () => {
      const features = getPlanFeatures("unknown");
      expect(features).toHaveLength(BASE_FEATURES.length);
      for (const f of BASE_FEATURES) {
        expect(features).toContain(f);
      }
    });
  });

  describe("hasFeature", () => {
    it("tenantId が null なら全機能有効", async () => {
      expect(await hasFeature(null, "ai_reply")).toBe(true);
      expect(await hasFeature(null, "broadcast")).toBe(true);
      expect(await hasFeature(null, "multi_doctor")).toBe(true);
    });

    it("ベース機能はプランに関係なく有効", async () => {
      await setupFromMock({ planName: "trial" });

      expect(await hasFeature("tenant-1", "broadcast")).toBe(true);
      expect(await hasFeature("tenant-1", "reorder")).toBe(true);
      expect(await hasFeature("tenant-1", "rich_menu")).toBe(true);
    });

    it("AIオプション未契約なら無効", async () => {
      await setupFromMock({ planName: "standard", activeOptions: [] });

      expect(await hasFeature("tenant-1", "ai_reply")).toBe(false);
      expect(await hasFeature("tenant-1", "voice_input")).toBe(false);
      expect(await hasFeature("tenant-1", "ai_karte")).toBe(false);
    });

    it("AIオプション契約済みなら有効", async () => {
      await setupFromMock({
        planName: "standard",
        activeOptions: ["ai_reply", "ai_karte"],
      });

      expect(await hasFeature("tenant-1", "ai_reply")).toBe(true);
      expect(await hasFeature("tenant-1", "ai_karte")).toBe(true);
      expect(await hasFeature("tenant-1", "voice_input")).toBe(false);
    });

    it("オーバーライドでAIオプションを強制有効にできる", async () => {
      await setupFromMock({
        planName: "trial",
        overrides: [{ key: "ai_reply", value: "true" }],
        activeOptions: [],
      });

      // オーバーライドが最優先
      expect(await hasFeature("tenant-1", "ai_reply")).toBe(true);
    });

    it("オーバーライドでベース機能を無効にできる", async () => {
      await setupFromMock({
        planName: "standard",
        overrides: [{ key: "broadcast", value: "false" }],
      });

      // broadcast はベース機能だがオーバーライドで無効
      expect(await hasFeature("tenant-1", "broadcast")).toBe(false);
    });

    it("プラン未設定でもベース機能は有効", async () => {
      await setupFromMock({ planName: null, activeOptions: [] });

      expect(await hasFeature("tenant-1", "broadcast")).toBe(true);
      expect(await hasFeature("tenant-1", "reorder")).toBe(true);
    });

    it("プラン未設定でAIオプション未契約なら無効", async () => {
      await setupFromMock({ planName: null, activeOptions: [] });

      expect(await hasFeature("tenant-1", "ai_reply")).toBe(false);
    });
  });

  describe("getEnabledFeatures", () => {
    it("tenantId が null なら全機能を返す", async () => {
      const features = await getEnabledFeatures(null);
      expect(features).toHaveLength(ALL_FEATURES.length);
    });

    it("ベース機能 + AIオプション契約分を返す", async () => {
      await setupFromMock({
        planName: "standard",
        activeOptions: ["ai_reply"],
      });

      const features = await getEnabledFeatures("tenant-1");
      // ベース機能8個は必ず含まれる
      for (const f of BASE_FEATURES) {
        expect(features).toContain(f);
      }
      // 契約済みAIオプション
      expect(features).toContain("ai_reply");
      // 未契約AIオプション
      expect(features).not.toContain("voice_input");
      expect(features).not.toContain("ai_karte");
    });

    it("AIオプション未契約ならベース機能のみ", async () => {
      await setupFromMock({ planName: "standard", activeOptions: [] });

      const features = await getEnabledFeatures("tenant-1");
      expect(features).toHaveLength(BASE_FEATURES.length);
      expect(features).not.toContain("ai_reply");
    });
  });
});
