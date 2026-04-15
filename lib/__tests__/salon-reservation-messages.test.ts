// lib/__tests__/salon-reservation-messages.test.ts — サロン予約メッセージ生成テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["select", "insert", "update", "delete", "eq", "neq", "is", "not",
   "in", "or", "order", "limit", "single", "maybeSingle"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
}));

import {
  buildMenuSelectMessage,
  buildStylistSelectMessage,
  buildDateSelectMessage,
  buildTimeSelectMessage,
  buildConfirmMessage,
  buildCompletedMessage,
  buildCancelledMessage,
} from "../salon-reservation-messages";
import type { ReservationFlowState } from "../salon-reservation-flow";

describe("buildMenuSelectMessage", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("メニューがない場合はテキストメッセージを返す", async () => {
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
    const msg = await buildMenuSelectMessage("t1");
    expect(msg.type).toBe("text");
    expect((msg as { text: string }).text).toContain("メニューがありません");
  });

  it("メニューがある場合はFlexカルーセルを返す", async () => {
    const menus = [
      { id: "m1", name: "カット", duration_min: 60, price: 5000, description: "基本カット" },
      { id: "m2", name: "カラー", duration_min: 90, price: 8000, description: null },
    ];
    mockFrom.mockReturnValue(createChain({ data: menus, error: null }));

    const msg = await buildMenuSelectMessage("t1");
    expect(msg.type).toBe("flex");
    expect((msg as any).altText).toContain("施術メニュー");
    expect((msg as any).contents.type).toBe("carousel");
    expect((msg as any).contents.contents).toHaveLength(2);
  });

  it("メニューは最大10枚に制限される", async () => {
    const menus = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i}`, name: `メニュー${i}`, duration_min: 30, price: 1000, description: null,
    }));
    mockFrom.mockReturnValue(createChain({ data: menus, error: null }));

    const msg = await buildMenuSelectMessage("t1");
    expect((msg as any).contents.contents).toHaveLength(10);
  });
});

describe("buildStylistSelectMessage", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("スタイリストがいない場合はテキストメッセージを返す", async () => {
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));
    const msg = await buildStylistSelectMessage("t1");
    expect(msg.type).toBe("text");
    expect((msg as { text: string }).text).toContain("スタイリスト");
  });

  it("スタイリストがいる場合は「指名なし」＋スタイリスト一覧のカルーセル", async () => {
    const stylists = [
      { id: "s1", name: "山田", display_name: "ヤマダ", specialties: ["カット", "カラー"] },
    ];
    mockFrom.mockReturnValue(createChain({ data: stylists, error: null }));

    const msg = await buildStylistSelectMessage("t1");
    expect(msg.type).toBe("flex");
    // 指名なし + 1スタイリスト = 2バブル
    expect((msg as any).contents.contents).toHaveLength(2);
    // 最初のバブルは「指名なし」
    const firstBubble = (msg as any).contents.contents[0];
    expect(firstBubble.body.contents[0].text).toBe("指名なし");
  });
});

describe("buildDateSelectMessage", () => {
  it("Quick Reply付きのテキストメッセージを返す", () => {
    const msg = buildDateSelectMessage();
    expect(msg.type).toBe("text");
    expect((msg as any).quickReply).toBeDefined();
    expect((msg as any).quickReply.items).toHaveLength(7);
  });

  it("日付フォーマットが YYYY-MM-DD", () => {
    const msg = buildDateSelectMessage();
    const firstItem = (msg as any).quickReply.items[0];
    expect(firstItem.action.data).toMatch(/date=\d{4}-\d{2}-\d{2}/);
  });
});

describe("buildTimeSelectMessage", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("シフトがない場合は営業時間外メッセージを返す", async () => {
    // 指名ありでシフトなし
    mockFrom
      .mockReturnValueOnce(createChain({ data: [], error: null }))  // specific_date
      .mockReturnValueOnce(createChain({ data: [], error: null })); // weekly

    const msg = await buildTimeSelectMessage("t1", "s1", "2026-04-20", 60);
    expect(msg.type).toBe("text");
    expect((msg as { text: string }).text).toContain("営業時間外");
  });

  it("空き枠がある場合はQuick Replyを返す", async () => {
    const shifts = [
      { start_time: "10:00", end_time: "18:00", is_available: true },
    ];
    // specific_date検索 → ヒット
    mockFrom
      .mockReturnValueOnce(createChain({ data: shifts, error: null }))
      // reservations（既存予約チェック）
      .mockReturnValueOnce(createChain({ data: [], error: null }));

    const msg = await buildTimeSelectMessage("t1", "s1", "2026-04-20", 60);
    expect(msg.type).toBe("text");
    expect((msg as any).quickReply).toBeDefined();
    expect((msg as any).quickReply.items.length).toBeGreaterThan(0);
  });

  it("指名なし(none)の場合は全スタイリストのシフトを統合する", async () => {
    // stylists取得
    mockFrom
      .mockReturnValueOnce(createChain({ data: [{ id: "s1" }, { id: "s2" }], error: null }))
      // specific_date shifts
      .mockReturnValueOnce(createChain({
        data: [{ start_time: "10:00", end_time: "14:00", is_available: true, stylist_id: "s1" }],
        error: null,
      }));

    const msg = await buildTimeSelectMessage("t1", "none", "2026-04-20", 60);
    // 指名なしなので予約チェックはスキップ
    expect(msg.type).toBe("text");
    expect((msg as any).quickReply).toBeDefined();
  });

  it("is_available=false のシフトは除外される", async () => {
    const shifts = [
      { start_time: "10:00", end_time: "18:00", is_available: false },
    ];
    mockFrom
      .mockReturnValueOnce(createChain({ data: shifts, error: null }))
      .mockReturnValueOnce(createChain({ data: [], error: null }));

    const msg = await buildTimeSelectMessage("t1", "s1", "2026-04-20", 60);
    expect(msg.type).toBe("text");
    expect((msg as { text: string }).text).toContain("営業時間外");
  });
});

describe("buildConfirmMessage", () => {
  it("Flex Bubbleで予約内容を返す", () => {
    const state: ReservationFlowState = {
      step: "confirm",
      tenantId: "t1",
      patientId: "p1",
      lineUid: "U001",
      selectedMenuName: "カット",
      selectedStylistName: "山田",
      selectedDate: "2026-04-20",
      selectedTime: "14:00",
      selectedMenuPrice: 5000,
      selectedMenuDuration: 60,
    };
    const msg = buildConfirmMessage(state);
    expect(msg.type).toBe("flex");
    expect((msg as any).altText).toContain("確認");
  });
});

describe("buildCompletedMessage", () => {
  it("予約完了のFlex Bubbleを返す", () => {
    const state: ReservationFlowState = {
      step: "confirm",
      tenantId: "t1",
      patientId: "p1",
      lineUid: "U001",
      selectedMenuName: "カット",
      selectedStylistName: "山田",
      selectedDate: "2026-04-20",
      selectedTime: "14:00",
    };
    const msg = buildCompletedMessage(state, "salon-12345");
    expect(msg.type).toBe("flex");
    expect((msg as any).altText).toContain("確定");
  });
});

describe("buildCancelledMessage", () => {
  it("キャンセルメッセージを返す", () => {
    const msg = buildCancelledMessage();
    expect(msg.type).toBe("text");
    expect((msg as { text: string }).text).toContain("キャンセル");
  });
});
