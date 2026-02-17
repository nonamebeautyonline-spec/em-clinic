// lib/__tests__/products.test.ts
// 商品マスタ共通ライブラリのテスト（DBフォールバック・テナント対応・マップ生成）
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
const mockMaybeSingle = vi.fn();
const mockIs = vi.fn().mockReturnValue({ data: null, error: null, then: (cb: any) => Promise.resolve(cb({ data: null, error: null })) });
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  eq: mockEq,
  is: mockIs,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
}));

// チェイン可能にする
mockSelect.mockReturnValue({ eq: mockEq, is: mockIs, order: mockOrder });
mockEq.mockReturnValue({ eq: mockEq, is: mockIs, order: mockOrder, maybeSingle: mockMaybeSingle });
mockOrder.mockReturnValue({ eq: mockEq, is: mockIs });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { getProducts, getAllProducts, getProductByCode, getProductNamesMap, getProductPricesMap, type Product } from "@/lib/products";

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト: DBクエリが失敗（フォールバック発動）
  mockIs.mockResolvedValue({ data: null, error: { message: "DB error" } });
});

// ===================================================================
// getProducts: フォールバック動作
// ===================================================================
describe("getProducts — DBフォールバック", () => {
  it("DB失敗時はフォールバック商品を返す", async () => {
    mockIs.mockResolvedValue({ data: null, error: { message: "connection error" } });
    const products = await getProducts();
    expect(products.length).toBeGreaterThanOrEqual(12);
    // フォールバック商品のIDは fallback- プレフィックス
    expect(products[0].id).toMatch(/^fallback-/);
  });

  it("DB空データ時もフォールバック", async () => {
    mockIs.mockResolvedValue({ data: [], error: null });
    const products = await getProducts();
    expect(products.length).toBeGreaterThanOrEqual(12);
  });

  it("DB例外時もフォールバック", async () => {
    mockIs.mockRejectedValue(new Error("network error"));
    const products = await getProducts();
    expect(products.length).toBeGreaterThanOrEqual(12);
  });

  it("DB成功時はDBデータを返す", async () => {
    const dbProducts: Product[] = [
      { id: "db-1", code: "TEST_1", title: "テスト商品", drug_name: "テスト薬", dosage: "10mg", duration_months: 1, quantity: 4, price: 10000, is_active: true, sort_order: 1, category: "injection", image_url: null, stock_quantity: 100, discount_price: null, discount_until: null, description: null, parent_id: null },
    ];
    mockIs.mockResolvedValue({ data: dbProducts, error: null });
    const products = await getProducts();
    expect(products).toEqual(dbProducts);
    expect(products[0].id).toBe("db-1");
  });
});

// ===================================================================
// getProducts: テナント分離
// ===================================================================
describe("getProducts — テナント分離", () => {
  it("tenantId 指定時は eq('tenant_id', tenantId) を呼ぶ", async () => {
    mockIs.mockResolvedValue({ data: null, error: { message: "test" } });
    await getProducts("tenant-abc");
    // tenant_id を eq で指定
    expect(mockEq).toHaveBeenCalledWith("tenant_id", "tenant-abc");
  });

  it("tenantId 未指定時は is('tenant_id', null) を呼ぶ", async () => {
    mockIs.mockResolvedValue({ data: null, error: { message: "test" } });
    await getProducts();
    expect(mockIs).toHaveBeenCalledWith("tenant_id", null);
  });
});

// ===================================================================
// getAllProducts
// ===================================================================
describe("getAllProducts", () => {
  it("DB成功時はDBデータを返す", async () => {
    const dbProducts: Product[] = [
      { id: "db-1", code: "TEST", title: "テスト", drug_name: "テスト", dosage: null, duration_months: null, quantity: null, price: 5000, is_active: false, sort_order: 1, category: "oral", image_url: null, stock_quantity: null, discount_price: null, discount_until: null, description: null, parent_id: null },
    ];
    mockIs.mockResolvedValue({ data: dbProducts, error: null });
    const products = await getAllProducts();
    expect(products).toEqual(dbProducts);
  });

  it("DB失敗時は空配列を返す（フォールバックなし）", async () => {
    mockIs.mockResolvedValue({ data: null, error: { message: "error" } });
    const products = await getAllProducts();
    expect(products).toEqual([]);
  });

  it("例外時は空配列を返す", async () => {
    mockIs.mockRejectedValue(new Error("network"));
    const products = await getAllProducts();
    expect(products).toEqual([]);
  });
});

