// lib/__tests__/shipping-fee.test.ts — 送料計算のユニットテスト
import { describe, it, expect } from "vitest";
import {
  calculateShippingFee,
  calculateShippingFeeFromCodes,
  COOL_SHIPPING_FEE,
  NORMAL_SHIPPING_FEE,
} from "../purchase/shipping-fee";

describe("calculateShippingFee", () => {
  it("空のカートは送料0", () => {
    expect(calculateShippingFee([])).toBe(0);
  });

  it("常温商品1品は550円", () => {
    const items = [{ code: "A", title: "A", price: 1000, qty: 1, coolType: null, shippingDelayDays: 0 }];
    expect(calculateShippingFee(items)).toBe(NORMAL_SHIPPING_FEE);
  });

  it("クール便（chilled）商品1品は3000円", () => {
    const items = [{ code: "A", title: "A", price: 1000, qty: 1, coolType: "chilled", shippingDelayDays: 0 }];
    expect(calculateShippingFee(items)).toBe(COOL_SHIPPING_FEE);
  });

  it("クール便（frozen）商品1品は3000円", () => {
    const items = [{ code: "A", title: "A", price: 1000, qty: 1, coolType: "frozen", shippingDelayDays: 0 }];
    expect(calculateShippingFee(items)).toBe(COOL_SHIPPING_FEE);
  });

  it("通常便クール + 通常便常温 = クール料金のみ（同梱）", () => {
    const items = [
      { code: "A", title: "A", price: 1000, qty: 1, coolType: "chilled", shippingDelayDays: 0 },
      { code: "B", title: "B", price: 500, qty: 1, coolType: null, shippingDelayDays: 0 },
    ];
    expect(calculateShippingFee(items)).toBe(COOL_SHIPPING_FEE);
  });

  it("通常便 + 予約便（delay>0）= 別便扱いで合計", () => {
    const items = [
      { code: "A", title: "A", price: 1000, qty: 1, coolType: null, shippingDelayDays: 0 },
      { code: "B", title: "B", price: 500, qty: 1, coolType: null, shippingDelayDays: 7 },
    ];
    expect(calculateShippingFee(items)).toBe(NORMAL_SHIPPING_FEE * 2);
  });

  it("通常便クール + 予約便クール = 3000 + 3000", () => {
    const items = [
      { code: "A", title: "A", price: 1000, qty: 1, coolType: "chilled", shippingDelayDays: 0 },
      { code: "B", title: "B", price: 500, qty: 1, coolType: "frozen", shippingDelayDays: 14 },
    ];
    expect(calculateShippingFee(items)).toBe(COOL_SHIPPING_FEE * 2);
  });

  it("shippingDelayDays が undefined の場合は通常便（delay=0）扱い", () => {
    const items = [
      { code: "A", title: "A", price: 1000, qty: 1, coolType: null, shippingDelayDays: undefined as unknown as number },
    ];
    expect(calculateShippingFee(items)).toBe(NORMAL_SHIPPING_FEE);
  });

  it("複数の予約便商品は1グループにまとまる", () => {
    const items = [
      { code: "A", title: "A", price: 1000, qty: 1, coolType: null, shippingDelayDays: 7 },
      { code: "B", title: "B", price: 500, qty: 1, coolType: null, shippingDelayDays: 14 },
    ];
    // 両方 delay > 0 なので同一グループ（key=1）
    expect(calculateShippingFee(items)).toBe(NORMAL_SHIPPING_FEE);
  });
});

describe("calculateShippingFeeFromCodes", () => {
  it("空リストは送料0", () => {
    expect(calculateShippingFeeFromCodes([])).toBe(0);
  });

  it("常温商品はNORMAL_SHIPPING_FEE", () => {
    const items = [{ code: "A", coolType: null }];
    expect(calculateShippingFeeFromCodes(items)).toBe(NORMAL_SHIPPING_FEE);
  });

  it("chilled商品はCOOL_SHIPPING_FEE", () => {
    const items = [{ code: "A", coolType: "chilled" }];
    expect(calculateShippingFeeFromCodes(items)).toBe(COOL_SHIPPING_FEE);
  });

  it("delay>0 と delay=0 は別グループ", () => {
    const items = [
      { code: "A", coolType: null, shippingDelayDays: 0 },
      { code: "B", coolType: null, shippingDelayDays: 7 },
    ];
    expect(calculateShippingFeeFromCodes(items)).toBe(NORMAL_SHIPPING_FEE * 2);
  });
});
