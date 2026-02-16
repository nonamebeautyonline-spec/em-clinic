// __tests__/api/mypage.test.ts
// マイページ関連ユーティリティのロジックテスト
// 対象: app/api/mypage/route.ts, app/api/mypage/orders/route.ts, app/api/mypage/profile/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- ロジック再実装（route.ts 内の非エクスポート関数を再現） ---

type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN";
type Carrier = "japanpost" | "yamato";

function safeStr(v: any): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizePaymentStatus(v: any): PaymentStatus {
  const s = safeStr(v).toLowerCase();
  if (s === "paid" || s === "pending" || s === "failed" || s === "refunded") return s as PaymentStatus;
  if (safeStr(v).toUpperCase() === "COMPLETED") return "paid";
  return "paid";
}

function normalizeRefundStatus(v: any): RefundStatus | undefined {
  const s = safeStr(v).toUpperCase();
  if (!s) return undefined;
  if (s === "PENDING" || s === "COMPLETED" || s === "FAILED") return s as RefundStatus;
  return "UNKNOWN";
}

function toIsoFlexible(v: any): string {
  const s = (typeof v === "string" ? v : String(v ?? "")).trim();
  if (!s) return "";

  // ISOっぽい（Tを含む）ならそのまま
  if (s.includes("T")) return s;

  // yyyy/MM/dd HH:mm(:ss)
  if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const replaced = s.replace(/\//g, "-");
    const withSec = /:\d{2}:\d{2}$/.test(replaced) ? replaced : replaced + ":00";
    return withSec.replace(" ", "T") + "+09:00";
  }

  // yyyy-MM-dd HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(" ", "T") + "+09:00";
  }

  // yyyy-MM-dd or yyyy/MM/dd
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.replace(/\//g, "-").split("-");
    const y = parts[0];
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return `${y}-${mm}-${dd}T00:00:00+09:00`;
  }

  // 最後の保険
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();

  return "";
}

const TRACKING_SWITCH_AT = new Date("2025-12-22T00:00:00+09:00").getTime();

function inferCarrierFromDates(o: { shippingEta?: string; paidAt?: string }): Carrier {
  const se = safeStr(o.shippingEta).trim();
  if (se) {
    const t = new Date(se).getTime();
    if (Number.isFinite(t)) return t < TRACKING_SWITCH_AT ? "japanpost" : "yamato";
  }
  const pa = safeStr(o.paidAt).trim();
  if (pa) {
    const t = new Date(pa).getTime();
    if (Number.isFinite(t)) return t < TRACKING_SWITCH_AT ? "japanpost" : "yamato";
  }
  return "yamato";
}

// === テスト ===

describe("マイページ ユーティリティ関数テスト", () => {
  // --- normalizePaymentStatus ---
  describe("normalizePaymentStatus", () => {
    it('"paid" → "paid"', () => {
      expect(normalizePaymentStatus("paid")).toBe("paid");
    });

    it('"COMPLETED" → "paid"', () => {
      expect(normalizePaymentStatus("COMPLETED")).toBe("paid");
    });

    it('不明値 "something_random" → "paid"（デフォルト）', () => {
      expect(normalizePaymentStatus("something_random")).toBe("paid");
    });
  });

  // --- normalizeRefundStatus ---
  describe("normalizeRefundStatus", () => {
    it('"PENDING" → "PENDING"', () => {
      expect(normalizeRefundStatus("PENDING")).toBe("PENDING");
    });

    it('"COMPLETED" → "COMPLETED"', () => {
      expect(normalizeRefundStatus("COMPLETED")).toBe("COMPLETED");
    });

    it("空文字 → undefined", () => {
      expect(normalizeRefundStatus("")).toBeUndefined();
    });

    it('不明値 "xyz" → "UNKNOWN"', () => {
      expect(normalizeRefundStatus("xyz")).toBe("UNKNOWN");
    });
  });

  // --- toIsoFlexible ---
  describe("toIsoFlexible", () => {
    it('"2026/02/15 14:00" → ISO形式（+09:00）', () => {
      const result = toIsoFlexible("2026/02/15 14:00");
      expect(result).toBe("2026-02-15T14:00:00+09:00");
    });

    it('"2026-02-15 14:00:00" → ISO形式（+09:00）', () => {
      const result = toIsoFlexible("2026-02-15 14:00:00");
      expect(result).toBe("2026-02-15T14:00:00+09:00");
    });

    it('"2026-02-15" → ISO形式（T00:00:00+09:00）', () => {
      const result = toIsoFlexible("2026-02-15");
      expect(result).toBe("2026-02-15T00:00:00+09:00");
    });

    it('空文字 → ""', () => {
      expect(toIsoFlexible("")).toBe("");
    });
  });

  // --- inferCarrierFromDates ---
  describe("inferCarrierFromDates", () => {
    it("TRACKING_SWITCH_AT（2025-12-22）より前 → japanpost、以後 → yamato", () => {
      // 切替日前（2025-11-01）→ japanpost
      expect(
        inferCarrierFromDates({ shippingEta: "2025-11-01", paidAt: "2025-10-01" })
      ).toBe("japanpost");

      // 切替日後（2026-01-15）→ yamato
      expect(
        inferCarrierFromDates({ shippingEta: "2026-01-15", paidAt: "2026-01-10" })
      ).toBe("yamato");

      // shippingEta なし、paidAt で判定（切替前）
      expect(
        inferCarrierFromDates({ paidAt: "2025-06-01" })
      ).toBe("japanpost");

      // 両方なし → デフォルト yamato
      expect(
        inferCarrierFromDates({})
      ).toBe("yamato");
    });
  });
});
