// __tests__/api/schedule-dashboard.test.ts
// 予約枠管理ダッシュボードのリデザイン関連テスト
import { describe, it, expect } from "vitest";

// === 翌月計算ロジック ===
describe("翌月計算", () => {
  function getNextMonth(now: Date) {
    const nextMonth = now.getMonth() + 2;
    if (nextMonth > 12) {
      return `${now.getFullYear() + 1}-01`;
    }
    return `${now.getFullYear()}-${String(nextMonth).padStart(2, "0")}`;
  }

  function getNextMonthDisplay(now: Date) {
    const nextMonth = now.getMonth() + 2;
    if (nextMonth > 12) {
      return `${now.getFullYear() + 1}年1月`;
    }
    return `${now.getFullYear()}年${nextMonth}月`;
  }

  it("3月 → 翌月は04", () => {
    expect(getNextMonth(new Date(2026, 2, 22))).toBe("2026-04");
  });

  it("12月 → 翌月は翌年01", () => {
    expect(getNextMonth(new Date(2026, 11, 15))).toBe("2027-01");
  });

  it("1月 → 翌月は02", () => {
    expect(getNextMonth(new Date(2026, 0, 1))).toBe("2026-02");
  });

  it("表示形式: 3月 → 2026年4月", () => {
    expect(getNextMonthDisplay(new Date(2026, 2, 22))).toBe("2026年4月");
  });

  it("表示形式: 12月 → 2027年1月", () => {
    expect(getNextMonthDisplay(new Date(2026, 11, 15))).toBe("2027年1月");
  });
});

// === カレンダー日数計算（OverviewCalendar用） ===
describe("カレンダー月間日数", () => {
  function getMonthDays(year: number, month: number): Date[] {
    const days: Date[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, -i));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month - 1, d));
    }
    while (days.length < 42) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return days;
  }

  it("常に42日分（6週間）を返す", () => {
    expect(getMonthDays(2026, 3).length).toBe(42);
    expect(getMonthDays(2026, 2).length).toBe(42);
    expect(getMonthDays(2026, 4).length).toBe(42);
  });

  it("2026年3月は1日が日曜→パディング不要", () => {
    const days = getMonthDays(2026, 3);
    expect(days[0].getDate()).toBe(1);
    expect(days[0].getMonth()).toBe(2); // 3月=2
  });

  it("当月の日付が全て含まれる", () => {
    const days = getMonthDays(2026, 4);
    const aprilDays = days.filter(d => d.getMonth() === 3); // 4月=3
    expect(aprilDays.length).toBe(30);
  });
});

// === 医師別スケジュール判定ロジック ===
describe("医師別スケジュール判定", () => {
  type Doctor = {
    doctor_id: string;
    doctor_name: string;
    is_active: boolean;
    color?: string;
  };

  type WeeklyRule = {
    doctor_id: string;
    weekday: number;
    enabled: boolean;
    start_time: string;
    end_time: string;
  };

  type Override = {
    doctor_id: string;
    date: string;
    type: "closed" | "open" | "modify";
    start_time?: string;
    end_time?: string;
  };

  const doctors: Doctor[] = [
    { doctor_id: "dr_001", doctor_name: "田中", is_active: true, color: "#3b82f6" },
    { doctor_id: "dr_002", doctor_name: "鈴木", is_active: true, color: "#10b981" },
  ];

  const weeklyRules: WeeklyRule[] = [
    { doctor_id: "dr_001", weekday: 1, enabled: true, start_time: "10:00", end_time: "19:00" },
    { doctor_id: "dr_002", weekday: 1, enabled: true, start_time: "13:00", end_time: "18:00" },
    { doctor_id: "dr_001", weekday: 0, enabled: false, start_time: "", end_time: "" },
  ];

  // 各日の担当医師を計算するロジック
  function getDayDoctors(dateStr: string, overrides: Override[]) {
    const d = new Date(dateStr);
    const weekday = d.getDay();
    const dayOverrides = overrides.filter(o => o.date === dateStr);
    const activeDoctors: { doctor: Doctor; status: string }[] = [];

    for (const doc of doctors) {
      const docOverrides = dayOverrides.filter(o => o.doctor_id === doc.doctor_id);
      const rule = weeklyRules.find(r => r.doctor_id === doc.doctor_id && r.weekday === weekday);
      const isWeeklyOpen = rule?.enabled ?? false;

      if (docOverrides.length > 0) {
        const hasClosed = docOverrides.some(o => o.type === "closed");
        if (!hasClosed) {
          activeDoctors.push({ doctor: doc, status: "modified" });
        }
      } else if (isWeeklyOpen) {
        activeDoctors.push({ doctor: doc, status: "open" });
      }
    }
    return activeDoctors;
  }

  it("月曜は両医師が表示される", () => {
    // 2026-03-23 は月曜
    const result = getDayDoctors("2026-03-23", []);
    expect(result.length).toBe(2);
    expect(result[0].doctor.doctor_name).toBe("田中");
    expect(result[1].doctor.doctor_name).toBe("鈴木");
  });

  it("日曜は両医師とも非表示", () => {
    // 2026-03-22 は日曜
    const result = getDayDoctors("2026-03-22", []);
    expect(result.length).toBe(0);
  });

  it("休診overrideがあると非表示", () => {
    const overrides: Override[] = [
      { doctor_id: "dr_001", date: "2026-03-23", type: "closed" },
    ];
    const result = getDayDoctors("2026-03-23", overrides);
    expect(result.length).toBe(1);
    expect(result[0].doctor.doctor_name).toBe("鈴木");
  });

  it("open overrideがあるとmodified表示", () => {
    const overrides: Override[] = [
      { doctor_id: "dr_001", date: "2026-03-22", type: "open", start_time: "10:00", end_time: "14:00" },
    ];
    const result = getDayDoctors("2026-03-22", overrides);
    expect(result.length).toBe(1);
    expect(result[0].status).toBe("modified");
  });

  it("色情報が正しく保持される", () => {
    const result = getDayDoctors("2026-03-23", []);
    expect(result[0].doctor.color).toBe("#3b82f6");
    expect(result[1].doctor.color).toBe("#10b981");
  });
});

