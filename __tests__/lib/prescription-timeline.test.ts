import { describe, it, expect, vi } from "vitest";

// reorder-karte.ts が lib/supabase をインポートするためモック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {},
}));

import { buildPrescriptionTimeline, type TimelineEntry } from "@/lib/prescription-timeline";

describe("buildPrescriptionTimeline", () => {
  it("空のデータで空配列を返す", () => {
    const result = buildPrescriptionTimeline([], []);
    expect(result).toEqual([]);
  });

  it("初回注文をinitialとして返す", () => {
    const orders = [{ product_code: "MJL_2.5mg_1m", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" }];
    const result = buildPrescriptionTimeline(orders, []);
    expect(result).toHaveLength(1);
    expect(result[0].change).toBe("initial");
    expect(result[0].dose).toBe(2.5);
    expect(result[0].prevDose).toBeNull();
    expect(result[0].source).toBe("order");
  });

  it("増量を正しく検出する", () => {
    const orders = [
      { product_code: "MJL_2.5mg_1m", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
    ];
    const reorders = [
      { product_code: "MJL_5mg_1m", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01T00:00:00Z", karte_note: "増量" },
    ];
    const result = buildPrescriptionTimeline(orders, reorders);
    expect(result).toHaveLength(2);
    // 降順なので最新が先
    expect(result[0].change).toBe("increase");
    expect(result[0].dose).toBe(5);
    expect(result[0].prevDose).toBe(2.5);
    expect(result[0].source).toBe("reorder");
    expect(result[0].karteNote).toBe("増量");
  });

  it("減量を正しく検出する", () => {
    const orders = [
      { product_code: "MJL_5mg_1m", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
    ];
    const reorders = [
      { product_code: "MJL_2.5mg_1m", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01T00:00:00Z", karte_note: null },
    ];
    const result = buildPrescriptionTimeline(orders, reorders);
    expect(result[0].change).toBe("decrease");
    expect(result[0].dose).toBe(2.5);
    expect(result[0].prevDose).toBe(5);
  });

  it("同量を正しく検出する", () => {
    const orders = [
      { product_code: "MJL_5mg_1m", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
    ];
    const reorders = [
      { product_code: "MJL_5mg_3m", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01T00:00:00Z", karte_note: null },
    ];
    const result = buildPrescriptionTimeline(orders, reorders);
    expect(result[0].change).toBe("same");
    expect(result[0].dose).toBe(5);
    expect(result[0].prevDose).toBe(5);
  });

  it("product_codeがnullのレコードをスキップする", () => {
    const orders = [
      { product_code: null, paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
      { product_code: "MJL_2.5mg_1m", paid_at: "2026-01-02T00:00:00Z", created_at: "2026-01-02T00:00:00Z" },
    ];
    const result = buildPrescriptionTimeline(orders, []);
    expect(result).toHaveLength(1);
  });

  it("paid_atがないreorderをスキップする", () => {
    const reorders = [
      { product_code: "MJL_5mg_1m", paid_at: null, created_at: "2026-01-01T00:00:00Z", karte_note: null },
      { product_code: "MJL_5mg_1m", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01T00:00:00Z", karte_note: null },
    ];
    const result = buildPrescriptionTimeline([], reorders);
    expect(result).toHaveLength(1);
  });

  it("結果が日付降順（新しい順）で返される", () => {
    const orders = [
      { product_code: "MJL_2.5mg_1m", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
      { product_code: "MJL_5mg_1m", paid_at: "2026-03-01T00:00:00Z", created_at: "2026-03-01T00:00:00Z" },
    ];
    const reorders = [
      { product_code: "MJL_7.5mg_1m", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01T00:00:00Z", karte_note: null },
    ];
    const result = buildPrescriptionTimeline(orders, reorders);
    expect(result).toHaveLength(3);
    // 降順: 3月 → 2月 → 1月
    expect(result[0].dose).toBe(5);
    expect(result[1].dose).toBe(7.5);
    expect(result[2].dose).toBe(2.5);
  });

  it("productNameがフォーマットされている", () => {
    const orders = [{ product_code: "MJL_2.5mg_1m", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" }];
    const result = buildPrescriptionTimeline(orders, []);
    expect(result[0].productName).toContain("マンジャロ");
  });

  it("mgを含まないproduct_codeでdoseがnullになる", () => {
    const orders = [{ product_code: "OTHER_PRODUCT", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" }];
    const result = buildPrescriptionTimeline(orders, []);
    expect(result[0].dose).toBeNull();
    expect(result[0].change).toBe("initial");
  });

  it("連続した増量→減量→同量の推移を正しく追跡する", () => {
    const orders = [
      { product_code: "MJL_2.5mg_1m", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
    ];
    const reorders = [
      { product_code: "MJL_5mg_1m", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01T00:00:00Z", karte_note: null },
      { product_code: "MJL_2.5mg_1m", paid_at: "2026-03-01T00:00:00Z", created_at: "2026-03-01T00:00:00Z", karte_note: null },
      { product_code: "MJL_2.5mg_3m", paid_at: "2026-04-01T00:00:00Z", created_at: "2026-04-01T00:00:00Z", karte_note: null },
    ];
    const result = buildPrescriptionTimeline(orders, reorders);
    // 降順: 4月(同量) → 3月(減量) → 2月(増量) → 1月(初回)
    expect(result[0].change).toBe("same");
    expect(result[1].change).toBe("decrease");
    expect(result[2].change).toBe("increase");
    expect(result[3].change).toBe("initial");
  });
});
