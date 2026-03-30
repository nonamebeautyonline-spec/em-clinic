// lib/__tests__/pricing.test.ts — 価格計算モジュールのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  strictWithTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@/lib/campaign-audience", () => ({
  evaluateAudienceCondition: vi.fn().mockResolvedValue(true),
}));

const { calculateFinalPrice, applyCampaignPrice, recordCampaignUsage, getActiveCampaigns } =
  await import("@/lib/pricing");

/* ---------- ヘルパー ---------- */

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = [
    "from", "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
    "like", "ilike", "contains", "containedBy", "filter", "or",
    "order", "limit", "range", "single", "maybeSingle", "match",
    "textSearch", "csv", "rpc", "count", "head",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) =>
    resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

const TENANT = "test-tenant";
const PRODUCT = { id: "prod-1", price: 10000, discount_price: null, discount_until: null, category: "skincare" };

/* ---------- calculateFinalPrice ---------- */

describe("calculateFinalPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("割引なし — 通常価格がそのまま返る", async () => {
    // patient_discounts: なし, campaigns: なし
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") return createMockChain([]);
      if (table === "campaigns") return createMockChain([]);
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(10000);
    expect(result.discountAmount).toBe(0);
    expect(result.appliedDiscount.type).toBe("none");
    expect(result.coupon).toBeNull();
  });

  it("個別患者割引（%） — パーセント割引が正しく計算される", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") {
        return createMockChain([
          {
            id: "pd-1",
            discount_type: "percent",
            discount_value: 20,
            reason: "VIP割引",
            product_id: null,
            valid_until: null,
          },
        ]);
      }
      return createMockChain([]);
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(8000);
    expect(result.appliedDiscount.type).toBe("patient_discount");
    expect(result.appliedDiscount.name).toBe("VIP割引");
  });

  it("個別患者割引（固定額） — 固定額割引が正しく計算される", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") {
        return createMockChain([
          {
            id: "pd-2",
            discount_type: "fixed",
            discount_value: 3000,
            reason: "初回割引",
            product_id: null,
            valid_until: null,
          },
        ]);
      }
      return createMockChain([]);
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(7000);
    expect(result.discountAmount).toBe(3000);
  });

  it("商品指定の個別割引が全商品対象割引より優先される", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") {
        return createMockChain([
          {
            id: "pd-general",
            discount_type: "percent",
            discount_value: 10,
            reason: "全商品割引",
            product_id: null,
            valid_until: null,
          },
          {
            id: "pd-specific",
            discount_type: "percent",
            discount_value: 30,
            reason: "商品指定割引",
            product_id: "prod-1",
            valid_until: null,
          },
        ]);
      }
      return createMockChain([]);
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    // 商品指定30%が適用される（全商品10%ではない）
    expect(result.finalPrice).toBe(7000);
    expect(result.appliedDiscount.name).toBe("商品指定割引");
  });

  it("期限切れの個別割引は無視される", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") {
        return createMockChain([
          {
            id: "pd-expired",
            discount_type: "percent",
            discount_value: 50,
            reason: "期限切れ割引",
            product_id: null,
            valid_until: "2020-01-01T00:00:00Z",
          },
        ]);
      }
      if (table === "campaigns") return createMockChain([]);
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(10000);
    expect(result.appliedDiscount.type).toBe("none");
  });

  it("個別割引 > キャンペーン — 個別割引が存在すればキャンペーンは評価されない", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") {
        return createMockChain([
          {
            id: "pd-1",
            discount_type: "fixed",
            discount_value: 1000,
            reason: "個別",
            product_id: null,
            valid_until: null,
          },
        ]);
      }
      if (table === "campaigns") {
        return createMockChain([
          {
            id: "camp-1",
            name: "大セール",
            discount_type: "percent",
            discount_value: 50,
            target_type: "all",
            target_ids: [],
            starts_at: "2020-01-01",
            ends_at: null,
            max_uses: null,
            audience_type: "all",
            audience_patient_ids: [],
            audience_rules: null,
          },
        ]);
      }
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    expect(result.appliedDiscount.type).toBe("patient_discount");
    expect(result.finalPrice).toBe(9000);
  });

  it("キャンペーン割引（%）が正しく適用される", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") return createMockChain([]);
      if (table === "campaigns") {
        return createMockChain([
          {
            id: "camp-1",
            name: "春セール",
            discount_type: "percent",
            discount_value: 15,
            target_type: "all",
            target_ids: [],
            target_category: "",
            starts_at: "2020-01-01",
            ends_at: null,
            max_uses: null,
            audience_type: "all",
            audience_patient_ids: [],
            audience_rules: null,
          },
        ]);
      }
      if (table === "campaign_usages") return createMockChain(null);
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(8500);
    expect(result.appliedDiscount.type).toBe("campaign");
    expect(result.appliedDiscount.name).toBe("春セール");
  });

  it("商品の割引価格が適用される（他の割引がない場合）", async () => {
    const productWithDiscount = {
      ...PRODUCT,
      discount_price: 7500,
      discount_until: "2099-12-31T00:00:00Z",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") return createMockChain([]);
      if (table === "campaigns") return createMockChain([]);
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: productWithDiscount,
      patientId: "p-1",
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(7500);
    expect(result.appliedDiscount.type).toBe("product_discount");
  });

  it("クーポン（%）が最終価格に追加適用される", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") return createMockChain([]);
      if (table === "campaigns") return createMockChain([]);
      if (table === "coupons") {
        return createMockChain({
          id: 1,
          discount_type: "percent",
          discount_value: 10,
          code: "SAVE10",
          min_purchase: 0,
        });
      }
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      couponId: 1,
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(9000);
    expect(result.coupon).not.toBeNull();
    expect(result.coupon!.applied).toBe(true);
    expect(result.coupon!.code).toBe("SAVE10");
    expect(result.coupon!.couponDiscount).toBe(1000);
  });

  it("クーポンの最低購入額を下回る場合はクーポン不適用", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") return createMockChain([]);
      if (table === "campaigns") return createMockChain([]);
      if (table === "coupons") {
        return createMockChain({
          id: 2,
          discount_type: "fixed",
          discount_value: 500,
          code: "MIN20000",
          min_purchase: 20000,
        });
      }
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      couponId: 2,
      tenantId: TENANT,
    });

    // 10000 < 20000なのでクーポン不適用
    expect(result.finalPrice).toBe(10000);
    expect(result.coupon).toBeNull();
  });

  it("固定額割引が商品価格を超える場合は0円になる", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "patient_discounts") {
        return createMockChain([
          {
            id: "pd-big",
            discount_type: "fixed",
            discount_value: 50000,
            reason: "大幅割引",
            product_id: null,
            valid_until: null,
          },
        ]);
      }
      return createMockChain([]);
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      patientId: "p-1",
      tenantId: TENANT,
    });

    // calcDiscountでmin(50000, 10000)=10000が割引されて0円
    expect(result.finalPrice).toBe(0);
  });

  it("patientIdなしの場合は個別割引をスキップ", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "campaigns") return createMockChain([]);
      return createMockChain();
    });

    const result = await calculateFinalPrice({
      product: PRODUCT,
      tenantId: TENANT,
    });

    expect(result.finalPrice).toBe(10000);
    // patient_discountsへのクエリが発行されない
    expect(mockFrom).not.toHaveBeenCalledWith("patient_discounts");
  });
});