// ===================================================================
// getProductByCode
// ===================================================================
describe("getProductByCode", () => {
  it("DB成功時はDBデータを返す", async () => {
    const product: Product = { id: "db-1", code: "MJL_2.5mg_1m", title: "マンジャロ 2.5mg 1ヶ月", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 1, quantity: 4, price: 13000, is_active: true, sort_order: 1, category: "injection", image_url: null, stock_quantity: null, discount_price: null, discount_until: null, description: null, parent_id: null };
    mockMaybeSingle.mockResolvedValue({ data: product, error: null });
    // eq chain を設定
    mockEq.mockReturnValue({ eq: mockEq, is: mockIs, order: mockOrder, maybeSingle: mockMaybeSingle });
    mockIs.mockReturnValue({ maybeSingle: mockMaybeSingle });
    const result = await getProductByCode("MJL_2.5mg_1m");
    expect(result).toEqual(product);
  });

  it("DB失敗時はフォールバック商品を返す（コード一致）", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "error" } });
    mockEq.mockReturnValue({ eq: mockEq, is: mockIs, order: mockOrder, maybeSingle: mockMaybeSingle });
    mockIs.mockReturnValue({ maybeSingle: mockMaybeSingle });
    const result = await getProductByCode("MJL_2.5mg_1m");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("MJL_2.5mg_1m");
    expect(result!.id).toBe("fallback");
  });

  it("存在しないコード → null", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "error" } });
    mockEq.mockReturnValue({ eq: mockEq, is: mockIs, order: mockOrder, maybeSingle: mockMaybeSingle });
    mockIs.mockReturnValue({ maybeSingle: mockMaybeSingle });
    const result = await getProductByCode("NONEXISTENT_CODE");
    expect(result).toBeNull();
  });

  it("例外時もフォールバック商品を返す", async () => {
    mockMaybeSingle.mockRejectedValue(new Error("network"));
    mockEq.mockReturnValue({ eq: mockEq, is: mockIs, order: mockOrder, maybeSingle: mockMaybeSingle });
    mockIs.mockReturnValue({ maybeSingle: mockMaybeSingle });
    const result = await getProductByCode("MJL_5mg_1m");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("MJL_5mg_1m");
  });
});

// ===================================================================
// マップ生成
// ===================================================================
describe("getProductNamesMap / getProductPricesMap", () => {
  beforeEach(() => {
    // フォールバック発動設定
    mockIs.mockResolvedValue({ data: null, error: { message: "test" } });
  });

  it("getProductNamesMap: code → title マップを返す", async () => {
    const map = await getProductNamesMap();
    expect(map["MJL_2.5mg_1m"]).toBe("マンジャロ 2.5mg 1ヶ月");
    expect(map["MJL_5mg_1m"]).toBe("マンジャロ 5mg 1ヶ月");
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(12);
  });

  it("getProductPricesMap: code → price マップを返す", async () => {
    const map = await getProductPricesMap();
    expect(map["MJL_2.5mg_1m"]).toBe(13000);
    expect(map["MJL_5mg_1m"]).toBe(22850);
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(12);
  });
});

// ===================================================================
// フォールバック商品データ検証
// ===================================================================
describe("フォールバック商品データ整合性", () => {
  beforeEach(() => {
    mockIs.mockResolvedValue({ data: null, error: { message: "test" } });
  });

  it("全商品がinjectionカテゴリ", async () => {
    const products = await getProducts();
    for (const p of products) {
      expect(p.category).toBe("injection");
    }
  });

  it("全商品がis_active=true", async () => {
    const products = await getProducts();
    for (const p of products) {
      expect(p.is_active).toBe(true);
    }
  });

  it("sort_order が1から連番", async () => {
    const products = await getProducts();
    for (let i = 0; i < products.length; i++) {
      expect(products[i].sort_order).toBe(i + 1);
    }
  });

  it("用量は 2.5mg / 5mg / 7.5mg / 10mg", async () => {
    const products = await getProducts();
    const dosages = [...new Set(products.map((p) => p.dosage))];
    expect(dosages).toEqual(expect.arrayContaining(["2.5mg", "5mg", "7.5mg", "10mg"]));
  });

  it("期間は 1 / 2 / 3 ヶ月", async () => {
    const products = await getProducts();
    const durations = [...new Set(products.map((p) => p.duration_months))];
    expect(durations.sort()).toEqual([1, 2, 3]);
  });

  it("価格は正の数", async () => {
    const products = await getProducts();
    for (const p of products) {
      expect(p.price).toBeGreaterThan(0);
    }
  });
});

// ===================================================================
// ソースコード構造チェック
// ===================================================================
describe("products: ソースコード構造", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/products.ts"), "utf-8");

  it("supabaseAdmin を使用している", () => {
    expect(src).toContain("supabaseAdmin");
  });

  it("テナント対応している（tenant_id 条件）", () => {
    expect(src).toContain("tenant_id");
  });

  it("is_active フィルター（getProducts）", () => {
    expect(src).toContain("is_active");
  });

  it("sort_order でソート", () => {
    expect(src).toContain("sort_order");
  });

  it("FALLBACK_PRODUCTS がハードコードされている", () => {
    expect(src).toContain("FALLBACK_PRODUCTS");
  });
});
