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
  image_url: string | null;
  stock_quantity: number | null;
  discount_price: number | null;
  discount_until: string | null;
  description: string | null;
  parent_id: string | null;
  stock_alert_threshold: number | null;
  stock_alert_enabled: boolean;
};

// テナントごとに商品が異なるためフォールバックは空（DB障害時は空配列を返す）
const FALLBACK_PRODUCTS: Omit<Product, "id" | "image_url" | "stock_quantity" | "discount_price" | "discount_until" | "description" | "parent_id" | "stock_alert_threshold" | "stock_alert_enabled">[] = [];

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
      return FALLBACK_PRODUCTS.map((p, i) => ({ ...p, id: `fallback-${i}`, image_url: null, stock_quantity: null, discount_price: null, discount_until: null, description: null, parent_id: null, stock_alert_threshold: null, stock_alert_enabled: false }));
    }
    return data;
  } catch (e) {
    console.warn("[products] Exception, using fallback:", e);
    return FALLBACK_PRODUCTS.map((p, i) => ({ ...p, id: `fallback-${i}`, image_url: null, stock_quantity: null, discount_price: null, discount_until: null, description: null, parent_id: null, stock_alert_threshold: null, stock_alert_enabled: false }));
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
      return fb ? { ...fb, id: "fallback", image_url: null, stock_quantity: null, discount_price: null, discount_until: null, description: null, parent_id: null, stock_alert_threshold: null, stock_alert_enabled: false } : null;
    }
    return data;
  } catch (e) {
    const fb = FALLBACK_PRODUCTS.find((p) => p.code === code);
    return fb ? { ...fb, id: "fallback", image_url: null, stock_quantity: null, discount_price: null, discount_until: null, description: null, parent_id: null, stock_alert_threshold: null, stock_alert_enabled: false } : null;
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
