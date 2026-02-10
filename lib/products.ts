// lib/products.ts — 商品マスタ共通ライブラリ
import { supabaseAdmin } from "@/lib/supabase";

export type Product = {
  id: string;
  code: string;
  title: string;
  drug_name: string;
  dosage: string | null;
  duration_months: number | null;
  quantity: number | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  category: string;
};

// ハードコードフォールバック（DB接続失敗時用）
const FALLBACK_PRODUCTS: Omit<Product, "id">[] = [
  { code: "MJL_2.5mg_1m", title: "マンジャロ 2.5mg 1ヶ月", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 1, quantity: 4, price: 13000, is_active: true, sort_order: 1, category: "injection" },
  { code: "MJL_2.5mg_2m", title: "マンジャロ 2.5mg 2ヶ月", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 2, quantity: 8, price: 25500, is_active: true, sort_order: 2, category: "injection" },
  { code: "MJL_2.5mg_3m", title: "マンジャロ 2.5mg 3ヶ月", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 3, quantity: 12, price: 35000, is_active: true, sort_order: 3, category: "injection" },
  { code: "MJL_5mg_1m", title: "マンジャロ 5mg 1ヶ月", drug_name: "マンジャロ", dosage: "5mg", duration_months: 1, quantity: 4, price: 22850, is_active: true, sort_order: 4, category: "injection" },
  { code: "MJL_5mg_2m", title: "マンジャロ 5mg 2ヶ月", drug_name: "マンジャロ", dosage: "5mg", duration_months: 2, quantity: 8, price: 45500, is_active: true, sort_order: 5, category: "injection" },
  { code: "MJL_5mg_3m", title: "マンジャロ 5mg 3ヶ月", drug_name: "マンジャロ", dosage: "5mg", duration_months: 3, quantity: 12, price: 63000, is_active: true, sort_order: 6, category: "injection" },
  { code: "MJL_7.5mg_1m", title: "マンジャロ 7.5mg 1ヶ月", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 1, quantity: 4, price: 34000, is_active: true, sort_order: 7, category: "injection" },
  { code: "MJL_7.5mg_2m", title: "マンジャロ 7.5mg 2ヶ月", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 2, quantity: 8, price: 65000, is_active: true, sort_order: 8, category: "injection" },
  { code: "MJL_7.5mg_3m", title: "マンジャロ 7.5mg 3ヶ月", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 3, quantity: 12, price: 96000, is_active: true, sort_order: 9, category: "injection" },
  { code: "MJL_10mg_1m", title: "マンジャロ 10mg 1ヶ月", drug_name: "マンジャロ", dosage: "10mg", duration_months: 1, quantity: 4, price: 35000, is_active: true, sort_order: 10, category: "injection" },
  { code: "MJL_10mg_2m", title: "マンジャロ 10mg 2ヶ月", drug_name: "マンジャロ", dosage: "10mg", duration_months: 2, quantity: 8, price: 70000, is_active: true, sort_order: 11, category: "injection" },
  { code: "MJL_10mg_3m", title: "マンジャロ 10mg 3ヶ月", drug_name: "マンジャロ", dosage: "10mg", duration_months: 3, quantity: 12, price: 105000, is_active: true, sort_order: 12, category: "injection" },
];

/** アクティブな商品一覧を取得 */
export async function getProducts(tenantId?: string): Promise<Product[]> {
  try {
    let query = supabaseAdmin
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      console.warn("[products] DB fetch failed or empty, using fallback:", error?.message);
      return FALLBACK_PRODUCTS.map((p, i) => ({ ...p, id: `fallback-${i}` }));
    }
    return data;
  } catch (e) {
    console.warn("[products] Exception, using fallback:", e);
    return FALLBACK_PRODUCTS.map((p, i) => ({ ...p, id: `fallback-${i}` }));
  }
}

/** 全商品を取得（管理画面用、非アクティブ含む） */
export async function getAllProducts(tenantId?: string): Promise<Product[]> {
  try {
    let query = supabaseAdmin
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn("[products] DB fetch failed:", error?.message);
      return [];
    }
    return data;
  } catch (e) {
    console.warn("[products] Exception:", e);
    return [];
  }
}

/** コードで商品を1件取得 */
export async function getProductByCode(code: string, tenantId?: string): Promise<Product | null> {
  try {
    let query = supabaseAdmin
      .from("products")
      .select("*")
      .eq("code", code)
      .eq("is_active", true);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      // フォールバック
      const fb = FALLBACK_PRODUCTS.find((p) => p.code === code);
      return fb ? { ...fb, id: "fallback" } : null;
    }
    return data;
  } catch (e) {
    const fb = FALLBACK_PRODUCTS.find((p) => p.code === code);
    return fb ? { ...fb, id: "fallback" } : null;
  }
}

/** PRODUCT_NAMES マップを生成（既存コードとの互換用） */
export async function getProductNamesMap(tenantId?: string): Promise<Record<string, string>> {
  const products = await getProducts(tenantId);
  const map: Record<string, string> = {};
  for (const p of products) {
    map[p.code] = p.title;
  }
  return map;
}

/** PRODUCT_PRICES マップを生成（既存コードとの互換用） */
export async function getProductPricesMap(tenantId?: string): Promise<Record<string, number>> {
  const products = await getProducts(tenantId);
  const map: Record<string, number> = {};
  for (const p of products) {
    map[p.code] = p.price;
  }
  return map;
}
