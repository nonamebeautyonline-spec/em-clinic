// lib/purchase/shipping-fee.ts — 配送料自動計算

import type { CartItem } from "./cart";

/** クール便配送料 */
export const COOL_SHIPPING_FEE = 3000;
/** 常温便配送料 */
export const NORMAL_SHIPPING_FEE = 550;

/**
 * カート内容から配送料を計算
 * - クール便商品が1つでもあれば3,000円（常温商品の配送料は吸収）
 * - 常温のみなら550円
 * - 注文ごとに1回
 */
export function calculateShippingFee(items: CartItem[]): number {
  if (items.length === 0) return 0;
  const hasCool = items.some(
    (item) => item.coolType === "chilled" || item.coolType === "frozen"
  );
  return hasCool ? COOL_SHIPPING_FEE : NORMAL_SHIPPING_FEE;
}

/**
 * サーバーサイド用: 商品コードリストから配送料を計算
 * coolTypeMap: { code: coolType } のマッピング
 */
export function calculateShippingFeeFromCodes(
  items: { code: string; coolType: string | null }[]
): number {
  if (items.length === 0) return 0;
  const hasCool = items.some(
    (item) => item.coolType === "chilled" || item.coolType === "frozen"
  );
  return hasCool ? COOL_SHIPPING_FEE : NORMAL_SHIPPING_FEE;
}
