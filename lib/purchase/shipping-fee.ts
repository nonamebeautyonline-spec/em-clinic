// lib/purchase/shipping-fee.ts — 配送料自動計算

import type { CartItem } from "./cart";

/** クール便配送料 */
export const COOL_SHIPPING_FEE = 3000;
/** 常温便配送料 */
export const NORMAL_SHIPPING_FEE = 550;

/**
 * カート内容から配送料を計算
 *
 * ルール:
 * - 通常便(delay=0)と予約便(delay>0)は発送タイミングが異なるため別便扱い
 * - 各便ごとにクール便商品があれば3,000円、常温のみなら550円
 * - 同じ配送タイプ内は同梱（配送料1回）
 *
 * 例:
 * - 通常便クール + 予約便クール = 3,000 + 3,000 = 6,000円
 * - 通常便クール + 通常便常温 = 3,000円（常温は吸収）
 * - 常温のみ1品 = 550円
 */
export function calculateShippingFee(items: CartItem[]): number {
  if (items.length === 0) return 0;

  // 配送タイプ別にグループ化（通常便=0, 予約便=delay値）
  const shipmentGroups = new Map<number, CartItem[]>();
  for (const item of items) {
    const delay = item.shippingDelayDays ?? 0;
    const key = delay > 0 ? 1 : 0; // 通常便(0) vs 予約便(1) の2グループ
    if (!shipmentGroups.has(key)) shipmentGroups.set(key, []);
    shipmentGroups.get(key)!.push(item);
  }

  let total = 0;
  for (const [, groupItems] of shipmentGroups) {
    const hasCool = groupItems.some(
      (item) => item.coolType === "chilled" || item.coolType === "frozen"
    );
    total += hasCool ? COOL_SHIPPING_FEE : NORMAL_SHIPPING_FEE;
  }

  return total;
}

/**
 * サーバーサイド用: 商品リストから配送料を計算
 */
export function calculateShippingFeeFromCodes(
  items: { code: string; coolType: string | null; shippingDelayDays?: number }[]
): number {
  if (items.length === 0) return 0;

  const shipmentGroups = new Map<number, typeof items>();
  for (const item of items) {
    const key = (item.shippingDelayDays ?? 0) > 0 ? 1 : 0;
    if (!shipmentGroups.has(key)) shipmentGroups.set(key, []);
    shipmentGroups.get(key)!.push(item);
  }

  let total = 0;
  for (const [, groupItems] of shipmentGroups) {
    const hasCool = groupItems.some(
      (item) => item.coolType === "chilled" || item.coolType === "frozen"
    );
    total += hasCool ? COOL_SHIPPING_FEE : NORMAL_SHIPPING_FEE;
  }

  return total;
}
