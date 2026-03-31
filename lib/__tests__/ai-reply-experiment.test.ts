// AI返信 A/Bテスト実験管理のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabaseモック
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: vi.fn(),
};
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockQueryBuilder) },
}));
vi.mock("@/lib/tenant", () => ({
  strictWithTenant: vi.fn(async (query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

import {
  selectVariant,
  generateSuggestion,
  getRunningExperiment,
  type Experiment,
} from "@/lib/ai-reply-experiment";

// テスト用の実験データを生成するヘルパー
function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: 1,
    experiment_name: "テスト実験",
    config: {
      control: { rag_similarity_threshold: 0.5 },
      variant: { rag_similarity_threshold: 0.7 },
    },
    traffic_ratio: 0.5,
    status: "running",
    started_at: "2026-01-01T00:00:00Z",
    ended_at: null,
    ...overrides,
  };
}

// テスト用のVariantStats型
interface VariantStats {
  total: number;
  sent: number;
  rejected: number;
  approvalRate: number;
  avgConfidence: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

function makeStats(overrides: Partial<VariantStats> = {}): VariantStats {
  return {
    total: 20,
    sent: 10,
    rejected: 5,
    approvalRate: 50,
    avgConfidence: 0.8,
    avgInputTokens: 500,
    avgOutputTokens: 200,
    ...overrides,
  };
}

describe("selectVariant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("traffic_ratio=0 のとき常にcontrolを返す", () => {
    const exp = makeExperiment({ traffic_ratio: 0 });
    // Math.random() < 0 は常にfalseなのでcontrolになる
    for (let i = 0; i < 10; i++) {
      const result = selectVariant(exp);
      expect(result.variantKey).toBe("control");
      expect(result.config).toEqual(exp.config.control);
    }
  });

  it("traffic_ratio=1 のとき常にvariantを返す", () => {
    const exp = makeExperiment({ traffic_ratio: 1 });
    // Math.random() < 1 は常にtrueなのでvariantになる
    for (let i = 0; i < 10; i++) {
      const result = selectVariant(exp);
      expect(result.variantKey).toBe("variant");
      expect(result.config).toEqual(exp.config.variant);
    }
  });

  it("Math.randomの値がtraffic_ratio未満ならvariantを返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    const exp = makeExperiment({ traffic_ratio: 0.5 });
    const result = selectVariant(exp);
    expect(result.variantKey).toBe("variant");
    expect(result.config).toEqual(exp.config.variant);
  });

  it("Math.randomの値がtraffic_ratio以上ならcontrolを返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    const exp = makeExperiment({ traffic_ratio: 0.5 });
    const result = selectVariant(exp);
    expect(result.variantKey).toBe("control");
    expect(result.config).toEqual(exp.config.control);
  });
});

describe("generateSuggestion", () => {
  it("サンプル数不足（control < 10）の場合、不足メッセージを返す", () => {
    const control = makeStats({ total: 5 });
    const variant = makeStats({ total: 20 });
    const result = generateSuggestion(control, variant);
    expect(result).toBe("サンプル数不足: 各variant最低10件のデータが必要です。");
  });

  it("サンプル数不足（variant < 10）の場合、不足メッセージを返す", () => {
    const control = makeStats({ total: 20 });
    const variant = makeStats({ total: 3 });
    const result = generateSuggestion(control, variant);
    expect(result).toBe("サンプル数不足: 各variant最低10件のデータが必要です。");
  });

  it("variantが承認率5%超かつ信頼度も高い場合、variant推奨メッセージを返す", () => {
    const control = makeStats({ total: 20, approvalRate: 50, avgConfidence: 0.7 });
    const variant = makeStats({ total: 20, approvalRate: 60, avgConfidence: 0.8 });
    const result = generateSuggestion(control, variant);
    expect(result).toContain("variant推奨");
    expect(result).toContain("10.0%");
    expect(result).toContain("本番適用");
  });

  it("controlが承認率5%超で優位な場合、control維持推奨メッセージを返す", () => {
    const control = makeStats({ total: 20, approvalRate: 60 });
    const variant = makeStats({ total: 20, approvalRate: 50 });
    const result = generateSuggestion(control, variant);
    expect(result).toContain("control維持推奨");
    expect(result).toContain("10.0%");
    expect(result).toContain("現行設定を維持");
  });

  it("有意差がない場合、継続推奨メッセージを返す", () => {
    const control = makeStats({ total: 20, approvalRate: 50, avgConfidence: 0.8 });
    const variant = makeStats({ total: 20, approvalRate: 52, avgConfidence: 0.8 });
    const result = generateSuggestion(control, variant);
    expect(result).toContain("有意差なし");
    expect(result).toContain("2.0%");
  });
});

describe("getRunningExperiment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("実行中の実験がある場合、実験を返す", async () => {
    const exp = makeExperiment();
    // strictWithTenantモックが返すデータを設定
    const { strictWithTenant } = await import("@/lib/tenant");
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: [exp], error: null } as any);

    const result = await getRunningExperiment("tenant-1");
    expect(result).toEqual(exp);
  });

  it("実行中の実験がない場合、nullを返す", async () => {
    const { strictWithTenant } = await import("@/lib/tenant");
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: [], error: null } as any);

    const result = await getRunningExperiment("tenant-1");
    expect(result).toBeNull();
  });

  it("dataがnullの場合、nullを返す", async () => {
    const { strictWithTenant } = await import("@/lib/tenant");
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: null, error: null } as any);

    const result = await getRunningExperiment("tenant-1");
    expect(result).toBeNull();
  });
});
