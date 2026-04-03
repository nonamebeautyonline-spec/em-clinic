// app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { badRequest, conflict, serverError, unauthorized } from "@/lib/api-error";
import { verifyPatientSession } from "@/lib/patient-session";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import {
  executeReservationActions,
} from "@/lib/reservation-flex";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import { pushMessage } from "@/lib/line-push";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";
import { evaluateTagAutoRules } from "@/lib/tag-auto-rules";
import { validateBody } from "@/lib/validations/helpers";
import {
  createReservationSchema,
  cancelReservationSchema,
  updateReservationSchema,
} from "@/lib/validations/reservation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ★ 翌月予約開放日の設定（毎月X日に翌月の予約を開放）— フォールバック用
const BOOKING_OPEN_DAY_DEFAULT = 5;

// ★ reservation_settings のキャッシュ（テナント別）
type ReservationSettings = {
  change_deadline_hours: number;
  cancel_deadline_hours: number;
  booking_start_days_before: number;
  booking_deadline_hours_before: number;
  booking_open_day: number;
};

const DEFAULT_SETTINGS: ReservationSettings = {
  change_deadline_hours: 0,
  cancel_deadline_hours: 0,
  booking_start_days_before: 60,
  booking_deadline_hours_before: 0,
  booking_open_day: BOOKING_OPEN_DAY_DEFAULT,
};

let settingsCache: Map<string, { settings: ReservationSettings; cachedAt: number }> = new Map();
const SETTINGS_CACHE_TTL_MS = 60000; // 1分

async function getReservationSettings(tenantId: string | null): Promise<ReservationSettings> {
  const cacheKey = tenantId || "__default__";
  const cached = settingsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SETTINGS_CACHE_TTL_MS) {
    return cached.settings;
  }

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin.from("reservation_settings").select("*"),
      tenantId
    ).maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[getReservationSettings] error:", error);
      return DEFAULT_SETTINGS;
    }

    const settings: ReservationSettings = data
      ? {
          change_deadline_hours: data.change_deadline_hours ?? 0,
          cancel_deadline_hours: data.cancel_deadline_hours ?? 0,
          booking_start_days_before: data.booking_start_days_before ?? 60,
          booking_deadline_hours_before: data.booking_deadline_hours_before ?? 0,
          booking_open_day: data.booking_open_day ?? BOOKING_OPEN_DAY_DEFAULT,
        }
      : DEFAULT_SETTINGS;

    settingsCache.set(cacheKey, { settings, cachedAt: Date.now() });
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ★ 予約の期限チェック（変更・キャンセル用）
function isWithinDeadline(
  reservedDate: string,
  reservedTime: string,
  deadlineHours: number
): boolean {
  if (deadlineHours <= 0) return true; // 0=無制限

  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);

  // 予約日時をJSTでパース
  const [h, m] = reservedTime.split(":").map(Number);
  const [y, mo, d] = reservedDate.split("-").map(Number);
  const reservedJST = new Date(Date.UTC(y, mo - 1, d, h, m));

  const diffMs = reservedJST.getTime() - jstNow.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= deadlineHours;
}

// ★ 受付締切チェック（予約作成用）
function isWithinBookingDeadline(
  targetDate: string,
  targetTime: string,
  deadlineHours: number
): boolean {
  if (deadlineHours <= 0) return true; // 0=制限なし
  return isWithinDeadline(targetDate, targetTime, deadlineHours);
}

// 早期開放設定のキャッシュ（パフォーマンス向上のため）
let earlyOpenCache: Map<string, { isOpen: boolean; cachedAt: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1分間キャッシュ

// 指定された月が早期開放されているかチェック（DBから取得）
async function isMonthEarlyOpen(targetMonth: string, tenantId: string | null): Promise<boolean> {
  // キャッシュチェック
  const cached = earlyOpenCache.get(targetMonth);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.isOpen;
  }

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("booking_open_settings")
        .select("is_open")
        .eq("target_month", targetMonth),
      tenantId
    ).single();

    if (error && error.code !== "PGRST116") {
      console.error("[isMonthEarlyOpen] DB error:", error);
      return false;
    }

    const isOpen = data?.is_open ?? false;
    earlyOpenCache.set(targetMonth, { isOpen, cachedAt: Date.now() });
    return isOpen;
  } catch (e) {
    console.error("[isMonthEarlyOpen] Error:", e);
    return false;
  }
}

// 指定された日付が予約可能かどうかをチェック（非同期版）
async function isDateBookable(targetDate: string, tenantId: string | null = null, settings?: ReservationSettings): Promise<boolean> {
  const s = settings ?? await getReservationSettings(tenantId);

  // JSTで現在日時を取得
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);

  const currentYear = jstNow.getUTCFullYear();
  const currentMonth = jstNow.getUTCMonth(); // 0-indexed
  const currentDay = jstNow.getUTCDate();

  // ターゲット日付をパース
  const [targetYear, targetMonthStr] = targetDate.split("-").map(Number);
  const targetMonth = targetMonthStr - 1; // 0-indexed

  // 今月の予約は常にOK
  if (targetYear === currentYear && targetMonth === currentMonth) {
    return true;
  }

  // 過去の月は予約不可（通常はありえないが念のため）
  if (targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth)) {
    return false;
  }

  // ★ 受付開始日チェック（booking_start_days_before）
  const targetDateObj = new Date(Date.UTC(targetYear, targetMonth, Number(targetDate.split("-")[2])));
  const diffDays = Math.floor((targetDateObj.getTime() - jstNow.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > s.booking_start_days_before) {
    return false;
  }

  // ターゲット月をYYYY-MM形式で取得
  const targetMonthStr2 = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;

  // 翌月の場合
  const bookingOpenDay = s.booking_open_day;
  const isNextMonth =
    (targetYear === currentYear && targetMonth === currentMonth + 1) ||
    (targetYear === currentYear + 1 && currentMonth === 11 && targetMonth === 0);

  if (isNextMonth) {
    // 管理者が手動開放していればOK（自動開放は無効）
    return await isMonthEarlyOpen(targetMonthStr2, tenantId);
  }

  // 翌々月以降: 管理者が早期開放していればOK
  return await isMonthEarlyOpen(targetMonthStr2, tenantId);
}

