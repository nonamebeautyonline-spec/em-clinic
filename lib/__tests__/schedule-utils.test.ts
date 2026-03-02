import { describe, it, expect } from "vitest";
import {
  buildDaySlots,
  getTimeRange,
  type WeeklyRule,
  type DateOverride,
} from "@/lib/schedule-utils";

// 2026-03-03（火曜日 = weekday 2）
const DATE = "2026-03-03";

const baseRule: WeeklyRule = {
  doctor_id: "doc1",
  weekday: 2, // 火曜日
  enabled: true,
  start_time: "10:00",
  end_time: "18:00",
  slot_minutes: 15,
  capacity: 2,
};

describe("buildDaySlots", () => {
  it("週間ルールからスロットを正しく生成する", () => {
    const slots = buildDaySlots(DATE, "doc1", [baseRule], [], []);
    expect(slots).not.toBeNull();
    // 10:00〜18:00 を15分刻み = 32スロット
    expect(slots!.length).toBe(32);
    expect(slots![0]).toEqual({
      time: "10:00",
      capacity: 2,
      booked: 0,
      available: 2,
    });
    expect(slots![slots!.length - 1]).toEqual({
      time: "17:45",
      capacity: 2,
      booked: 0,
      available: 2,
    });
  });

  it("予約済みスロットのbookedとavailableが正しい", () => {
    const reservations = [
      { reserved_time: "10:00" },
      { reserved_time: "10:00" },
      { reserved_time: "10:15" },
    ];
    const slots = buildDaySlots(DATE, "doc1", [baseRule], [], reservations);
    expect(slots).not.toBeNull();

    const slot1000 = slots!.find((s) => s.time === "10:00");
    expect(slot1000).toEqual({
      time: "10:00",
      capacity: 2,
      booked: 2,
      available: 0,
    });

    const slot1015 = slots!.find((s) => s.time === "10:15");
    expect(slot1015).toEqual({
      time: "10:15",
      capacity: 2,
      booked: 1,
      available: 1,
    });
  });

  it("休診日（enabled=false）はnullを返す", () => {
    const disabledRule: WeeklyRule = { ...baseRule, enabled: false };
    const slots = buildDaySlots(DATE, "doc1", [disabledRule], [], []);
    expect(slots).toBeNull();
  });

  it("overrideでclosedの場合はnullを返す", () => {
    const override: DateOverride = {
      doctor_id: "doc1",
      date: DATE,
      type: "closed",
      start_time: "",
      end_time: "",
      slot_minutes: null,
      capacity: null,
    };
    const slots = buildDaySlots(DATE, "doc1", [baseRule], [override], []);
    expect(slots).toBeNull();
  });

  it("overrideでopen（基本休みの曜日を開ける）", () => {
    // 月曜日（weekday=1）は基本休みだが、overrideでopen
    const mondayDate = "2026-03-02"; // 月曜日
    const disabledRule: WeeklyRule = {
      ...baseRule,
      weekday: 1,
      enabled: false,
    };
    const override: DateOverride = {
      doctor_id: "doc1",
      date: mondayDate,
      type: "open",
      start_time: "09:00",
      end_time: "12:00",
      slot_minutes: 30,
      capacity: 1,
    };
    const slots = buildDaySlots(
      mondayDate,
      "doc1",
      [disabledRule],
      [override],
      []
    );
    expect(slots).not.toBeNull();
    // 09:00〜12:00 を30分刻み = 6スロット
    expect(slots!.length).toBe(6);
    expect(slots![0]).toEqual({
      time: "09:00",
      capacity: 1,
      booked: 0,
      available: 1,
    });
  });

  it("overrideでmodify（時間変更）", () => {
    const override: DateOverride = {
      doctor_id: "doc1",
      date: DATE,
      type: "modify",
      start_time: "13:00",
      end_time: "15:00",
      slot_minutes: 30,
      capacity: 3,
    };
    const slots = buildDaySlots(DATE, "doc1", [baseRule], [override], []);
    expect(slots).not.toBeNull();
    // 13:00〜15:00 を30分刻み = 4スロット
    expect(slots!.length).toBe(4);
    expect(slots![0].capacity).toBe(3);
  });

  it("対象外の医師の場合はnullを返す", () => {
    const slots = buildDaySlots(DATE, "doc999", [baseRule], [], []);
    expect(slots).toBeNull();
  });

  it("reserved_timeが HH:MM:SS 形式でも正しくパースする", () => {
    const reservations = [{ reserved_time: "10:00:00" }];
    const slots = buildDaySlots(DATE, "doc1", [baseRule], [], reservations);
    expect(slots).not.toBeNull();
    const slot1000 = slots!.find((s) => s.time === "10:00");
    expect(slot1000!.booked).toBe(1);
    expect(slot1000!.available).toBe(1);
  });
});

describe("getTimeRange", () => {
  it("週間ルールから時間範囲を算出する", () => {
    const rules: WeeklyRule[] = [
      { ...baseRule, start_time: "09:00", end_time: "18:00" },
      {
        ...baseRule,
        doctor_id: "doc2",
        start_time: "10:00",
        end_time: "20:00",
      },
    ];
    const range = getTimeRange(DATE, rules, []);
    expect(range).toEqual({ startHour: 9, endHour: 20 });
  });

  it("ルールがない場合はフォールバック値を返す", () => {
    const range = getTimeRange(DATE, [], []);
    expect(range).toEqual({ startHour: 9, endHour: 20 });
  });

  it("overrideの時間も考慮する", () => {
    const override: DateOverride = {
      doctor_id: "doc1",
      date: DATE,
      type: "open",
      start_time: "08:00",
      end_time: "21:30",
      slot_minutes: null,
      capacity: null,
    };
    const range = getTimeRange(DATE, [baseRule], [override]);
    expect(range.startHour).toBe(8);
    expect(range.endHour).toBe(22); // ceil(21:30) = 22
  });
});
