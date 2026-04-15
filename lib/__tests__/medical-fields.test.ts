// lib/__tests__/medical-fields.test.ts — 診療科目ヘルパーのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["select", "insert", "update", "delete", "eq", "neq", "is", "not",
   "order", "limit", "single", "maybeSingle", "in", "gte", "lte"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const mockGetSetting = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string | null) => ({ tenant_id: tid })),
}));

import {
  resolveFlowConfig,
  DEFAULT_FLOW_CONFIG,
  isMultiFieldEnabled,
  getMedicalFieldConfig,
  getMedicalFields,
  getAllMedicalFields,
  getMedicalFieldById,
  getDefaultMedicalField,
  applyFieldFilter,
} from "../medical-fields";

describe("resolveFlowConfig", () => {
  it("null の場合はデフォルト値を返す", () => {
    expect(resolveFlowConfig(null)).toEqual(DEFAULT_FLOW_CONFIG);
  });

  it("undefined の場合はデフォルト値を返す", () => {
    expect(resolveFlowConfig(undefined)).toEqual(DEFAULT_FLOW_CONFIG);
  });

  it("部分的な設定はデフォルトとマージされる", () => {
    const result = resolveFlowConfig({ intake_frequency: "every_time" });
    expect(result.intake_frequency).toBe("every_time");
    expect(result.purchase_flow).toBe("reservation_first");
    expect(result.show_in_reorder).toBe(true);
  });

  it("全フィールド指定でデフォルトを上書き", () => {
    const config = {
      intake_frequency: "every_time" as const,
      purchase_flow: "intake_then_pay" as const,
      show_in_reorder: false,
    };
    expect(resolveFlowConfig(config)).toEqual(config);
  });
});

describe("isMultiFieldEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tenantIdがnullの場合はfalse", async () => {
    expect(await isMultiFieldEnabled(null)).toBe(false);
  });

  it("設定がない場合はfalse", async () => {
    mockGetSetting.mockResolvedValue(null);
    expect(await isMultiFieldEnabled("t1")).toBe(false);
  });

  it("multiFieldEnabled=true の場合はtrue", async () => {
    mockGetSetting.mockResolvedValue(JSON.stringify({ multiFieldEnabled: true }));
    expect(await isMultiFieldEnabled("t1")).toBe(true);
  });

  it("multiFieldEnabled=false の場合はfalse", async () => {
    mockGetSetting.mockResolvedValue(JSON.stringify({ multiFieldEnabled: false }));
    expect(await isMultiFieldEnabled("t1")).toBe(false);
  });

  it("JSONパースエラー時はfalse", async () => {
    mockGetSetting.mockResolvedValue("invalid json");
    expect(await isMultiFieldEnabled("t1")).toBe(false);
  });
});

describe("getMedicalFieldConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定がない場合はデフォルト値を返す", async () => {
    mockGetSetting.mockResolvedValue(null);
    const config = await getMedicalFieldConfig("t1");
    expect(config.multiFieldEnabled).toBe(false);
  });

  it("設定がある場合はマージして返す", async () => {
    mockGetSetting.mockResolvedValue(JSON.stringify({ multiFieldEnabled: true }));
    const config = await getMedicalFieldConfig("t1");
    expect(config.multiFieldEnabled).toBe(true);
  });
});

describe("getMedicalFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("アクティブな分野一覧を返す", async () => {
    const fields = [{ id: "f1", slug: "diet", name: "ダイエット", is_active: true }];
    mockFrom.mockReturnValue(createChain({ data: fields, error: null }));

    const result = await getMedicalFields("t1");
    expect(result).toEqual(fields);
  });

  it("データがnullの場合は空配列を返す", async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const result = await getMedicalFields("t1");
    expect(result).toEqual([]);
  });
});

describe("getAllMedicalFields", () => {
  it("非アクティブ含む全分野を返す", async () => {
    const fields = [
      { id: "f1", is_active: true },
      { id: "f2", is_active: false },
    ];
    mockFrom.mockReturnValue(createChain({ data: fields, error: null }));

    const result = await getAllMedicalFields("t1");
    expect(result).toHaveLength(2);
  });
});

describe("getMedicalFieldById", () => {
  it("IDで分野を取得", async () => {
    const field = { id: "f1", slug: "diet", name: "ダイエット" };
    mockFrom.mockReturnValue(createChain({ data: field, error: null }));

    const result = await getMedicalFieldById("f1");
    expect(result).toEqual(field);
  });

  it("見つからない場合はnull", async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const result = await getMedicalFieldById("nonexistent");
    expect(result).toBeNull();
  });
});

describe("getDefaultMedicalField", () => {
  it("sort_order最小のアクティブ分野を返す", async () => {
    const field = { id: "f1", sort_order: 0 };
    mockFrom.mockReturnValue(createChain({ data: field, error: null }));

    const result = await getDefaultMedicalField("t1");
    expect(result).toEqual(field);
  });
});

describe("applyFieldFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tenantIdがnullの場合はクエリをそのまま返す", async () => {
    const query = { eq: vi.fn() };
    const result = await applyFieldFilter(query, null, "f1");
    expect(result).toBe(query);
    expect(query.eq).not.toHaveBeenCalled();
  });

  it("fieldIdがnullの場合はクエリをそのまま返す", async () => {
    const query = { eq: vi.fn() };
    const result = await applyFieldFilter(query, "t1", null);
    expect(result).toBe(query);
  });

  it("マルチフィールド無効時はクエリをそのまま返す", async () => {
    mockGetSetting.mockResolvedValue(null);
    const query = { eq: vi.fn() };
    const result = await applyFieldFilter(query, "t1", "f1");
    expect(result).toBe(query);
    expect(query.eq).not.toHaveBeenCalled();
  });

  it("マルチフィールド有効時はfield_idフィルタを適用", async () => {
    mockGetSetting.mockResolvedValue(JSON.stringify({ multiFieldEnabled: true }));
    const query = { eq: vi.fn().mockReturnThis() };
    await applyFieldFilter(query, "t1", "f1");
    expect(query.eq).toHaveBeenCalledWith("field_id", "f1");
  });
});