// ★ Supabase書き込みリトライ機能
async function retrySupabaseWrite<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`[Supabase Retry] Success on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[Supabase Retry] Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        const delay = delayMs * attempt; // 指数バックオフ
        console.log(`[Supabase Retry] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

type WeeklyRule = {
  doctor_id: string;
  weekday: number; // 0..6
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  capacity: number; // 1..2
};

type Override = {
  doctor_id: string;
  date: string; // YYYY-MM-DD
  type: "closed" | "open" | "modify";
  start_time?: string;
  end_time?: string;
  slot_minutes?: number | "";
  capacity?: number | "";
  memo?: string;
};

type BookedSlot = { date: string; time: string; count: number };

// ----- 既存ヘルパー（そのまま） -----
function parseMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  return h * 60 + m;
}
function toHHMM(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function addYmd(ymdStr: string, days: number) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function dayOfWeek(ymdStr: string) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay(); // 0..6
}

// ★ アクティブな医師IDリストを取得
async function getActiveDoctorIds(tenantId: string | null): Promise<string[]> {
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("doctors")
      .select("doctor_id")
      .eq("is_active", true)
      .order("sort_order"),
    tenantId
  );
  return (data || []).map((d: { doctor_id: string }) => d.doctor_id);
}

// ★ 全アクティブ医師の予約枠を統合して返す（同じdate+timeのcountを合算）
async function getAllDoctorsAvailability(
  start: string,
  end: string,
  tenantId: string | null
): Promise<{ date: string; time: string; count: number }[]> {
  const doctorIds = await getActiveDoctorIds(tenantId);
  if (doctorIds.length === 0) return [];

  // 各医師のスケジュール・予約済み枠を並列取得
  const perDoctor = await Promise.all(
    doctorIds.map(async (docId) => {
      const [booked, schedule] = await Promise.all([
        getBookedSlotsFromDB(start, end, tenantId, docId),
        getScheduleFromDB(docId, start, end, tenantId),
      ]);
      return buildAvailabilityRange(
        start, end, schedule.weekly_rules, schedule.overrides, booked, docId
      );
    })
  );

  // 同じdate+timeのcountを合算
  const merged = new Map<string, number>();
  for (const slots of perDoctor) {
    for (const s of slots) {
      const key = `${s.date}|${s.time}`;
      merged.set(key, (merged.get(key) || 0) + s.count);
    }
  }

  const result: { date: string; time: string; count: number }[] = [];
  merged.forEach((count, key) => {
    const [date, time] = key.split("|");
    result.push({ date, time, count });
  });
  return result;
}

// ★ 空き枠がある医師を自動選択（sort_order順に優先、全員満席ならnull）
async function autoAssignDoctor(
  date: string,
  time: string,
  tenantId: string | null
): Promise<string | null> {
  const doctorIds = await getActiveDoctorIds(tenantId);
  if (doctorIds.length === 0) return null;

  for (const docId of doctorIds) {
    const [booked, schedule] = await Promise.all([
      getBookedSlotsFromDB(date, date, tenantId, docId),
      getScheduleFromDB(docId, date, date, tenantId),
    ]);
    const slots = buildAvailabilityRange(
      date, date, schedule.weekly_rules, schedule.overrides, booked, docId
    );
    const slot = slots.find((s) => s.time === time);
    if (slot && slot.count > 0) return docId;
  }
  return null;
}

