// lib/__tests__/reservation-flex.test.ts
// 予約通知Flexメッセージのビルド・送信テスト
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

// --- テスト ---
describe("reservation-flex: formatDateTime（buildReservationCreatedFlex経由）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("日付フォーマット＋曜日＋15分枠が正しい", async () => {
    const { buildReservationCreatedFlex } = await import("@/lib/reservation-flex");

    // 2026-02-15 は日曜日
    const result = await buildReservationCreatedFlex("2026-02-15", "14:00:00");

    // altText に "2/15(日) 14:00〜14:15" が含まれるはず
    expect(result.altText).toContain("2/15(日) 14:00〜14:15");
  });
});

describe("reservation-flex: buildReservationCreatedFlex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("altText確認とbubble構造を持つ", async () => {
    const { buildReservationCreatedFlex } = await import("@/lib/reservation-flex");

    const result = await buildReservationCreatedFlex("2026-02-16", "10:30:00");

    expect(result.type).toBe("flex");
    expect(result.altText).toContain("予約確定");

    const bubble = result.contents;
    expect(bubble.type).toBe("bubble");
    expect(bubble.header).toBeDefined();
    expect(bubble.body).toBeDefined();

    // ヘッダーテキスト
    expect(bubble.header.contents[0].text).toBe(DEFAULT_FLEX_CONFIG.reservation.createdHeader);
  });
});

describe("reservation-flex: buildReservationChangedFlex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("旧→新の日時が表示される", async () => {
    const { buildReservationChangedFlex } = await import("@/lib/reservation-flex");

    const result = await buildReservationChangedFlex(
      "2026-02-15", "14:00:00",
      "2026-02-17", "16:00:00",
    );

    expect(result.altText).toContain("予約変更");

    const bubble = result.contents;
    const bodyContents = bubble.body.contents;

    // 旧日時と新日時のボックスを探す
    const dateBox = bodyContents.find(
      (c: any) => c.type === "box" && c.contents?.length >= 2,
    );
    expect(dateBox).toBeDefined();

    // 旧日時（取り消し線なし、グレー色）
    const oldText = dateBox.contents[0];
    expect(oldText.text).toContain("2/15");
    expect(oldText.color).toBe("#999999");

    // 新日時（→ 付き）
    const newText = dateBox.contents[1];
    expect(newText.text).toContain("2/17");
    expect(newText.text).toMatch(/^→/);
  });
});

describe("reservation-flex: buildReservationCanceledFlex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("取消線decorationが含まれる", async () => {
    const { buildReservationCanceledFlex } = await import("@/lib/reservation-flex");

    const result = await buildReservationCanceledFlex("2026-02-15", "14:00:00");

    expect(result.altText).toContain("予約キャンセル");

    const bubble = result.contents;
    const bodyContents = bubble.body.contents;

    // decoration: "line-through" を持つテキストを探す
    function findLineThrough(contents: any[]): any {
      for (const c of contents) {
        if (c.decoration === "line-through") return c;
        if (c.contents) {
          const found = findLineThrough(c.contents);
          if (found) return found;
        }
      }
      return null;
    }

    const strikeText = findLineThrough(bodyContents);
    expect(strikeText).toBeDefined();
    expect(strikeText.decoration).toBe("line-through");
    expect(strikeText.text).toContain("2/15");
  });
});

describe("reservation-flex: sendReservationNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ error: null });
  });

  const baseFlex = {
    type: "flex" as const,
    altText: "テスト通知",
    contents: { type: "bubble" },
  };

  it("pushMessage成功 → status='sent'でログ記録", async () => {
    mockPushMessage.mockResolvedValue({ ok: true });

    const { sendReservationNotification } = await import("@/lib/reservation-flex");
    const { supabaseAdmin } = await import("@/lib/supabase");

    await sendReservationNotification({
      patientId: "p-001",
      lineUid: "U001",
      flex: baseFlex,
      messageType: "reservation_created",
    });

    expect(mockPushMessage).toHaveBeenCalledWith("U001", [baseFlex], undefined);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "p-001",
        line_uid: "U001",
        status: "sent",
        message_type: "reservation_created",
      }),
    );
  });

  it("pushMessage失敗（ok:false） → status='failed'でログ記録", async () => {
    mockPushMessage.mockResolvedValue({ ok: false });

    const { sendReservationNotification } = await import("@/lib/reservation-flex");

    await sendReservationNotification({
      patientId: "p-002",
      lineUid: "U002",
      flex: baseFlex,
      messageType: "reservation_changed",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "p-002",
        status: "failed",
        message_type: "reservation_changed",
      }),
    );
  });

  it("pushMessage例外 → failedログ記録（error_message付き）", async () => {
    mockPushMessage.mockRejectedValue(new Error("Network timeout"));

    const { sendReservationNotification } = await import("@/lib/reservation-flex");

    await sendReservationNotification({
      patientId: "p-003",
      lineUid: "U003",
      flex: baseFlex,
      messageType: "reservation_canceled",
    });

    // catch節内のinsertが呼ばれるはず
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "p-003",
        status: "failed",
        message_type: "reservation_canceled",
        error_message: "Error: Network timeout",
      }),
    );
  });
});