/* ---------- applyCampaignPrice ---------- */

describe("applyCampaignPrice", () => {
  const campaign = {
    id: "c-1",
    name: "テストセール",
    discount_type: "percent" as const,
    discount_value: 20,
    target_type: "all" as const,
    target_ids: [],
    target_category: "",
    starts_at: "2020-01-01",
    ends_at: null,
    max_uses: null,
    audience_type: "all" as const,
    audience_patient_ids: [],
    audience_rules: null,
  };

  it("キャンペーンが全商品対象の場合に割引適用", () => {
    const result = applyCampaignPrice(PRODUCT, [campaign]);
    expect(result.effectivePrice).toBe(8000);
    expect(result.campaign).not.toBeNull();
  });

  it("カテゴリ指定キャンペーンが一致する場合", () => {
    const catCampaign = { ...campaign, target_type: "category" as const, target_category: "skincare" };
    const result = applyCampaignPrice(PRODUCT, [catCampaign]);
    expect(result.effectivePrice).toBe(8000);
  });

  it("カテゴリ不一致の場合はキャンペーン不適用", () => {
    const catCampaign = { ...campaign, target_type: "category" as const, target_category: "haircare" };
    const result = applyCampaignPrice(PRODUCT, [catCampaign]);
    expect(result.effectivePrice).toBe(10000);
    expect(result.campaign).toBeNull();
  });

  it("商品のdiscount_priceがキャンペーンより優先される", () => {
    const productWithDiscount = {
      ...PRODUCT,
      discount_price: 6000,
      discount_until: "2099-12-31",
    };
    const result = applyCampaignPrice(productWithDiscount, [campaign]);
    expect(result.effectivePrice).toBe(6000);
    expect(result.campaign).toBeNull();
  });

  it("特定商品指定キャンペーンが一致する場合", () => {
    const specificCampaign = {
      ...campaign,
      target_type: "specific" as const,
      target_ids: ["prod-1", "prod-2"],
    };
    const result = applyCampaignPrice(PRODUCT, [specificCampaign]);
    expect(result.effectivePrice).toBe(8000);
  });

  it("キャンペーンなし — 通常価格", () => {
    const result = applyCampaignPrice(PRODUCT, []);
    expect(result.effectivePrice).toBe(10000);
    expect(result.campaign).toBeNull();
  });
});

/* ---------- recordCampaignUsage ---------- */

describe("recordCampaignUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("利用記録がinsertされる", async () => {
    const insertChain = createMockChain();
    mockFrom.mockReturnValue(insertChain);

    await recordCampaignUsage({
      campaignId: "camp-1",
      patientId: "p-1",
      orderId: "order-1",
      tenantId: TENANT,
    });

    expect(mockFrom).toHaveBeenCalledWith("campaign_usages");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: "camp-1",
        patient_id: "p-1",
        order_id: "order-1",
        tenant_id: TENANT,
      }),
    );
  });
});
