// lib/pricing.ts — 価格計算の統合モジュール
//
// 優先順位: 個別患者割引 > キャンペーン > 商品discount_price > 通常価格
// クーポンは上記の最終価格に追加適用

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, withTenant } from "@/lib/tenant";

export type PriceBreakdown = {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  appliedDiscount: {
    type: "patient_discount" | "campaign" | "product_discount" | "none";
    name: string;
    discountType: "percent" | "fixed";
    discountValue: number;
  };
  coupon: {
    applied: boolean;
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    couponDiscount: number;
  } | null;
};

type Product = {
  id: string;
  price: number;
  discount_price: number | null;
  discount_until: string | null;
  category?: string;
};

type Campaign = {
  id: string;
  name: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  target_type: "all" | "category" | "specific";
  target_ids: string[];
  target_category: string;
  starts_at: string;
  ends_at: string | null;
};

type PatientDiscount = {
  id: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  reason: string;
  product_id: string | null;
  valid_until: string | null;
};

type Coupon = {
  id: number;
  discount_type: "percent" | "fixed";
  discount_value: number;
  code: string;
  min_purchase: number;
};

/**
 * 割引額を計算（共通ヘルパー）
 */
function calcDiscount(basePrice: number, discountType: "percent" | "fixed", discountValue: number): number {
  if (discountType === "percent") {
    return Math.round(basePrice * discountValue / 100);
  }
  return Math.min(discountValue, basePrice);
}

/**
 * 商品の最終価格を計算（全割引要素を統合）
 */
export async function calculateFinalPrice(params: {
  product: Product;
  patientId?: string;
  couponId?: number;
  tenantId: string;
}): Promise<PriceBreakdown> {
  const { product, patientId, couponId, tenantId } = params;
  const now = new Date().toISOString();

  let finalPrice = product.price;
  let appliedDiscount: PriceBreakdown["appliedDiscount"] = {
    type: "none",
    name: "",
    discountType: "fixed",
    discountValue: 0,
  };

  // 1. 個別患者割引チェック（最優先）
  if (patientId) {
    const { data: patientDiscounts } = await strictWithTenant(
      supabaseAdmin
        .from("patient_discounts")
        .select("*")
        .eq("patient_id", patientId)
        .eq("is_active", true)
        .or(`product_id.is.null,product_id.eq.${product.id}`),
      tenantId,
    );

    const validDiscounts = (patientDiscounts || []).filter((d: PatientDiscount) => {
      if (d.valid_until && new Date(d.valid_until) < new Date()) return false;
      return true;
    });

    // 商品指定の割引を優先、なければ全商品対象の割引
    const specificDiscount = validDiscounts.find((d: PatientDiscount) => d.product_id === product.id);
    const generalDiscount = validDiscounts.find((d: PatientDiscount) => !d.product_id);
    const discount = specificDiscount || generalDiscount;

    if (discount) {
      const amount = calcDiscount(product.price, discount.discount_type, discount.discount_value);
      finalPrice = product.price - amount;
      appliedDiscount = {
        type: "patient_discount",
        name: discount.reason || "個別割引",
        discountType: discount.discount_type,
        discountValue: discount.discount_value,
      };
    }
  }

  // 2. キャンペーン割引（個別割引が未適用の場合のみ）
  if (appliedDiscount.type === "none") {
    const { data: campaigns } = await strictWithTenant(
      supabaseAdmin
        .from("campaigns")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gte.${now}`),
      tenantId,
    );

    // 対象商品にマッチするキャンペーンを探す
    const matchingCampaign = (campaigns || []).find((c: Campaign) => {
      if (c.target_type === "all") return true;
      if (c.target_type === "category" && product.category === c.target_category) return true;
      if (c.target_type === "specific" && c.target_ids?.includes(product.id)) return true;
      return false;
    });

    if (matchingCampaign) {
      const amount = calcDiscount(product.price, matchingCampaign.discount_type, matchingCampaign.discount_value);
      finalPrice = product.price - amount;
      appliedDiscount = {
        type: "campaign",
        name: matchingCampaign.name,
        discountType: matchingCampaign.discount_type,
        discountValue: matchingCampaign.discount_value,
      };
    }
  }

  // 3. 商品の割引価格（上記が未適用の場合のみ）
  if (appliedDiscount.type === "none" && product.discount_price != null) {
    const untilValid = !product.discount_until || new Date(product.discount_until) > new Date();
    if (untilValid && product.discount_price < product.price) {
      finalPrice = product.discount_price;
      appliedDiscount = {
        type: "product_discount",
        name: "商品割引",
        discountType: "fixed",
        discountValue: product.price - product.discount_price,
      };
    }
  }

  // 4. クーポン適用（上記の最終価格に追加適用）
  let couponInfo: PriceBreakdown["coupon"] = null;
  if (couponId) {
    const { data: coupon } = await withTenant(
      supabaseAdmin.from("coupons").select("*").eq("id", couponId).eq("is_active", true).single(),
      tenantId,
    );

    if (coupon) {
      const c = coupon as Coupon;
      if (finalPrice >= (c.min_purchase || 0)) {
        const couponDiscount = calcDiscount(finalPrice, c.discount_type, c.discount_value);
        couponInfo = {
          applied: true,
          code: c.code,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          couponDiscount,
        };
        finalPrice = Math.max(0, finalPrice - couponDiscount);
      }
    }
  }

  return {
    originalPrice: product.price,
    finalPrice: Math.max(0, finalPrice),
    discountAmount: product.price - finalPrice,
    appliedDiscount,
    coupon: couponInfo,
  };
}

/**
 * 商品一覧に対してアクティブなキャンペーン割引価格を付与（表示用）
 */
export async function getActiveCampaigns(tenantId: string): Promise<Campaign[]> {
  const now = new Date().toISOString();
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false }),
    tenantId,
  );
  return (data || []) as Campaign[];
}

/**
 * 商品にキャンペーン割引を適用した表示価格を取得
 */
export function applyCampaignPrice(
  product: Product,
  campaigns: Campaign[],
): { effectivePrice: number; campaign: Campaign | null } {
  // 商品のdiscount_priceが有効な場合はそちらを優先
  if (product.discount_price != null) {
    const untilValid = !product.discount_until || new Date(product.discount_until) > new Date();
    if (untilValid && product.discount_price < product.price) {
      return { effectivePrice: product.discount_price, campaign: null };
    }
  }

  for (const c of campaigns) {
    let matches = false;
    if (c.target_type === "all") matches = true;
    else if (c.target_type === "category" && product.category === c.target_category) matches = true;
    else if (c.target_type === "specific" && c.target_ids?.includes(product.id)) matches = true;

    if (matches) {
      const discount = calcDiscount(product.price, c.discount_type, c.discount_value);
      return { effectivePrice: product.price - discount, campaign: c };
    }
  }

  return { effectivePrice: product.price, campaign: null };
}
