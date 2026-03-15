// __tests__/api/dunning.test.ts
// 未払い自動督促（dunning）のビジネスロジックテスト
import { describe, it, expect } from "vitest";

// === 督促ステップ判定 ===
describe("dunning ステップ判定", () => {
  const DUNNING_STEPS = [
    { step: 1, daysAfter: 3 },
    { step: 2, daysAfter: 7 },
    { step: 3, daysAfter: 14 },
  ];

  function getApplicableSteps(daysSinceOrder: number): number[] {
    return DUNNING_STEPS
      .filter((s) => daysSinceOrder >= s.daysAfter)
      .map((s) => s.step);
  }

  it("注文から0日 → 督促なし", () => {
    expect(getApplicableSteps(0)).toEqual([]);
  });

  it("注文から2日 → 督促なし", () => {
    expect(getApplicableSteps(2)).toEqual([]);
  });

  it("注文から3日 → ステップ1", () => {
    expect(getApplicableSteps(3)).toEqual([1]);
  });

  it("注文から5日 → ステップ1のみ", () => {
    expect(getApplicableSteps(5)).toEqual([1]);
  });

  it("注文から7日 → ステップ1,2", () => {
    expect(getApplicableSteps(7)).toEqual([1, 2]);
  });

  it("注文から10日 → ステップ1,2", () => {
    expect(getApplicableSteps(10)).toEqual([1, 2]);
  });

  it("注文から14日 → ステップ1,2,3", () => {
    expect(getApplicableSteps(14)).toEqual([1, 2, 3]);
  });

  it("注文から30日 → ステップ1,2,3（全て対象）", () => {
    expect(getApplicableSteps(30)).toEqual([1, 2, 3]);
  });
});

// === 督促メッセージ ===
describe("dunning メッセージ内容", () => {
  const DUNNING_MESSAGES: Record<number, string> = {
    1: "お振込みのご確認をお願いいたします。ご注文のお支払いがまだ確認できておりません。お手数ですが、お振込み状況をご確認ください。",
    2: "お振込み期限が近づいています。まだお支払いが確認できておりません。お早めにお振込みをお願いいたします。",
    3: "お振込み期限を過ぎています。お支払いが確認できない場合、ご注文をキャンセルさせていただく場合がございます。至急ご対応をお願いいたします。",
  };

  it("ステップ1のメッセージは確認依頼", () => {
    expect(DUNNING_MESSAGES[1]).toContain("お振込みのご確認");
  });

  it("ステップ2のメッセージは期限接近", () => {
    expect(DUNNING_MESSAGES[2]).toContain("期限が近づいています");
  });

  it("ステップ3のメッセージは期限超過", () => {
    expect(DUNNING_MESSAGES[3]).toContain("期限を過ぎています");
  });

  it("ステップ3のメッセージにキャンセル言及", () => {
    expect(DUNNING_MESSAGES[3]).toContain("キャンセル");
  });
});

// === 経過日数計算 ===
describe("dunning 経過日数計算", () => {
  function daysSince(orderDate: string, now: Date): number {
    const order = new Date(orderDate);
    return Math.floor((now.getTime() - order.getTime()) / (1000 * 60 * 60 * 24));
  }

  it("同日は0日", () => {
    const now = new Date("2026-03-14T10:00:00Z");
    expect(daysSince("2026-03-14T08:00:00Z", now)).toBe(0);
  });

  it("3日後", () => {
    const now = new Date("2026-03-17T10:00:00Z");
    expect(daysSince("2026-03-14T10:00:00Z", now)).toBe(3);
  });

  it("7日後", () => {
    const now = new Date("2026-03-21T10:00:00Z");
    expect(daysSince("2026-03-14T10:00:00Z", now)).toBe(7);
  });

  it("14日後", () => {
    const now = new Date("2026-03-28T10:00:00Z");
    expect(daysSince("2026-03-14T10:00:00Z", now)).toBe(14);
  });
});

// === 重複チェック（order_id + dunning_step のUNIQUE制約） ===
describe("dunning 重複キー生成", () => {
  function dunningKey(orderId: string, step: number): string {
    return `${orderId}:${step}`;
  }

  it("同一注文・同一ステップは同じキー", () => {
    expect(dunningKey("order_1", 1)).toBe(dunningKey("order_1", 1));
  });

  it("同一注文・異なるステップは異なるキー", () => {
    expect(dunningKey("order_1", 1)).not.toBe(dunningKey("order_1", 2));
  });

  it("異なる注文・同一ステップは異なるキー", () => {
    expect(dunningKey("order_1", 1)).not.toBe(dunningKey("order_2", 1));
  });
});

// === 対象注文フィルタリング ===
describe("dunning 対象注文フィルタリング", () => {
  type Order = {
    id: string;
    payment_method: string;
    payment_status: string;
    status: string;
  };

  function isDunningTarget(order: Order): boolean {
    return (
      order.payment_method === "bank_transfer" &&
      (order.payment_status === "pending" || order.payment_status === "unpaid")
    );
  }

  it("銀行振込・pending → 対象", () => {
    expect(
      isDunningTarget({ id: "1", payment_method: "bank_transfer", payment_status: "pending", status: "active" })
    ).toBe(true);
  });

  it("銀行振込・unpaid → 対象", () => {
    expect(
      isDunningTarget({ id: "2", payment_method: "bank_transfer", payment_status: "unpaid", status: "active" })
    ).toBe(true);
  });

  it("銀行振込・paid → 対象外", () => {
    expect(
      isDunningTarget({ id: "3", payment_method: "bank_transfer", payment_status: "paid", status: "active" })
    ).toBe(false);
  });

  it("クレカ・pending → 対象外", () => {
    expect(
      isDunningTarget({ id: "4", payment_method: "credit_card", payment_status: "pending", status: "active" })
    ).toBe(false);
  });
});
