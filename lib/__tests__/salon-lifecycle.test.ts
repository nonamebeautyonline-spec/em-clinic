// lib/__tests__/salon-lifecycle.test.ts
// サロン顧客ライフサイクル — 純粋関数のみテスト（DB依存関数はスキップ）
import { describe, it, expect, vi } from "vitest";

// supabaseAdmin のインポートをモック（トップレベルで参照されるため）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {},
}));

import {
  buildDormantReminderMessage,
  buildBirthdayMessage,
  DORMANT_THRESHOLDS,
} from "../salon-lifecycle";

// ── DORMANT_THRESHOLDS の値確認 ──

describe("DORMANT_THRESHOLDS", () => {
  it("warning は 30日", () => {
    expect(DORMANT_THRESHOLDS.warning).toBe(30);
  });

  it("alert は 60日", () => {
    expect(DORMANT_THRESHOLDS.alert).toBe(60);
  });

  it("critical は 90日", () => {
    expect(DORMANT_THRESHOLDS.critical).toBe(90);
  });
});

// ── buildDormantReminderMessage ──

describe("buildDormantReminderMessage", () => {
  // === warning（30日） ===
  describe("warning", () => {
    it("text型メッセージを返す", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect(msg.type).toBe("text");
    });

    it("顧客名が含まれる", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("田中様");
    });

    it("経過日数が含まれる", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("35日");
    });

    it("トラッキングタグ salon_dormant_warning が含まれる", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("[salon_dormant_warning]");
    });

    it("来店促進の文言を含む", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("お手入れの時期");
    });
  });

  // === alert（60日） ===
  describe("alert", () => {
    it("特別オファーの文言を含む", () => {
      const msg = buildDormantReminderMessage(65, "鈴木", "alert");
      expect((msg as any).text).toContain("トリートメントをサービス");
    });

    it("トラッキングタグ salon_dormant_alert が含まれる", () => {
      const msg = buildDormantReminderMessage(65, "鈴木", "alert");
      expect((msg as any).text).toContain("[salon_dormant_alert]");
    });

    it("顧客名が含まれる", () => {
      const msg = buildDormantReminderMessage(65, "鈴木", "alert");
      expect((msg as any).text).toContain("鈴木様");
    });
  });

  // === critical（90日） ===
  describe("critical", () => {
    it("最終リマインドの文言を含む", () => {
      const msg = buildDormantReminderMessage(95, "佐藤", "critical");
      expect((msg as any).text).toContain("その後いかがお過ごしでしょうか");
    });

    it("トラッキングタグ salon_dormant_critical が含まれる", () => {
      const msg = buildDormantReminderMessage(95, "佐藤", "critical");
      expect((msg as any).text).toContain("[salon_dormant_critical]");
    });

    it("顧客名が2箇所に含まれる（冒頭とお待ちしております）", () => {
      const msg = buildDormantReminderMessage(95, "佐藤", "critical");
      const text = (msg as any).text as string;
      const count = (text.match(/佐藤様/g) || []).length;
      expect(count).toBe(2);
    });
  });

  // === 顧客名が空の場合 ===
  it("顧客名が空文字の場合「お客様」がデフォルトで使われる", () => {
    const msg = buildDormantReminderMessage(35, "", "warning");
    expect((msg as any).text).toContain("お客様様");
  });
});

// ── buildBirthdayMessage ──

describe("buildBirthdayMessage", () => {
  it("text型メッセージを返す", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect(msg.type).toBe("text");
  });

  it("顧客名が含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("田中様");
  });

  it("クーポンコードが含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("BD2026MAR");
  });

  it("割引テキストが含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("20%OFF");
  });

  it("有効期限が含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("2026/03/31");
  });

  it("トラッキングタグ salon_birthday_coupon が含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("[salon_birthday_coupon]");
  });

  it("お誕生日おめでとうの文言を含む", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("お誕生日おめでとうございます");
  });

  it("顧客名が空文字の場合「お客様」がデフォルトで使われる", () => {
    const msg = buildBirthdayMessage("", "CODE", "10%OFF", "2026/12/31");
    expect((msg as any).text).toContain("お客様様");
  });
});
