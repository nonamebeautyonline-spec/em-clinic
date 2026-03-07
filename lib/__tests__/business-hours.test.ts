// lib/__tests__/business-hours.test.ts — 営業時間判定ロジックのテスト

import { describe, it, expect, vi } from "vitest";

// supabaseAdmin モック（business-hours.ts がインポートするため）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: () => ({ data: null, error: null }) }),
            is: () => ({ maybeSingle: () => ({ data: null, error: null }) }),
          }),
        }),
      }),
    }),
  },
}));

const {
  checkBusinessHours,
  timeToMinutes,
  DEFAULT_BUSINESS_HOURS,
} = await import("@/lib/business-hours");

// 型はDEFAULT_BUSINESS_HOURSから推論
type BusinessHoursConfig = typeof DEFAULT_BUSINESS_HOURS;

describe("timeToMinutes", () => {
  it("00:00 → 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("09:00 → 540", () => {
    expect(timeToMinutes("09:00")).toBe(540);
  });

  it("18:00 → 1080", () => {
    expect(timeToMinutes("18:00")).toBe(1080);
  });

  it("23:59 → 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("12:30 → 750", () => {
    expect(timeToMinutes("12:30")).toBe(750);
  });
});

describe("checkBusinessHours", () => {
  // テスト用の設定: 月〜金 09:00-18:00、土日定休
  const config: BusinessHoursConfig = {
    enabled: true,
    schedule: {
      mon: { start: "09:00", end: "18:00", closed: false },
      tue: { start: "09:00", end: "18:00", closed: false },
      wed: { start: "09:00", end: "18:00", closed: false },
      thu: { start: "09:00", end: "18:00", closed: false },
      fri: { start: "09:00", end: "18:00", closed: false },
      sat: { start: "09:00", end: "18:00", closed: true },
      sun: { start: "09:00", end: "18:00", closed: true },
    },
    timezone: "Asia/Tokyo",
    outside_message: "営業時間外です",
  };

  // 日本時間で特定の日時を作成するヘルパー
  // Asia/Tokyo は UTC+9
  function createJSTDate(year: number, month: number, day: number, hour: number, minute: number): Date {
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
    return utcDate;
  }

  // --- 機能無効時 ---

  it("enabled=false → 常にtrue（営業時間内扱い）", () => {
    const disabledConfig: BusinessHoursConfig = { ...config, enabled: false };
    // 日曜23:59でも営業時間内として扱う
    const sundayNight = createJSTDate(2026, 3, 8, 23, 59); // 2026-03-08は日曜
    expect(checkBusinessHours(disabledConfig, sundayNight)).toBe(true);
  });

  // --- 営業時間内 ---

  it("月曜 09:00 → 営業時間内", () => {
    const mondayMorning = createJSTDate(2026, 3, 9, 9, 0); // 2026-03-09は月曜
    expect(checkBusinessHours(config, mondayMorning)).toBe(true);
  });

  it("月曜 12:00 → 営業時間内", () => {
    const mondayNoon = createJSTDate(2026, 3, 9, 12, 0);
    expect(checkBusinessHours(config, mondayNoon)).toBe(true);
  });

  it("金曜 17:59 → 営業時間内", () => {
    const fridayEvening = createJSTDate(2026, 3, 13, 17, 59); // 2026-03-13は金曜
    expect(checkBusinessHours(config, fridayEvening)).toBe(true);
  });

  // --- 営業時間外 ---

  it("月曜 08:59 → 営業時間外（開始前）", () => {
    const beforeOpen = createJSTDate(2026, 3, 9, 8, 59);
    expect(checkBusinessHours(config, beforeOpen)).toBe(false);
  });

  it("月曜 18:00 → 営業時間外（終了時刻ちょうど）", () => {
    const atClose = createJSTDate(2026, 3, 9, 18, 0);
    expect(checkBusinessHours(config, atClose)).toBe(false);
  });

  it("月曜 18:01 → 営業時間外（終了後）", () => {
    const afterClose = createJSTDate(2026, 3, 9, 18, 1);
    expect(checkBusinessHours(config, afterClose)).toBe(false);
  });

  it("月曜 23:00 → 営業時間外（深夜）", () => {
    const lateNight = createJSTDate(2026, 3, 9, 23, 0);
    expect(checkBusinessHours(config, lateNight)).toBe(false);
  });

  // --- 定休日 ---

  it("土曜 12:00 → 営業時間外（定休日）", () => {
    const saturdayNoon = createJSTDate(2026, 3, 7, 12, 0); // 2026-03-07は土曜
    expect(checkBusinessHours(config, saturdayNoon)).toBe(false);
  });

  it("日曜 10:00 → 営業時間外（定休日）", () => {
    const sundayMorning = createJSTDate(2026, 3, 8, 10, 0); // 2026-03-08は日曜
    expect(checkBusinessHours(config, sundayMorning)).toBe(false);
  });

  // --- 曜日別の異なるスケジュール ---

  it("曜日ごとに異なる時間帯でも正しく判定される", () => {
    const customConfig: BusinessHoursConfig = {
      ...config,
      schedule: {
        ...config.schedule,
        wed: { start: "10:00", end: "20:00", closed: false },
      },
    };

    // 水曜 09:30 → 営業時間外（水曜は10:00から）
    const wedEarly = createJSTDate(2026, 3, 11, 9, 30); // 2026-03-11は水曜
    expect(checkBusinessHours(customConfig, wedEarly)).toBe(false);

    // 水曜 19:30 → 営業時間内（水曜は20:00まで）
    const wedLate = createJSTDate(2026, 3, 11, 19, 30);
    expect(checkBusinessHours(customConfig, wedLate)).toBe(true);
  });

  // --- 全日定休日の場合 ---

  it("全曜日が定休日の場合は常に営業時間外", () => {
    const allClosed: BusinessHoursConfig = {
      ...config,
      schedule: {
        mon: { start: "09:00", end: "18:00", closed: true },
        tue: { start: "09:00", end: "18:00", closed: true },
        wed: { start: "09:00", end: "18:00", closed: true },
        thu: { start: "09:00", end: "18:00", closed: true },
        fri: { start: "09:00", end: "18:00", closed: true },
        sat: { start: "09:00", end: "18:00", closed: true },
        sun: { start: "09:00", end: "18:00", closed: true },
      },
    };
    const mondayNoon = createJSTDate(2026, 3, 9, 12, 0);
    expect(checkBusinessHours(allClosed, mondayNoon)).toBe(false);
  });

  // --- 境界値テスト ---

  it("開始時刻ちょうどは営業時間内", () => {
    const exactStart = createJSTDate(2026, 3, 10, 9, 0); // 火曜09:00
    expect(checkBusinessHours(config, exactStart)).toBe(true);
  });

  it("終了時刻ちょうどは営業時間外", () => {
    const exactEnd = createJSTDate(2026, 3, 10, 18, 0); // 火曜18:00
    expect(checkBusinessHours(config, exactEnd)).toBe(false);
  });

  it("終了1分前は営業時間内", () => {
    const oneMinBefore = createJSTDate(2026, 3, 10, 17, 59); // 火曜17:59
    expect(checkBusinessHours(config, oneMinBefore)).toBe(true);
  });
});

