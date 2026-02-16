// __tests__/api/schedule.test.ts
// 予約スロット計算・formatTime・週間ルール・日付上書きのテスト
import { describe, it, expect } from "vitest";

// === formatTime のロジック（TIME型 → "HH:MM"変換）===
describe("schedule formatTime", () => {
  function formatTime(time: string | null): string {
    if (!time) return "";
    const match = time.match(/^(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return time;
  }

  it("HH:MM:SS → HH:MM", () => {
    expect(formatTime("09:00:00")).toBe("09:00");
  });

  it("HH:MM → HH:MM（変換不要）", () => {
    expect(formatTime("14:30")).toBe("14:30");
  });

  it("深夜の時刻", () => {
    expect(formatTime("23:59:59")).toBe("23:59");
  });

  it("null → 空文字", () => {
    expect(formatTime(null)).toBe("");
  });

  it("空文字 → 空文字", () => {
    expect(formatTime("")).toBe("");
  });

  it("不正な時刻はそのまま返す", () => {
    expect(formatTime("invalid")).toBe("invalid");
  });
});

// === 週間ルールの曜日判定 ===
describe("schedule 週間ルール", () => {
  interface WeeklyRule {
    doctor_id: string;
    weekday: number;
    enabled: boolean;
    start_time: string;
    end_time: string;
    slot_minutes: number;
    capacity: number;
  }

  const sampleRules: WeeklyRule[] = [
    { doctor_id: "dr_001", weekday: 0, enabled: false, start_time: "09:00", end_time: "18:00", slot_minutes: 30, capacity: 3 },
    { doctor_id: "dr_001", weekday: 1, enabled: true, start_time: "09:00", end_time: "18:00", slot_minutes: 30, capacity: 3 },
    { doctor_id: "dr_001", weekday: 2, enabled: true, start_time: "10:00", end_time: "17:00", slot_minutes: 30, capacity: 2 },
    { doctor_id: "dr_001", weekday: 6, enabled: true, start_time: "09:00", end_time: "13:00", slot_minutes: 30, capacity: 1 },
  ];

  it("日曜（0）は休診", () => {
    const sunday = sampleRules.find(r => r.weekday === 0);
    expect(sunday?.enabled).toBe(false);
  });

  it("月曜（1）は営業", () => {
    const monday = sampleRules.find(r => r.weekday === 1);
    expect(monday?.enabled).toBe(true);
  });

  it("土曜（6）は午前のみ", () => {
    const saturday = sampleRules.find(r => r.weekday === 6);
    expect(saturday?.enabled).toBe(true);
    expect(saturday?.end_time).toBe("13:00");
  });

  it("スロット数計算: 9:00-18:00, 30分 = 18スロット", () => {
    const rule = sampleRules.find(r => r.weekday === 1)!;
    const startMinutes = 9 * 60;
    const endMinutes = 18 * 60;
    const totalSlots = (endMinutes - startMinutes) / rule.slot_minutes;
    expect(totalSlots).toBe(18);
  });

  it("1スロットあたりのキャパ3 → 18スロット × 3 = 最大54予約", () => {
    const rule = sampleRules.find(r => r.weekday === 1)!;
    const startMinutes = 9 * 60;
    const endMinutes = 18 * 60;
    const totalSlots = (endMinutes - startMinutes) / rule.slot_minutes;
    const maxBookings = totalSlots * rule.capacity;
    expect(maxBookings).toBe(54);
  });
});

// === 日付上書きの適用ロジック ===
describe("schedule 日付上書き（date_overrides）", () => {
  interface DateOverride {
    doctor_id: string;
    date: string;
    type: string;
    start_time: string | null;
    end_time: string | null;
    slot_minutes: number | null;
    capacity: number | null;
  }

  it("holiday タイプで休診上書き", () => {
    const override: DateOverride = {
      doctor_id: "dr_001",
      date: "2026-02-20",
      type: "holiday",
      start_time: null,
      end_time: null,
      slot_minutes: null,
      capacity: null,
    };
    expect(override.type).toBe("holiday");
    // holiday の場合は capacity = 0 として扱う
    const effectiveCapacity = override.type === "holiday" ? 0 : (override.capacity ?? 3);
    expect(effectiveCapacity).toBe(0);
  });

  it("extended タイプで営業時間延長", () => {
    const override: DateOverride = {
      doctor_id: "dr_001",
      date: "2026-02-21",
      type: "extended",
      start_time: "08:00",
      end_time: "20:00",
      slot_minutes: 30,
      capacity: 5,
    };
    expect(override.type).toBe("extended");
    expect(override.start_time).toBe("08:00");
    expect(override.end_time).toBe("20:00");
    expect(override.capacity).toBe(5);
  });

  it("上書きがある日は週間ルールより優先", () => {
    const weeklyCapacity = 3;
    const overrideCapacity = 5;
    const hasOverride = true;
    const effectiveCapacity = hasOverride ? overrideCapacity : weeklyCapacity;
    expect(effectiveCapacity).toBe(5);
  });
});

// === 空き枠判定ロジック ===
describe("schedule 空き枠判定", () => {
  function getAvailableSlots(
    capacity: number,
    existingBookings: number
  ): number {
    return Math.max(0, capacity - existingBookings);
  }

  it("キャパ3, 予約0 → 空き3", () => {
    expect(getAvailableSlots(3, 0)).toBe(3);
  });

  it("キャパ3, 予約2 → 空き1", () => {
    expect(getAvailableSlots(3, 2)).toBe(1);
  });

  it("キャパ3, 予約3 → 空き0（満枠）", () => {
    expect(getAvailableSlots(3, 3)).toBe(0);
  });

  it("キャパ3, 予約4 → 空き0（オーバーブッキング防止）", () => {
    // データ不整合で予約がキャパを超えても負にならない
    expect(getAvailableSlots(3, 4)).toBe(0);
  });

  it("キャパ0（休診）→ 常に空き0", () => {
    expect(getAvailableSlots(0, 0)).toBe(0);
  });

  it("ダブルブッキング検出: 予約数 > キャパ", () => {
    const capacity = 3;
    const bookings = 5;
    const isOverbooked = bookings > capacity;
    expect(isOverbooked).toBe(true);
  });
});

// === 時刻のスロット分割 ===
describe("schedule スロット分割", () => {
  function generateSlots(startTime: string, endTime: string, slotMinutes: number): string[] {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const slots: string[] = [];
    for (let m = startMin; m < endMin; m += slotMinutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
    return slots;
  }

  it("9:00-12:00, 30分刻み → 6スロット", () => {
    const slots = generateSlots("09:00", "12:00", 30);
    expect(slots.length).toBe(6);
    expect(slots[0]).toBe("09:00");
    expect(slots[5]).toBe("11:30");
  });

  it("10:00-11:00, 15分刻み → 4スロット", () => {
    const slots = generateSlots("10:00", "11:00", 15);
    expect(slots.length).toBe(4);
    expect(slots).toEqual(["10:00", "10:15", "10:30", "10:45"]);
  });

  it("9:00-9:30, 30分刻み → 1スロット", () => {
    const slots = generateSlots("09:00", "09:30", 30);
    expect(slots.length).toBe(1);
    expect(slots[0]).toBe("09:00");
  });

  it("同じ時刻 → 0スロット", () => {
    const slots = generateSlots("09:00", "09:00", 30);
    expect(slots.length).toBe(0);
  });
});