// ★ DBから予約済み枠を取得（日時ごとの予約数を集計、医師別フィルタ対応）
async function getBookedSlotsFromDB(
  start: string,
  end: string,
  tenantId: string | null = null,
  doctorId?: string
): Promise<BookedSlot[]> {
  let query = supabaseAdmin
    .from("reservations")
    .select("reserved_date, reserved_time")
    .gte("reserved_date", start)
    .lte("reserved_date", end)
    .neq("status", "canceled");

  if (doctorId) {
    query = query.eq("doctor_id", doctorId);
  }

  const { data, error } = await strictWithTenant(query, tenantId);

  if (error) {
    console.error("[getBookedSlotsFromDB] error:", error);
    return [];
  }

  // 日時ごとにカウント
  const countMap = new Map<string, number>();
  (data || []).forEach((r: { reserved_date: string; reserved_time: string }) => {
    const key = `${r.reserved_date}|${r.reserved_time}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  // BookedSlot形式に変換
  const slots: BookedSlot[] = [];
  countMap.forEach((count, key) => {
    const [date, time] = key.split("|");
    // time形式を HH:MM に正規化（DBは HH:MM:SS で返す場合がある）
    const normalizedTime = time ? time.slice(0, 5) : time;
    slots.push({ date, time: normalizedTime, count });
  });

  return slots;
}

// ★ DBからスケジュール（週間ルール・日別例外）を取得
async function getScheduleFromDB(
  doctorId: string,
  start: string,
  end: string,
  tenantId: string | null = null
): Promise<{ weekly_rules: WeeklyRule[]; overrides: Override[] }> {
  // 週間ルール取得
  const { data: rulesData, error: rulesError } = await strictWithTenant(
    supabaseAdmin
      .from("doctor_weekly_rules")
      .select("*")
      .eq("doctor_id", doctorId),
    tenantId
  );

  if (rulesError) {
    console.error("[getScheduleFromDB] weekly_rules error:", rulesError);
  }

  // 日別例外取得
  const { data: overridesData, error: overridesError } = await strictWithTenant(
    supabaseAdmin
      .from("doctor_date_overrides")
      .select("*")
      .eq("doctor_id", doctorId)
      .gte("date", start)
      .lte("date", end),
    tenantId
  );

  if (overridesError) {
    console.error("[getScheduleFromDB] overrides error:", overridesError);
  }

  const weekly_rules: WeeklyRule[] = (rulesData || []).map((r: Record<string, unknown>) => ({
    doctor_id: String(r.doctor_id),
    weekday: Number(r.weekday),
    enabled: Boolean(r.enabled),
    start_time: String(r.start_time || ""),
    end_time: String(r.end_time || ""),
    slot_minutes: Number(r.slot_minutes) || 15,
    capacity: Number(r.capacity) || 2,
  }));

  const overrides: Override[] = (overridesData || []).map((o: Record<string, unknown>) => ({
    doctor_id: String(o.doctor_id),
    date: String(o.date),
    type: o.type as "closed" | "open" | "modify",
    start_time: o.start_time ? String(o.start_time) : undefined,
    end_time: o.end_time ? String(o.end_time) : undefined,
    slot_minutes: o.slot_minutes != null ? (Number(o.slot_minutes) as number | "") : undefined,
    capacity: o.capacity != null ? (Number(o.capacity) as number | "") : undefined,
    memo: o.memo ? String(o.memo) : undefined,
  }));

  return { weekly_rules, overrides };
}

function buildAvailabilityRange(
  start: string,
  end: string,
  weekly: WeeklyRule[],
  overrides: Override[],
  booked: BookedSlot[],
  doctorId: string
) {
  const weeklyMap = new Map<number, WeeklyRule>();
  weekly
    .filter((r) => r.doctor_id === doctorId)
    .forEach((r) => weeklyMap.set(Number(r.weekday), r));

  const overrideMap = new Map<string, Override[]>();
  overrides
    .filter((o) => o.doctor_id === doctorId)
    .forEach((o) => {
      const key = String(o.date);
      const arr = overrideMap.get(key) || [];
      arr.push(o);
      overrideMap.set(key, arr);
    });

  const bookedMap = new Map<string, number>();
  booked.forEach((b) =>
    bookedMap.set(`${b.date}|${b.time}`, Number(b.count || 0))
  );

  const slots: { date: string; time: string; count: number }[] = [];

  let cur = start;
  while (cur <= end) {
    const date = cur;
    const weekday = dayOfWeek(date);

    const base = weeklyMap.get(weekday);
    const ovList = overrideMap.get(date) || [];

    // 休診（いずれかのoverrideがclosedなら休診）
    if (ovList.some((o) => o.type === "closed")) {
      cur = addYmd(cur, 1);
      continue;
    }

    // base が休みでも、override が open / modify なら開ける
    const overrideOpens = ovList.some(
      (o) => o.type === "open" || o.type === "modify"
    );
    if (!base?.enabled && !overrideOpens) {
      cur = addYmd(cur, 1);
      continue;
    }

    if (ovList.length > 0) {
      // 複数時間帯: 各overrideから個別にスロット生成
      for (const ov of ovList) {
        const slotMinutes =
          (typeof ov.slot_minutes === "number" ? ov.slot_minutes : undefined) ??
          (base?.slot_minutes ?? 15);

        const cap =
          (typeof ov.capacity === "number" ? ov.capacity : undefined) ??
          (base?.capacity ?? 2);

        const ovStart =
          ov.start_time && String(ov.start_time).trim()
            ? String(ov.start_time)
            : "";
        const ovEnd =
          ov.end_time && String(ov.end_time).trim()
            ? String(ov.end_time)
            : "";

        const startTime = ovStart || (base?.start_time || "");
        const endTime = ovEnd || (base?.end_time || "");

        if (!startTime || !endTime) continue;

        const sMin = parseMinutes(startTime);
        const eMin = parseMinutes(endTime);
        if (!(sMin < eMin) || slotMinutes <= 0) continue;

        for (let t = sMin; t + slotMinutes <= eMin; t += slotMinutes) {
          const time = toHHMM(t);
          const key = `${date}|${time}`;
          const bookedCount = bookedMap.get(key) ?? 0;
          const remain = Math.max(0, cap - bookedCount);
          slots.push({ date, time, count: remain });
        }
      }
    } else {
      // overrideなし: 週間ルールから生成
      const slotMinutes = base?.slot_minutes ?? 15;
      const cap = base?.capacity ?? 2;
      const startTime = base?.start_time || "";
      const endTime = base?.end_time || "";

      if (!startTime || !endTime) {
        cur = addYmd(cur, 1);
        continue;
      }

      const sMin = parseMinutes(startTime);
      const eMin = parseMinutes(endTime);

      if (!(sMin < eMin) || slotMinutes <= 0) {
        cur = addYmd(cur, 1);
        continue;
      }

      for (let t = sMin; t + slotMinutes <= eMin; t += slotMinutes) {
        const time = toHHMM(t);
        const key = `${date}|${time}`;
        const bookedCount = bookedMap.get(key) ?? 0;
        const remain = Math.max(0, cap - bookedCount);
        slots.push({ date, time, count: remain });
      }
    }

    cur = addYmd(cur, 1);
  }

  return slots;
}

// =============================
// GET /api/reservations
// =============================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const date = searchParams.get("date");
  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const doctorIdParam = searchParams.get("doctor_id"); // nullなら全医師統合
    const doctorId = doctorIdParam || "dr_default"; // 単一医師指定時のフォールバック
    const settings = await getReservationSettings(tenantId);

    // 予約枠一覧を返すモード（患者側用）
    if (searchParams.get("mode") === "slots") {
      const { data: slotsData } = await strictWithTenant(
        supabaseAdmin
          .from("reservation_slots")
          .select("id, title, description, duration_minutes")
          .eq("is_active", true)
          .order("sort_order"),
        tenantId
      );
      return NextResponse.json({ ok: true, slots: slotsData || [] });
    }

    // コース一覧を返すモード（患者側用）
    if (searchParams.get("mode") === "courses") {
      const { data: coursesData } = await strictWithTenant(
        supabaseAdmin
          .from("reservation_courses")
          .select("id, title, description, duration_minutes")
          .eq("is_active", true)
          .order("sort_order"),
        tenantId
      );
      return NextResponse.json({ ok: true, courses: coursesData || [] });
    }

    // 医師一覧を返すモード
    if (searchParams.get("mode") === "doctors") {
      const { data: doctors } = await strictWithTenant(
        supabaseAdmin
          .from("doctors")
          .select("doctor_id, doctor_name, is_active, sort_order, color")
          .eq("is_active", true)
          .order("sort_order"),
        tenantId
      );
      return NextResponse.json({ ok: true, doctors: doctors || [] });
    }

    // 単日（互換）
    if (date && !start && !end) {
      // ★ doctor_id未指定時は全アクティブ医師の枠を統合、指定時は1医師分
      let out: { date: string; time: string; count: number }[];
      if (!doctorIdParam) {
        out = await getAllDoctorsAvailability(date, date, tenantId);
      } else {
        const [bookedSlots, scheduleData] = await Promise.all([
          getBookedSlotsFromDB(date, date, tenantId, doctorId),
          getScheduleFromDB(doctorId, date, date, tenantId),
        ]);
        out = buildAvailabilityRange(
          date, date, scheduleData.weekly_rules, scheduleData.overrides, bookedSlots, doctorId
        );
      }

      // 翌月予約開放日チェック: 予約不可の日付の場合は空の枠を返す
      const bookable = await isDateBookable(date, tenantId, settings);

      // 受付締切フィルタ（booking_deadline_hours_before）
      let filteredOut = bookable ? out : [];
      if (bookable && settings.booking_deadline_hours_before > 0) {
        filteredOut = filteredOut.filter((s) =>
          isWithinBookingDeadline(date, s.time, settings.booking_deadline_hours_before)
        );
      }

      return NextResponse.json(
        {
          date,
          slots: filteredOut.map((s) => ({ time: s.time, count: s.count })),
          bookingOpen: bookable,
          settings: {
            change_deadline_hours: settings.change_deadline_hours,
            cancel_deadline_hours: settings.cancel_deadline_hours,
            booking_deadline_hours_before: settings.booking_deadline_hours_before,
          },
        },
        { status: 200 }
      );
    }

    // 範囲
    if (!start || !end) {
      return badRequest("start and end are required");
    }

    // ★ doctor_id未指定時は全アクティブ医師の枠を統合、指定時は1医師分
    let allSlots: { date: string; time: string; count: number }[];
    if (!doctorIdParam) {
      allSlots = await getAllDoctorsAvailability(start, end, tenantId);
    } else {
      const [bookedSlots, scheduleData] = await Promise.all([
        getBookedSlotsFromDB(start, end, tenantId, doctorId),
        getScheduleFromDB(doctorId, start, end, tenantId),
      ]);
      allSlots = buildAvailabilityRange(
        start, end, scheduleData.weekly_rules, scheduleData.overrides, bookedSlots, doctorId
      );
    }

    // 翌月予約開放日チェック: 予約不可の日付の枠は count=0 にする
    // 日付ごとに予約可能かどうかをチェック（重複を避けるためキャッシュ）
    const uniqueDates = [...new Set(allSlots.map(s => s.date))];
    const dateBookableMap = new Map<string, boolean>();
    await Promise.all(
      uniqueDates.map(async (date) => {
        const bookable = await isDateBookable(date, tenantId, settings);
        dateBookableMap.set(date, bookable);
      })
    );

    let slots = allSlots.map((slot) => ({
      ...slot,
      count: dateBookableMap.get(slot.date) ? slot.count : 0,
    }));

    // 受付締切フィルタ（booking_deadline_hours_before）
    if (settings.booking_deadline_hours_before > 0) {
      slots = slots.map((slot) => ({
        ...slot,
        count: slot.count > 0 && !isWithinBookingDeadline(slot.date, slot.time, settings.booking_deadline_hours_before)
          ? 0
          : slot.count,
      }));
    }

    return NextResponse.json({
      start,
      end,
      slots,
      settings: {
        change_deadline_hours: settings.change_deadline_hours,
        cancel_deadline_hours: settings.cancel_deadline_hours,
        booking_deadline_hours_before: settings.booking_deadline_hours_before,
      },
    }, { status: 200 });
  } catch (err) {
    console.error("GET /api/reservations error");
    return serverError("server error");
  }
}


// =============================
// POST /api/reservations
// =============================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    // JWT患者セッション必須
    const session = await verifyPatientSession(req);
    if (!session) return unauthorized();
    const patientId = session.patientId;

    const tenantId = resolveTenantIdOrThrow(req);
    const type = body?.type as string | undefined;

    // bodyはログしない
    console.log("POST /api/reservations type:", type);

    // ★ 予約作成
    if (type === "createReservation" || !type) {
      const validated = validateBody(body, createReservationSchema);
      if ("error" in validated) return validated.error;
      const date = validated.data.date || "";
      const time = validated.data.time || "";
      const pid = patientId; // JWT認証済みセッションのpatientIdのみ使用（bodyのpatient_idは無視）
      // doctor_id未指定時は空き枠がある医師を自動選択
      let createDoctorId = validated.data.doctor_id || "";
      if (!createDoctorId) {
        const assigned = await autoAssignDoctor(date, time, tenantId);
        if (!assigned) {
          return NextResponse.json({
            ok: false,
            error: "slot_full",
            message: "この時間帯はすでに予約が埋まりました。別の時間帯をお選びください。",
          }, { status: 409 });
        }
        createDoctorId = assigned;
      }
      const createSlotId = validated.data.slot_id || null;
      const createCourseId = validated.data.course_id || null;

        // ★ 設定を取得
      const createSettings = await getReservationSettings(tenantId);

      // ★★ 翌月予約開放日チェック ★★
      if (date && !(await isDateBookable(date, tenantId, createSettings))) {
        console.log(`[Reservation] booking_not_open: date=${date}`);
        return NextResponse.json({
          ok: false,
          error: "booking_not_open",
          message: `この日付はまだ予約を受け付けていません。毎月${createSettings.booking_open_day}日に翌月の予約が開放されます。`,
        }, { status: 400 });
      }

      // ★★ 受付締切チェック ★★
      if (date && time && !isWithinBookingDeadline(date, time, createSettings.booking_deadline_hours_before)) {
        console.log(`[Reservation] booking_deadline_passed: date=${date}, time=${time}`);
        return NextResponse.json({
          ok: false,
          error: "booking_deadline_passed",
          message: "この時間帯の予約受付は締め切りました。",
        }, { status: 400 });
      }

      // ★★ GASと同じ1人1件制限：既存のアクティブな予約をチェック ★★
      // canceled / NG は再予約可能
      const { data: existingReservations } = await strictWithTenant(
        supabaseAdmin
          .from("reservations")
          .select("reserve_id, reserved_date, reserved_time, status")
          .eq("patient_id", pid)
          .not("status", "in", '("canceled","NG")')
          .limit(1),
        tenantId
      );

      if (existingReservations && existingReservations.length > 0) {
        const existing = existingReservations[0];
        console.log(`[Reservation] already_reserved: patient_id=${pid}, existing=${existing.reserve_id}`);
        return NextResponse.json({
          ok: false,
          error: "already_reserved",
          existing: {
            reserve_id: existing.reserve_id,
            reserved_date: existing.reserved_date,
            reserved_time: existing.reserved_time,
          },
        }, { status: 400 });
      }

      const reserveId = "resv-" + Date.now();

      // ★ intakeテーブルからステータス・問診回答を取得
      // ★★ 予約作成前にintakeレコードの存在 + 問診完了を必須チェック ★★
      const [intakeRes, patientRes] = await Promise.all([
        strictWithTenant(
          supabaseAdmin
            .from("intake")
            .select("patient_id, status, answers")
            .eq("patient_id", pid)
            .order("created_at", { ascending: false })
            .limit(1),
          tenantId
        ),
        // ★ patient_name, line_id は patients テーブルから取得
        strictWithTenant(
          supabaseAdmin
            .from("patients")
            .select("name, line_id")
            .eq("patient_id", pid)
            .maybeSingle(),
          tenantId
        ),
      ]);

      const intakeCheckError = intakeRes.error;
      const intakeData = intakeRes.data?.[0] ?? null;

      if (intakeCheckError) {
        console.error("[Reservation] Intake check error:", intakeCheckError);
        return NextResponse.json({ ok: false, error: "intake_check_failed" }, { status: 500 });
      }

      if (!intakeData) {
        console.error("[Reservation] Intake record not found:", { patient_id: pid });
        return NextResponse.json({ ok: false, error: "intake_not_found", message: "問診データが見つかりません。先に問診を完了してください。", }, { status: 400 });
      }

      // ★ 問診完了チェック（ng_checkは問診の必須項目）
      const intakeAnswers = intakeData.answers as Record<string, unknown> | null;
      if (!intakeAnswers || typeof intakeAnswers.ng_check !== "string" || intakeAnswers.ng_check === "") {
        console.error("[Reservation] Questionnaire not completed:", { patient_id: pid });
        return NextResponse.json({ ok: false, error: "questionnaire_not_completed", message: "問診が完了していません。先に問診を完了してください。", }, { status: 400 });
      }

      const patientName = patientRes.data?.name || null;

      // ★ 前回NGの患者が再予約を取った場合、NGステータスをクリア
      if (intakeData.status === "NG") {
        console.log(`[Reservation] Resetting NG status for patient_id=${pid}`);
        const { error: resetError } = await strictWithTenant(
          supabaseAdmin
            .from("intake")
            .update({ status: null })
            .eq("patient_id", pid),
          tenantId
        );

        if (resetError) {
          console.error("[Reservation] Failed to reset NG status:", resetError);
        } else {
          console.log(`[Reservation] ✅ NG status cleared for patient_id=${pid}`);
        }
      }

      // ★ RPC で定員チェック + INSERT をアトミックに実行
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        "create_reservation_atomic",
        {
          p_reserve_id: reserveId,
          p_patient_id: pid,
          p_patient_name: patientName,
          p_reserved_date: date,
          p_reserved_time: time,
          p_doctor_id: createDoctorId,
          p_tenant_id: tenantId,
        }
      );

      if (rpcError) {
        console.error("[Supabase] RPC create_reservation_atomic failed:", rpcError);
        return NextResponse.json({ ok: false, error: "db_error", detail: rpcError.message }, { status: 500 });
      }

      // RPC が slot_full を返した場合
      if (rpcResult && !rpcResult.ok) {
        console.log(`[Reservation] slot_full: date=${date}, time=${time}, booked=${rpcResult.booked}, capacity=${rpcResult.capacity}`);
        return NextResponse.json({ ok: false, error: "slot_full", message: "この時間帯はすでに予約が埋まりました。別の時間帯をお選びください。", }, { status: 409 });
      }

      console.log(`✓ Reservation created: reserve_id=${reserveId}, booked=${rpcResult?.booked}/${rpcResult?.capacity}`);

      // ★ slot_id, course_id, field_id を保存（RPCでINSERTされたレコードにUPDATE）
      {
        const updateFields: Record<string, unknown> = {};
        if (createSlotId) updateFields.slot_id = createSlotId;
        if (createCourseId) updateFields.course_id = createCourseId;

        // マルチ分野モード: リクエストの field_id を保存
        const reqFieldId = body?.field_id;
        if (reqFieldId) updateFields.field_id = reqFieldId;

        if (Object.keys(updateFields).length > 0) {
          await strictWithTenant(
            supabaseAdmin
              .from("reservations")
              .update(updateFields)
              .eq("reserve_id", reserveId),
            tenantId
          );
        }
      }

      // intake テーブルに reserve_id を紐付け（最新1件のみ。全件更新すると重複の原因）
      if (pid) {
        try {
          const updateResult = await retrySupabaseWrite(async () => {
            // patient_idで最新1件を取得してid指定で更新
            const { data: latestIntake, error: intakeSelectError } = await strictWithTenant(
              supabaseAdmin
                .from("intake")
                .select("id")
                .eq("patient_id", pid)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
              tenantId
            );
            if (intakeSelectError) {
              throw intakeSelectError; // リトライ対象にする
            }
            if (!latestIntake) {
              console.warn(`[Reservation] intake not found for patient_id=${pid}, skipping reserve_id link`);
              return { data: null, error: null };
            }
            const result = await strictWithTenant(
              supabaseAdmin
                .from("intake")
                .update({
                  reserve_id: reserveId,
                  call_status: null,
                  call_status_updated_at: null,
                })
                .eq("id", latestIntake.id),
              tenantId
            ).select();

            if (result.error) {
              throw result.error;
            }

            if (!result.data || result.data.length === 0) {
              console.error("❌ [CRITICAL] Patient intake record NOT FOUND:", { patient_id: pid, reserve_id: reserveId });
            } else {
              console.log(`✓ Intake updated: patient_id=${pid}, reserve_id=${reserveId}`);
            }

            return result;
          });
        } catch (intakeError) {
          console.error("[Supabase] Intake update failed:", intakeError);
        }
      }

      // キャッシュ削除
      if (pid) {
        await invalidateDashboardCache(pid);
        console.log(`[reservations] Cache invalidated for patient_id=${pid}`);
      }

      // 予約アクション実行（LINE通知 + タグ/マーク/メニュー操作）
      // awaitで待つ（fire-and-forgetだとVercelがレスポンス後に実行を打ち切りfetch failedになる）
      const lineId = patientRes.data?.line_id;
      if (lineId && date && time) {
        try {
          await executeReservationActions({
            eventType: "reservation_created",
            patientId: pid,
            lineUid: lineId,
            date,
            time,
            tenantId: tenantId ?? undefined,
          });
        } catch (err) {
          console.error("[reservations] action error:", err);
        }
      }

      // リッチメニュー自動切替
      if (pid) {
        try {
          await evaluateMenuRules(pid, tenantId ?? undefined);
        } catch {}
      }

      // タグ自動付与（fire-and-forget）
      if (pid) {
        evaluateTagAutoRules(pid, "reservation_made", tenantId ?? undefined).catch(() => {});
        // イベントバス発火（スコアリング・外部Webhook等）
        if (tenantId) {
          import("@/lib/event-bus").then(({ fireEvent }) =>
            fireEvent("reservation_made", { tenantId, patientId: pid }).catch(() => {}),
          );
        }
      }

      return NextResponse.json({
        ok: true,
        reserveId: reserveId,
      }, { status: 200 });
    }

    // ★ 予約キャンセル
    if (type === "cancelReservation") {
      const cancelValidated = validateBody(body, cancelReservationSchema);
      if ("error" in cancelValidated) return cancelValidated.error;
      const reserveId = cancelValidated.data.reserveId || cancelValidated.data.reservationId || cancelValidated.data.id || "";
      const pid = cancelValidated.data.patient_id || patientId;

      if (!reserveId) {
        return badRequest("reserveId required");
      }

      // ★ キャンセル期限チェック
      const cancelSettings = await getReservationSettings(tenantId);
      if (cancelSettings.cancel_deadline_hours > 0) {
        const { data: checkResv } = await strictWithTenant(
          supabaseAdmin
            .from("reservations")
            .select("reserved_date, reserved_time")
            .eq("reserve_id", reserveId),
          tenantId
        ).maybeSingle();

        if (checkResv && !isWithinDeadline(checkResv.reserved_date, checkResv.reserved_time, cancelSettings.cancel_deadline_hours)) {
          console.log(`[Reservation] cancel_deadline_passed: reserve_id=${reserveId}`);
          return NextResponse.json({
            ok: false,
            error: "cancel_deadline_passed",
            message: `予約キャンセルの受付期限（${cancelSettings.cancel_deadline_hours}時間前）を過ぎています。`,
          }, { status: 400 });
        }
      }

      // LINE通知用に予約情報と line_id を事前取得
      const [cancelResvInfo, cancelPatientInfo] = await Promise.all([
        strictWithTenant(
          supabaseAdmin
            .from("reservations")
            .select("reserved_date, reserved_time, patient_name")
            .eq("reserve_id", reserveId),
          tenantId
        ).maybeSingle(),
        // ★ line_id は patients テーブルから取得
        pid
          ? strictWithTenant(
              supabaseAdmin
                .from("patients")
                .select("line_id")
                .eq("patient_id", pid),
              tenantId
            ).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      // ★ DB書き込み
      const [supabaseReservationResult, supabaseIntakeResult] = await Promise.allSettled([
        // 1. reservationsテーブルのstatusを"canceled"に更新（リトライあり）
        retrySupabaseWrite(async () => {
          const result = await strictWithTenant(
            supabaseAdmin
              .from("reservations")
              .update({ status: "canceled" })
              .eq("reserve_id", reserveId),
            tenantId
          );

          if (result.error) {
            throw result.error;
          }
          return result;
        }),

        // 2. intakeテーブルの reserve_id をクリア（日時は reservations が正）
        pid ? retrySupabaseWrite(async () => {
          const result = await strictWithTenant(
            supabaseAdmin
              .from("intake")
              .update({
                reserve_id: null,
              })
              .eq("patient_id", pid)
              .eq("reserve_id", reserveId),
            tenantId
          );

          if (result.error) {
            throw result.error;
          }
          return result;
        }) : Promise.resolve({ error: null }),
      ]);

      // DB結果チェック - キャンセル失敗はエラー
      if (supabaseReservationResult.status === "rejected" ||
          (supabaseReservationResult.status === "fulfilled" && supabaseReservationResult.value.error)) {
        const error = supabaseReservationResult.status === "rejected"
          ? supabaseReservationResult.reason
          : supabaseReservationResult.value.error;
        console.error("[Supabase] Reservation cancel failed:", error);
        return NextResponse.json({ ok: false, error: "db_error", detail: String(error) }, { status: 500 });
      }

      if (supabaseIntakeResult.status === "rejected" ||
          (supabaseIntakeResult.status === "fulfilled" && supabaseIntakeResult.value.error)) {
        const error = supabaseIntakeResult.status === "rejected"
          ? supabaseIntakeResult.reason
          : supabaseIntakeResult.value.error;
        console.error("[Supabase] Intake clear failed:", error);
      }

      // キャッシュ削除
      if (pid) {
        await invalidateDashboardCache(pid);
        console.log(`[reservations] Cache invalidated for patient_id=${pid}`);
      }

      // 予約アクション実行（LINE通知 + タグ/マーク/メニュー操作）
      const cancelLineId = cancelPatientInfo?.data?.line_id;
      const cancelDate = cancelResvInfo?.data?.reserved_date;
      const cancelTime = cancelResvInfo?.data?.reserved_time;
      if (cancelLineId && cancelDate && cancelTime) {
        try {
          await executeReservationActions({
            eventType: "reservation_canceled",
            patientId: pid,
            lineUid: cancelLineId,
            date: cancelDate,
            time: cancelTime,
            tenantId: tenantId ?? undefined,
          });
        } catch (err) {
          console.error("[reservations] cancel action error:", err);
        }
      }

      // キャンセル待ち通知（非同期 — レスポンスをブロックしない）
      if (cancelDate) {
        notifyWaitlist(cancelDate, cancelTime, tenantId).catch((err) => {
          console.error("[reservations] キャンセル待ち通知エラー:", err);
        });
      }

      return NextResponse.json({
        ok: true,
        reserveId,
      }, { status: 200 });
    }

    // ★ 予約変更（日時のみ更新）
    if (type === "updateReservation") {
      const updateValidated = validateBody(body, updateReservationSchema);
      if ("error" in updateValidated) return updateValidated.error;
      const reserveId = updateValidated.data.reserveId || updateValidated.data.reservationId || "";
      const newDate = updateValidated.data.date || "";
      const newTime = updateValidated.data.time || "";
      const pid = updateValidated.data.patient_id || patientId;
      const updateDoctorId = updateValidated.data.doctor_id || "dr_default";

      if (!reserveId || !newDate || !newTime) {
        return badRequest("missing parameters");
      }

      // ★ 変更期限チェック
      const updateSettings = await getReservationSettings(tenantId);
      if (updateSettings.change_deadline_hours > 0) {
        const { data: checkResv } = await strictWithTenant(
          supabaseAdmin
            .from("reservations")
            .select("reserved_date, reserved_time")
            .eq("reserve_id", reserveId),
          tenantId
        ).maybeSingle();

        if (checkResv && !isWithinDeadline(checkResv.reserved_date, checkResv.reserved_time, updateSettings.change_deadline_hours)) {
          console.log(`[Reservation] change_deadline_passed: reserve_id=${reserveId}`);
          return NextResponse.json({
            ok: false,
            error: "change_deadline_passed",
            message: `予約変更の受付期限（${updateSettings.change_deadline_hours}時間前）を過ぎています。`,
          }, { status: 400 });
        }
      }

      // ★★ 翌月予約開放日チェック ★★
      if (!(await isDateBookable(newDate, tenantId, updateSettings))) {
        console.log(`[Reservation] booking_not_open for update: date=${newDate}`);
        return NextResponse.json({
          ok: false,
          error: "booking_not_open",
          message: `この日付はまだ予約を受け付けていません。毎月${updateSettings.booking_open_day}日に翌月の予約が開放されます。`,
        }, { status: 400 });
      }

      // ★★ 受付締切チェック（変更先の日時） ★★
      if (!isWithinBookingDeadline(newDate, newTime, updateSettings.booking_deadline_hours_before)) {
        return NextResponse.json({
          ok: false,
          error: "booking_deadline_passed",
          message: "この時間帯の予約受付は締め切りました。",
        }, { status: 400 });
      }

      // LINE通知用に変更前の日時を取得（RPCで上書きされる前に）
      const { data: prevResvInfo } = await strictWithTenant(
        supabaseAdmin
          .from("reservations")
          .select("reserved_date, reserved_time")
          .eq("reserve_id", reserveId),
        tenantId
      ).maybeSingle();

      // ★ RPC で変更先スロットの定員チェック + UPDATE をアトミックに実行
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        "update_reservation_atomic",
        {
          p_reserve_id: reserveId,
          p_new_date: newDate,
          p_new_time: newTime,
          p_doctor_id: updateDoctorId,
          p_tenant_id: tenantId,
        }
      );

      if (rpcError) {
        console.error("[Supabase] RPC update_reservation_atomic failed:", rpcError);
        return NextResponse.json({ ok: false, error: "db_error", detail: rpcError.message }, { status: 500 });
      }

      // RPC がエラーを返した場合（not_found: キャンセル済み/存在しない、slot_full: 定員超過）
      if (rpcResult && !rpcResult.ok) {
        if (rpcResult.error === "not_found") {
          console.log(`[Reservation] not_found on update: reserve_id=${reserveId} (キャンセル済みまたは存在しない)`);
          return NextResponse.json({ ok: false, error: "not_found", message: "この予約は既にキャンセルされているか、存在しません。" }, { status: 404 });
        }
        console.log(`[Reservation] slot_full on update: date=${newDate}, time=${newTime}, booked=${rpcResult.booked}, capacity=${rpcResult.capacity}`);
        return NextResponse.json({ ok: false, error: "slot_full", message: "この時間帯はすでに予約が埋まりました。別の時間帯をお選びください。", }, { status: 409 });
      }

      console.log(`✓ Reservation updated: reserve_id=${reserveId}, date=${newDate}, time=${newTime}, booked=${rpcResult?.booked}/${rpcResult?.capacity}`);

      // ★ LINE通知用に line_id を patients テーブルから取得
      const { data: changePatientInfo } = pid
        ? await strictWithTenant(
            supabaseAdmin
              .from("patients")
              .select("line_id")
              .eq("patient_id", pid),
            tenantId
          ).maybeSingle()
        : { data: null };

      // キャッシュ削除
      if (pid) {
        await invalidateDashboardCache(pid);
        console.log(`[reservations] Cache invalidated for patient_id=${pid}`);
      }

      // 予約アクション実行（LINE通知 + タグ/マーク/メニュー操作）
      const changeLineId = changePatientInfo?.line_id;
      if (changeLineId && newDate && newTime) {
        try {
          await executeReservationActions({
            eventType: "reservation_changed",
            patientId: pid,
            lineUid: changeLineId,
            date: newDate,
            time: newTime,
            oldDate: prevResvInfo?.reserved_date,
            oldTime: prevResvInfo?.reserved_time,
            tenantId: tenantId ?? undefined,
          });
        } catch (err) {
          console.error("[reservations] change action error:", err);
        }
      }

      return NextResponse.json({
        ok: true,
        reserveId,
      }, { status: 200 });
    }

    // 未知のtype
    return badRequest(`unknown type: ${type}`);
  } catch {
    console.error("POST /api/reservations error");
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * キャンセル待ち通知
 * 予約がキャンセルされた日時に一致するキャンセル待ちエントリに通知を送信
 */
async function notifyWaitlist(
  canceledDate: string,
  canceledTime: string | null | undefined,
  tenantId: string | null,
) {
  // キャンセル待ちエントリを取得（waiting状態、作成日順、最大3件）
  let query = supabaseAdmin
    .from("reservation_waitlist")
    .select("*")
    .eq("target_date", canceledDate)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(3);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data: waitlistEntries, error } = await query;

  if (error) {
    console.error("[notifyWaitlist] クエリエラー:", error);
    return;
  }

  if (!waitlistEntries || waitlistEntries.length === 0) return;

  const dateStr = canceledDate;
  const timeStr = canceledTime ? ` ${canceledTime}` : "";

  for (const entry of waitlistEntries) {
    if (!entry.line_uid) continue;

    const message = `ご希望の日時（${dateStr}${timeStr}）に空きが出ました。お早めにご予約ください。`;

    try {
      const res = await pushMessage(
        entry.line_uid,
        [{ type: "text", text: message }],
        tenantId ?? undefined,
      );

      const status = res?.ok ? "sent" : "failed";

      // ステータスを notified に更新
      await supabaseAdmin
        .from("reservation_waitlist")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .eq("id", entry.id);

      // message_log に記録
      await supabaseAdmin.from("message_log").insert({
        patient_id: entry.patient_id,
        line_uid: entry.line_uid,
        message_type: "individual",
        content: message,
        status,
        direction: "outgoing",
        tenant_id: entry.tenant_id,
      });
    } catch (err) {
      console.error(`[notifyWaitlist] LINE送信エラー: waitlist_id=${entry.id}`, err);
    }
  }
}

