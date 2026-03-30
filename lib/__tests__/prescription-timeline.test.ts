// lib/__tests__/prescription-timeline.test.ts
// 処方タイムライン構築のテスト

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/reorder-karte", () => ({
  extractDose: vi.fn((code: string) => {
    // 商品コードから用量を抽出するモック: "MN-5mg" → 5
    const match = code.match(/(\d+)mg/);
    return match ? parseInt(match[1], 10) : null;
  }),
}));

vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: vi.fn((code: string) => `商品:${code}`),
}));

const { buildPrescriptionTimeline } = await import(
  "@/lib/prescription-timeline"
);

/* ---------- テスト ---------- */

describe("prescription-timeline", () => {
  it("空のデータで空配列を返す", () => {
    const result = buildPrescriptionTimeline([], []);
    expect(result).toEqual([]);
  });

  it("ordersのみからタイムラインを構築する", () => {
    const orders = [
      { product_code: "MN-5mg", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" },
      { product_code: "MN-10mg", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01" },
    ];

    const result = buildPrescriptionTimeline(orders, []);

    expect(result).toHaveLength(2);
    // 降順（新しい順）で返される
    expect(result[0].productCode).toBe("MN-10mg");
    expect(result[0].change).toBe("increase");
    expect(result[0].dose).toBe(10);
    expect(result[0].prevDose).toBe(5);
    expect(result[1].productCode).toBe("MN-5mg");
    expect(result[1].change).toBe("initial");
  });

  it("reordersを含むタイムラインを構築する", () => {
    const orders = [
      { product_code: "MN-5mg", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" },
    ];
    const reorders = [
      { product_code: "MN-5mg", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01", karte_note: "継続処方" },
    ];

    const result = buildPrescriptionTimeline(orders, reorders);

    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("reorder");
    expect(result[0].karteNote).toBe("継続処方");
    expect(result[0].change).toBe("same");
    expect(result[1].source).toBe("order");
  });

  it("paid_atがないreorderはスキップされる", () => {
    const reorders = [
      { product_code: "MN-5mg", paid_at: null, created_at: "2026-01-01", karte_note: null },
    ];

    const result = buildPrescriptionTimeline([], reorders);
    expect(result).toEqual([]);
  });

  it("product_codeがnullのレコードはスキップされる", () => {
    const orders = [
      { product_code: null, paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" },
    ];

    const result = buildPrescriptionTimeline(orders, []);
    expect(result).toEqual([]);
  });

  it("日付降順でソートされる", () => {
    const orders = [
      { product_code: "MN-5mg", paid_at: "2026-03-01T00:00:00Z", created_at: "2026-03-01" },
      { product_code: "MN-10mg", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" },
      { product_code: "MN-5mg", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01" },
    ];

    const result = buildPrescriptionTimeline(orders, []);

    expect(result[0].date).toBe("2026-03-01T00:00:00Z");
    expect(result[1].date).toBe("2026-02-01T00:00:00Z");
    expect(result[2].date).toBe("2026-01-01T00:00:00Z");
  });

  it("用量減少を検出する", () => {
    const orders = [
      { product_code: "MN-10mg", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" },
      { product_code: "MN-5mg", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01" },
    ];

    const result = buildPrescriptionTimeline(orders, []);

    // 降順なので最新（5mg）が先
    expect(result[0].change).toBe("decrease");
    expect(result[0].dose).toBe(5);
    expect(result[0].prevDose).toBe(10);
  });

  it("formatProductCodeで商品名が変換される", () => {
    const orders = [
      { product_code: "MN-5mg", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" },
    ];

    const result = buildPrescriptionTimeline(orders, []);
    expect(result[0].productName).toBe("商品:MN-5mg");
  });

  it("用量が取得できない商品コードはchange=sameになる", () => {
    const orders = [
      { product_code: "MN-5mg", paid_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01" },
      { product_code: "UNKNOWN-X", paid_at: "2026-02-01T00:00:00Z", created_at: "2026-02-01" },
    ];

    const result = buildPrescriptionTimeline(orders, []);

    // UNKNOWN-Xのdoseはnull → change=same
    expect(result[0].dose).toBeNull();
    expect(result[0].change).toBe("same");
  });
});
