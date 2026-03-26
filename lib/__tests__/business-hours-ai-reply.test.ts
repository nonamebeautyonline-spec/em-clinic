// lib/__tests__/business-hours-ai-reply.test.ts
// 営業時間フィルターのテスト

import { describe, it, expect, vi } from "vitest";

// Supabase副作用をモック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {},
  supabase: {},
}));

import { checkBusinessHours, timeToMinutes, type BusinessHoursConfig } from "@/lib/business-hours";

describe("checkBusinessHours", () => {
  const config: BusinessHoursConfig = {
    enabled: true,
    schedule: {
      mon: { start: "09:00", end: "18:00", closed: false },
      tue: { start: "09:00", end: "18:00", closed: false },
      wed: { start: "09:00", end: "18:00", closed: false },
      thu: { start: "09:00", end: "18:00", closed: false },
      fri: { start: "09:00", end: "18:00", closed: false },
      sat: { start: "10:00", end: "14:00", closed: false },
      sun: { start: "09:00", end: "18:00", closed: true },
    },
    timezone: "Asia/Tokyo",
    outside_message: "営業時間外です",
  };

  it("営業時間内ならtrue", () => {
    // 2026-03-23 (月) 12:00 JST
    const now = new Date("2026-03-23T03:00:00Z"); // UTC 03:00 = JST 12:00
    expect(checkBusinessHours(config, now)).toBe(true);
  });

  it("営業時間外ならfalse", () => {
    // 2026-03-23 (月) 19:00 JST
    const now = new Date("2026-03-23T10:00:00Z"); // UTC 10:00 = JST 19:00
    expect(checkBusinessHours(config, now)).toBe(false);
  });

  it("定休日ならfalse", () => {
    // 2026-03-22 (日) 12:00 JST
    const now = new Date("2026-03-22T03:00:00Z"); // UTC 03:00 = JST 12:00
    expect(checkBusinessHours(config, now)).toBe(false);
  });

  it("enabled=falseなら常にtrue", () => {
    const disabledConfig = { ...config, enabled: false };
    const now = new Date("2026-03-22T03:00:00Z"); // 日曜
    expect(checkBusinessHours(disabledConfig, now)).toBe(true);
  });

  it("営業開始時刻ぴったりはtrue", () => {
    // 月曜 09:00 JST
    const now = new Date("2026-03-23T00:00:00Z"); // UTC 00:00 = JST 09:00
    expect(checkBusinessHours(config, now)).toBe(true);
  });

  it("営業終了時刻ぴったりはfalse（endは含まない）", () => {
    // 月曜 18:00 JST
    const now = new Date("2026-03-23T09:00:00Z"); // UTC 09:00 = JST 18:00
    expect(checkBusinessHours(config, now)).toBe(false);
  });
});

describe("timeToMinutes", () => {
  it("09:00 → 540", () => expect(timeToMinutes("09:00")).toBe(540));
  it("18:30 → 1110", () => expect(timeToMinutes("18:30")).toBe(1110));
  it("00:00 → 0", () => expect(timeToMinutes("00:00")).toBe(0));
  it("23:59 → 1439", () => expect(timeToMinutes("23:59")).toBe(1439));
});
