// __tests__/lib/pricing.test.ts
// 統合価格計算モジュール テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","or","order","limit","range","single","maybeSingle","upsert",
   "ilike","count","csv","lte","gte"].forEach(m => {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));
vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
}));

import { calculateFinalPrice, applyCampaignPrice } from "@/lib/pricing";

describe("pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  const baseProduct = { id: "prod-1", price: 10000, discount_price: null, discount_until: null };

  describe("calculateFinalPrice", () => {
    it("割引なしの場合はそのままの価格", async () => {
      // patient_discountsとcampaignsが空
      tableChains["patient_discounts"] = createChain({ data: [], error: null });
      tableChains["campaigns"] = createChain({ data: [], error: null });

      const result = await calculateFinalPrice({
        product: baseProduct,
        patientId: "P001",
        tenantId: "test-tenant",
      });

      expect(result.finalPrice).toBe(10000);
      expect(result.discountAmount).toBe(0);
      expect(result.appliedDiscount.type).toBe("none");
      expect(result.coupon).toBeNull();
    });

    it("個別患者割引（%）が適用される", async () => {
      tableChains["patient_discounts"] = createChain({
        data: [{ id: "d1", discount_type: "percent", discount_value: 20, reason: "VIP", product_id: null, valid_until: null }],
        error: null,
      });
      tableChains["campaigns"] = createChain({ data: [], error: null });

      const result = await calculateFinalPrice({
        product: baseProduct,
        patientId: "P001",
        tenantId: "test-tenant",
      });

      expect(result.finalPrice).toBe(8000);
      expect(result.discountAmount).toBe(2000);
      expect(result.appliedDiscount.type).toBe("patient_discount");
      expect(result.appliedDiscount.name).toBe("VIP");
    });

    it("個別患者割引（固定額）が適用される", async () => {
      tableChains["patient_discounts"] = createChain({
        data: [{ id: "d1", discount_type: "fixed", discount_value: 3000, reason: "トラブル対応", product_id: null, valid_until: null }],
        error: null,
      });
      tableChains["campaigns"] = createChain({ data: [], error: null });

      const result = await calculateFinalPrice({
        product: baseProduct,
        patientId: "P001",
        tenantId: "test-tenant",
      });

      expect(result.finalPrice).toBe(7000);
      expect(result.appliedDiscount.type).toBe("patient_discount");
    });

    it("個別割引がキャンペーンより優先", async () => {
      tableChains["patient_discounts"] = createChain({
        data: [{ id: "d1", discount_type: "percent", discount_value: 10, reason: "会員", product_id: null, valid_until: null }],
        error: null,
      });
      // キャンペーンもあるが個別割引が優先
      tableChains["campaigns"] = createChain({
        data: [{ id: "c1", name: "春セール", discount_type: "percent", discount_value: 30, target_type: "all", target_ids: [], target_category: "" }],
        error: null,
      });

      const result = await calculateFinalPrice({
        product: baseProduct,
        patientId: "P001",
        tenantId: "test-tenant",
      });

      // 個別10%が適用（キャンペーン30%ではない）
      expect(result.finalPrice).toBe(9000);
      expect(result.appliedDiscount.type).toBe("patient_discount");
    });

    it("キャンペーン割引が適用される（個別割引なし）", async () => {
      tableChains["patient_discounts"] = createChain({ data: [], error: null });
      tableChains["campaigns"] = createChain({
        data: [{
          id: "c1", name: "春セール", discount_type: "percent", discount_value: 20,
          target_type: "all", target_ids: [], target_category: "",
          starts_at: "2026-01-01", ends_at: null,
        }],
        error: null,
      });

      const result = await calculateFinalPrice({
        product: baseProduct,
        patientId: "P001",
        tenantId: "test-tenant",
      });

      expect(result.finalPrice).toBe(8000);
      expect(result.appliedDiscount.type).toBe("campaign");
      expect(result.appliedDiscount.name).toBe("春セール");
    });

    it("商品discount_priceが適用される（他の割引なし）", async () => {
      tableChains["patient_discounts"] = createChain({ data: [], error: null });
      tableChains["campaigns"] = createChain({ data: [], error: null });

      const productWithDiscount = { ...baseProduct, discount_price: 8500, discount_until: "2099-12-31" };
      const result = await calculateFinalPrice({
        product: productWithDiscount,
        patientId: "P001",
        tenantId: "test-tenant",
      });

      expect(result.finalPrice).toBe(8500);
      expect(result.appliedDiscount.type).toBe("product_discount");
    });

    it("クーポンが最終価格に追加適用される", async () => {
      tableChains["patient_discounts"] = createChain({
        data: [{ id: "d1", discount_type: "percent", discount_value: 10, reason: "VIP", product_id: null, valid_until: null }],
        error: null,
      });
      tableChains["campaigns"] = createChain({ data: [], error: null });
      tableChains["coupons"] = createChain({
        data: { id: 1, code: "SAVE500", discount_type: "fixed", discount_value: 500, min_purchase: 0, is_active: true },
        error: null,
      });

      const result = await calculateFinalPrice({
        product: baseProduct,
        patientId: "P001",
        couponId: 1,
        tenantId: "test-tenant",
      });

      // 10000 - 10%(1000) = 9000 - 500(クーポン) = 8500
      expect(result.finalPrice).toBe(8500);
      expect(result.appliedDiscount.type).toBe("patient_discount");
      expect(result.coupon).not.toBeNull();
      expect(result.coupon!.applied).toBe(true);
      expect(result.coupon!.couponDiscount).toBe(500);
    });

    it("patientId未指定なら個別割引チェックをスキップ", async () => {
      tableChains["campaigns"] = createChain({ data: [], error: null });

      const result = await calculateFinalPrice({
        product: baseProduct,
        tenantId: "test-tenant",
      });

      expect(result.finalPrice).toBe(10000);
      // patient_discountsテーブルへのアクセスなし
      expect(tableChains["patient_discounts"]).toBeUndefined();
    });
  });

  describe("applyCampaignPrice", () => {
    it("キャンペーンなしなら通常価格", () => {
      const result = applyCampaignPrice(baseProduct, []);
      expect(result.effectivePrice).toBe(10000);
      expect(result.campaign).toBeNull();
    });

    it("全商品対象のキャンペーンが適用される", () => {
      const campaigns = [{
        id: "c1", name: "全品10%OFF", discount_type: "percent" as const, discount_value: 10,
        target_type: "all" as const, target_ids: [], target_category: "",
        starts_at: "2026-01-01", ends_at: null,
      }];
      const result = applyCampaignPrice(baseProduct, campaigns);
      expect(result.effectivePrice).toBe(9000);
      expect(result.campaign?.name).toBe("全品10%OFF");
    });

    it("カテゴリ指定キャンペーンがマッチ", () => {
      const productWithCategory = { ...baseProduct, category: "GLP-1" };
      const campaigns = [{
        id: "c1", name: "GLP-1割引", discount_type: "fixed" as const, discount_value: 2000,
        target_type: "category" as const, target_ids: [], target_category: "GLP-1",
        starts_at: "2026-01-01", ends_at: null,
      }];
      const result = applyCampaignPrice(productWithCategory, campaigns);
      expect(result.effectivePrice).toBe(8000);
    });

    it("特定商品指定キャンペーンがマッチ", () => {
      const campaigns = [{
        id: "c1", name: "この商品だけ", discount_type: "percent" as const, discount_value: 50,
        target_type: "specific" as const, target_ids: ["prod-1"], target_category: "",
        starts_at: "2026-01-01", ends_at: null,
      }];
      const result = applyCampaignPrice(baseProduct, campaigns);
      expect(result.effectivePrice).toBe(5000);
    });

    it("商品discount_priceがキャンペーンより優先", () => {
      const productWithDiscount = { ...baseProduct, discount_price: 7000, discount_until: "2099-12-31" };
      const campaigns = [{
        id: "c1", name: "全品20%OFF", discount_type: "percent" as const, discount_value: 20,
        target_type: "all" as const, target_ids: [], target_category: "",
        starts_at: "2026-01-01", ends_at: null,
      }];
      const result = applyCampaignPrice(productWithDiscount, campaigns);
      expect(result.effectivePrice).toBe(7000);
      expect(result.campaign).toBeNull();
    });

    it("固定額割引が商品価格を超えない", () => {
      const cheapProduct = { ...baseProduct, price: 500 };
      const campaigns = [{
        id: "c1", name: "1000円引き", discount_type: "fixed" as const, discount_value: 1000,
        target_type: "all" as const, target_ids: [], target_category: "",
        starts_at: "2026-01-01", ends_at: null,
      }];
      const result = applyCampaignPrice(cheapProduct, campaigns);
      // 500 - min(1000, 500) = 0
      expect(result.effectivePrice).toBe(0);
    });
  });
});
