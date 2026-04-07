// lib/purchase/resolve-cart.ts — 決済API共通: カート内容の解決・金額計算
import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant } from "@/lib/tenant";
import { calculateShippingFeeFromCodes } from "./shipping-fee";

export type CartItemInput = { code: string; qty: number };

export type ResolvedCartItem = {
  code: string;
  title: string;
  price: number;
  qty: number;
  coolType: string | null;
  shippingDelayDays: number;
};

export type ResolvedCart = {
  items: ResolvedCartItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  productCode: string;   // 後方互換: メイン商品コード
  productName: string;   // 後方互換: メイン商品名（カンマ区切り）
};

/**
 * カートアイテムをDBから解決し、金額を計算する
 * 単一商品モード（productCode）とカートモード（cartItems）の両方に対応
 */
export async function resolveCart(
  tenantId: string,
  productCode?: string,
  cartItems?: CartItemInput[]
): Promise<ResolvedCart> {
  // カートモード
  if (cartItems && cartItems.length > 0) {
    const codes = cartItems.map((i) => i.code);
    const { data: products, error } = await strictWithTenant(
      supabaseAdmin
        .from("products")
        .select("code, title, price, cool_type, shipping_delay_days")
        .in("code", codes)
        .eq("is_active", true),
      tenantId
    );

    if (error) throw new Error(`商品取得エラー: ${error.message}`);
    if (!products || products.length === 0) throw new Error("商品が見つかりません");

    const productMap = new Map(products.map((p) => [p.code, p]));
    const resolved: ResolvedCartItem[] = [];

    for (const item of cartItems) {
      const p = productMap.get(item.code);
      if (!p) throw new Error(`商品 ${item.code} が見つかりません`);
      resolved.push({
        code: p.code,
        title: p.title,
        price: p.price,
        qty: item.qty,
        coolType: p.cool_type,
        shippingDelayDays: p.shipping_delay_days ?? 0,
      });
    }

    const subtotal = resolved.reduce((sum, i) => sum + i.price * i.qty, 0);
    const shippingFee = calculateShippingFeeFromCodes(
      resolved.map((i) => ({ code: i.code, coolType: i.coolType, shippingDelayDays: i.shippingDelayDays }))
    );
    const totalAmount = subtotal + shippingFee;

    return {
      items: resolved,
      subtotal,
      shippingFee,
      totalAmount,
      productCode: resolved[0].code,
      productName: resolved.map((i) => i.title).join("\n"),
    };
  }

  // 単一商品モード（後方互換）
  if (!productCode) throw new Error("商品コードまたはカートアイテムが必要です");

  const { data: product, error } = await strictWithTenant(
    supabaseAdmin
      .from("products")
      .select("code, title, price, cool_type, shipping_delay_days")
      .eq("code", productCode)
      .eq("is_active", true)
      .maybeSingle(),
    tenantId
  );

  if (error) throw new Error(`商品取得エラー: ${error.message}`);
  if (!product) throw new Error(`商品 ${productCode} が見つかりません`);

  return {
    items: [{ code: product.code, title: product.title, price: product.price, qty: 1, coolType: product.cool_type, shippingDelayDays: product.shipping_delay_days ?? 0 }],
    subtotal: product.price,
    shippingFee: 0, // 単一モードでは従来通りprice込みで扱う（のなめ互換）
    totalAmount: product.price,
    productCode: product.code,
    productName: product.title,
  };
}
