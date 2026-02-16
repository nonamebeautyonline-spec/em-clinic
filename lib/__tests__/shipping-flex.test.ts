// lib/__tests__/shipping-flex.test.ts
// 発送通知Flexメッセージのビルド・送信テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_FLEX_CONFIG } from "@/lib/flex-message/types";

// --- モック ---
vi.mock("@/lib/flex-message/config", () => ({
  getFlexConfig: vi.fn().mockResolvedValue(DEFAULT_FLEX_CONFIG),
}));

const mockInsert = vi.fn().mockReturnValue({ error: null });
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({ insert: mockInsert })),
  },
}));

const mockPushMessage = vi.fn();
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: any[]) => mockPushMessage(...args),
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tid: string | null) => ({ tenant_id: tid || null }),
}));

// --- テスト内ヘルパー関数（private関数ロジック再実装） ---
function formatTrackingNumber(num: string): string {
  const digits = num.replace(/\D/g, "");
  if (digits.length === 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
  }
  return num;
}

function buildTrackingUrl(carrier: string, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber.replace(/\D/g, ""));
  if (carrier === "japanpost") {
    return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${tn}`;
  }
  return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${tn}`;
}

function carrierLabel(carrier: string): string {
  if (carrier === "japanpost") return "日本郵便";
  return "ヤマト運輸 チルド便";
}

// --- テスト ---
describe("shipping-flex: formatTrackingNumber", () => {
  it("12桁の数字 → XXXX-XXXX-XXXX 形式", () => {
    expect(formatTrackingNumber("123456789012")).toBe("1234-5678-9012");
  });

  it("12桁以外はそのまま返す", () => {
    expect(formatTrackingNumber("JP1234567890")).toBe("JP1234567890");
    expect(formatTrackingNumber("12345")).toBe("12345");
  });
});

describe("shipping-flex: buildTrackingUrl", () => {
  it("japanpost → 日本郵便追跡URL", () => {
    const url = buildTrackingUrl("japanpost", "123456789012");
    expect(url).toBe(
      "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=123456789012",
    );
  });

  it("yamato → ヤマト運輸追跡URL", () => {
    const url = buildTrackingUrl("yamato", "123456789012");
    expect(url).toBe(
      "https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=123456789012",
    );
  });
});

describe("shipping-flex: carrierLabel", () => {
  it("japanpost → '日本郵便'", () => {
    expect(carrierLabel("japanpost")).toBe("日本郵便");
  });

  it("yamato → 'ヤマト運輸 チルド便'", () => {
    expect(carrierLabel("yamato")).toBe("ヤマト運輸 チルド便");
  });
});

describe("shipping-flex: buildShippingFlex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bubble構造（type:bubble, header, body, footer）を生成する", async () => {
    const { buildShippingFlex } = await import("@/lib/shipping-flex");

    const result = await buildShippingFlex([
      { number: "123456789012", carrier: "yamato" },
    ]);

    expect(result.type).toBe("flex");
    expect(result.altText).toContain("発送完了");
    expect(result.altText).toContain("1234-5678-9012");

    const bubble = result.contents;
    expect(bubble.type).toBe("bubble");
    expect(bubble.header).toBeDefined();
    expect(bubble.body).toBeDefined();
    expect(bubble.footer).toBeDefined();

    // ヘッダーテキスト確認
    expect(bubble.header.contents[0].text).toBe(DEFAULT_FLEX_CONFIG.shipping.header);
    // フッターにボタンがある
    expect(bubble.footer.contents[0].type).toBe("button");
  });

  it("複数追跡番号 → bodyにXLとLGサイズのテキストが含まれる", async () => {
    const { buildShippingFlex } = await import("@/lib/shipping-flex");

    const result = await buildShippingFlex([
      { number: "111122223333", carrier: "japanpost" },
      { number: "444455556666", carrier: "japanpost" },
    ]);

    const bubble = result.contents;
    // bodyの追跡番号セクション（box内のcontents）
    const trackingBox = bubble.body.contents.find(
      (c: any) => c.type === "box" && c.contents?.some((t: any) => t.size === "xl"),
    );
    expect(trackingBox).toBeDefined();

    // 1つ目はXL、2つ目はLG
    const xlTexts = trackingBox.contents.filter((t: any) => t.size === "xl");
    const lgTexts = trackingBox.contents.filter((t: any) => t.size === "lg");
    expect(xlTexts.length).toBe(1);
    expect(lgTexts.length).toBe(1);

    // フォーマット済み追跡番号
    expect(xlTexts[0].text).toBe("1111-2222-3333");
    expect(lgTexts[0].text).toBe("4444-5555-6666");
  });
});
