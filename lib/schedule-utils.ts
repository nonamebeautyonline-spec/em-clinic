// lib/schedule-utils.ts
// フロント用の空き枠算出ロジック
// サーバー側 buildAvailabilityRange (app/api/reservations/route.ts) のクライアント版

export interface TimeSlot {
  time: string; // "HH:MM"
  capacity: number; // 枠数
  booked: number; // 予約済み数
  available: number; // 残り枠数
}

export interface WeeklyRule {
  doctor_id: string;
  weekday: number;
  enabled: boolean;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  slot_minutes: number;
  capacity: number;
}

export interface DateOverride {
  doctor_id: string;
  date: string;
  type: string; // "open" | "closed" | "modify"
  start_time: string;
  end_time: string;
  slot_minutes: number | null;
  capacity: number | null;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function toHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dayOfWeek(ymdStr: string): number {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay(); // 0=日, 1=月, ..., 6=土
}

/**
 * 指定日・指定医師の空き枠を算出
 * @returns TimeSlot[] — 各時間スロットの枠数・予約数・残り枠
 *          null の場合は休診日（スロットなし）
 */
export function buildDaySlots(
  date: string,
  doctorId: string,
  weeklyRules: WeeklyRule[],
  overrides: DateOverride[],
  reservations: { reserved_time: string }[]
): TimeSlot[] | null {
  const weekday = dayOfWeek(date);
  const base = weeklyRules.find(
    (r) => r.doctor_id === doctorId && Number(r.weekday) === weekday
  );
  const ovList = overrides.filter(
    (o) => o.doctor_id === doctorId && String(o.date) === date
  );

  // 休診判定
  if (ovList.some((o) => o.type === "closed")) {
    return null;
  }

  const overrideOpens = ovList.some(
    (o) => o.type === "open" || o.type === "modify"
  );
  if (!base?.enabled && !overrideOpens) {
    return null;
  }

  // 予約数マップ（time → count）
  const bookedMap = new Map<string, number>();
  for (const r of reservations) {
    const time = r.reserved_time?.slice(0, 5) || "";
    if (time) {
      bookedMap.set(time, (bookedMap.get(time) || 0) + 1);
    }
  }

  const slots: TimeSlot[] = [];

  if (ovList.length > 0) {
    // override がある場合: 各 override から個別にスロット生成
    for (const ov of ovList) {
      const slotMinutes =
        (typeof ov.slot_minutes === "number" ? ov.slot_minutes : null) ??
        (base?.slot_minutes ?? 15);
      const cap =
        (typeof ov.capacity === "number" ? ov.capacity : null) ??
        (base?.capacity ?? 2);
      const startTime =
        ov.start_time?.trim() || base?.start_time || "";
      const endTime =
        ov.end_time?.trim() || base?.end_time || "";

      if (!startTime || !endTime) continue;

      const sMin = parseMinutes(startTime);
      const eMin = parseMinutes(endTime);
      if (!(sMin < eMin) || slotMinutes <= 0) continue;

      for (let t = sMin; t + slotMinutes <= eMin; t += slotMinutes) {
        const time = toHHMM(t);
        const booked = bookedMap.get(time) ?? 0;
        slots.push({
          time,
          capacity: cap,
          booked,
          available: Math.max(0, cap - booked),
        });
      }
    }
  } else {
    // 週間ルールから生成
    const slotMinutes = base?.slot_minutes ?? 15;
    const cap = base?.capacity ?? 2;
    const startTime = base?.start_time || "";
    const endTime = base?.end_time || "";

    if (!startTime || !endTime) return null;

    const sMin = parseMinutes(startTime);
    const eMin = parseMinutes(endTime);
    if (!(sMin < eMin) || slotMinutes <= 0) return null;

    for (let t = sMin; t + slotMinutes <= eMin; t += slotMinutes) {
      const time = toHHMM(t);
      const booked = bookedMap.get(time) ?? 0;
      slots.push({
        time,
        capacity: cap,
        booked,
        available: Math.max(0, cap - booked),
      });
    }
  }

  return slots;
}

/**
 * weekly_rules から当日の診療時間範囲を算出（全医師の最小start〜最大end）
 * DayViewの時間軸範囲の決定に使用
 */
export function getTimeRange(
  date: string,
  weeklyRules: WeeklyRule[],
  overrides: DateOverride[],
  fallbackStart = 9,
  fallbackEnd = 20
): { startHour: number; endHour: number } {
  const weekday = dayOfWeek(date);

  let minStart = Infinity;
  let maxEnd = -Infinity;

  // 週間ルールから
  for (const r of weeklyRules) {
    if (Number(r.weekday) !== weekday || !r.enabled) continue;
    if (r.start_time) {
      minStart = Math.min(minStart, parseMinutes(r.start_time));
    }
    if (r.end_time) {
      maxEnd = Math.max(maxEnd, parseMinutes(r.end_time));
    }
  }

  // overrideから（open/modifyのみ）
  for (const o of overrides) {
    if (String(o.date) !== date) continue;
    if (o.type === "closed") continue;
    if (o.start_time?.trim()) {
      minStart = Math.min(minStart, parseMinutes(o.start_time));
    }
    if (o.end_time?.trim()) {
      maxEnd = Math.max(maxEnd, parseMinutes(o.end_time));
    }
  }

  if (minStart === Infinity || maxEnd === -Infinity) {
    return { startHour: fallbackStart, endHour: fallbackEnd };
  }

  return {
    startHour: Math.floor(minStart / 60),
    endHour: Math.ceil(maxEnd / 60),
  };
}