// === コピー&適用の範囲選択ロジック ===
describe("コピー&適用 範囲選択", () => {
  function getDatesBetween(start: string, end: string, allDates: string[]): string[] {
    const s = start < end ? start : end;
    const e = start < end ? end : start;
    return allDates.filter(d => d >= s && d <= e);
  }

  const marchDates = Array.from({ length: 31 }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `2026-03-${day}`;
  });

  it("3/5〜3/10の範囲選択", () => {
    const result = getDatesBetween("2026-03-05", "2026-03-10", marchDates);
    expect(result.length).toBe(6);
    expect(result[0]).toBe("2026-03-05");
    expect(result[5]).toBe("2026-03-10");
  });

  it("逆順（3/10〜3/5）でも同じ結果", () => {
    const result = getDatesBetween("2026-03-10", "2026-03-05", marchDates);
    expect(result.length).toBe(6);
  });

  it("同じ日を指定すると1日", () => {
    const result = getDatesBetween("2026-03-15", "2026-03-15", marchDates);
    expect(result.length).toBe(1);
  });
});

// === NavCards リンク先 ===
describe("NavCards リンク先", () => {
  const CARD_LINKS = [
    "/admin/schedule/doctors",
    "/admin/schedule/monthly",
    "/admin/schedule/reservation-settings",
  ];

  it("3枚のカードがある", () => {
    expect(CARD_LINKS.length).toBe(3);
  });

  it("医師マスタのリンク先", () => {
    expect(CARD_LINKS[0]).toBe("/admin/schedule/doctors");
  });

  it("スケジュールのリンク先", () => {
    expect(CARD_LINKS[1]).toBe("/admin/schedule/monthly");
  });

  it("予約設定のリンク先", () => {
    expect(CARD_LINKS[2]).toBe("/admin/schedule/reservation-settings");
  });
});

// === 予約受付設定デフォルト値 ===
describe("予約受付設定デフォルト値", () => {
  const DEFAULT_SETTINGS = {
    change_deadline_hours: 0,
    cancel_deadline_hours: 0,
    booking_start_days_before: 60,
    booking_deadline_hours_before: 0,
    booking_open_day: 5,
  };

  it("デフォルトは60日前から予約受付", () => {
    expect(DEFAULT_SETTINGS.booking_start_days_before).toBe(60);
  });

  it("デフォルトは毎月5日が翌月開放期限", () => {
    expect(DEFAULT_SETTINGS.booking_open_day).toBe(5);
  });

  it("デフォルトは変更・キャンセル制限なし", () => {
    expect(DEFAULT_SETTINGS.change_deadline_hours).toBe(0);
    expect(DEFAULT_SETTINGS.cancel_deadline_hours).toBe(0);
  });
});