describe("DEFAULT_BUSINESS_HOURS", () => {
  it("デフォルトは enabled=false", () => {
    expect(DEFAULT_BUSINESS_HOURS.enabled).toBe(false);
  });

  it("デフォルトのタイムゾーンは Asia/Tokyo", () => {
    expect(DEFAULT_BUSINESS_HOURS.timezone).toBe("Asia/Tokyo");
  });

  it("デフォルトの営業時間外メッセージが設定されている", () => {
    expect(DEFAULT_BUSINESS_HOURS.outside_message).toBeTruthy();
    expect(DEFAULT_BUSINESS_HOURS.outside_message.length).toBeGreaterThan(0);
  });

  it("月〜金は営業日、土日は定休日", () => {
    expect(DEFAULT_BUSINESS_HOURS.schedule.mon.closed).toBe(false);
    expect(DEFAULT_BUSINESS_HOURS.schedule.tue.closed).toBe(false);
    expect(DEFAULT_BUSINESS_HOURS.schedule.wed.closed).toBe(false);
    expect(DEFAULT_BUSINESS_HOURS.schedule.thu.closed).toBe(false);
    expect(DEFAULT_BUSINESS_HOURS.schedule.fri.closed).toBe(false);
    expect(DEFAULT_BUSINESS_HOURS.schedule.sat.closed).toBe(true);
    expect(DEFAULT_BUSINESS_HOURS.schedule.sun.closed).toBe(true);
  });

  it("全曜日のスケジュールが定義されている", () => {
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
    for (const day of days) {
      const schedule = DEFAULT_BUSINESS_HOURS.schedule[day];
      expect(schedule).toBeDefined();
      expect(schedule.start).toMatch(/^\d{2}:\d{2}$/);
      expect(schedule.end).toMatch(/^\d{2}:\d{2}$/);
      expect(typeof schedule.closed).toBe("boolean");
    }
  });
});
