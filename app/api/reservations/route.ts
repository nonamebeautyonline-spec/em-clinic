// app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as string | undefined;

// ★ GASへのバックグラウンド同期（fire-and-forget）
function syncToGASBackground(payload: any) {
  if (!GAS_RESERVATIONS_URL) return;

  // バックグラウンドで実行（awaitしない）
  fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
    .then(async (res) => {
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        console.error("[GAS Background Sync] Failed:", res.status, text?.slice(0, 200));
      } else {
        console.log("[GAS Background Sync] OK:", payload.type || "createReservation");
      }
    })
    .catch((err) => {
      console.error("[GAS Background Sync] Error:", err.message);
    });
}

// ★ 翌月予約開放日の設定（毎月X日に翌月の予約を開放）
const BOOKING_OPEN_DAY = 5;

// 早期開放設定のキャッシュ（パフォーマンス向上のため）
let earlyOpenCache: Map<string, { isOpen: boolean; cachedAt: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1分間キャッシュ

// 指定された月が早期開放されているかチェック（DBから取得）
async function isMonthEarlyOpen(targetMonth: string): Promise<boolean> {
  // キャッシュチェック
  const cached = earlyOpenCache.get(targetMonth);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.isOpen;
  }

  try {
    const { data, error } = await supabase
      .from("booking_open_settings")
      .select("is_open")
      .eq("target_month", targetMonth)
      .single();

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
async function isDateBookable(targetDate: string): Promise<boolean> {
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

  // ターゲット月をYYYY-MM形式で取得
  const targetMonthStr2 = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;

  // 翌月の場合
  const isNextMonth =
    (targetYear === currentYear && targetMonth === currentMonth + 1) ||
    (targetYear === currentYear + 1 && currentMonth === 11 && targetMonth === 0);

  if (isNextMonth) {
    // 5日以上なら自動開放
    if (currentDay >= BOOKING_OPEN_DAY) {
      return true;
    }
    // 5日未満でも、管理者が早期開放していればOK
    return await isMonthEarlyOpen(targetMonthStr2);
  }

  // 翌々月以降: 管理者が早期開放していればOK
  return await isMonthEarlyOpen(targetMonthStr2);
}

// ★ Supabase書き込みリトライ機能
async function retrySupabaseWrite<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

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

// ★ DBから予約済み枠を取得（日時ごとの予約数を集計）
async function getBookedSlotsFromDB(
  start: string,
  end: string
): Promise<BookedSlot[]> {
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select("reserved_date, reserved_time")
    .gte("reserved_date", start)
    .lte("reserved_date", end)
    .neq("status", "canceled");

  if (error) {
    console.error("[getBookedSlotsFromDB] error:", error);
    return [];
  }

  // 日時ごとにカウント
  const countMap = new Map<string, number>();
  (data || []).forEach((r: any) => {
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
  end: string
): Promise<{ weekly_rules: WeeklyRule[]; overrides: Override[] }> {
  // 週間ルール取得
  const { data: rulesData, error: rulesError } = await supabaseAdmin
    .from("doctor_weekly_rules")
    .select("*")
    .eq("doctor_id", doctorId);

  if (rulesError) {
    console.error("[getScheduleFromDB] weekly_rules error:", rulesError);
  }

  // 日別例外取得
  const { data: overridesData, error: overridesError } = await supabaseAdmin
    .from("doctor_date_overrides")
    .select("*")
    .eq("doctor_id", doctorId)
    .gte("date", start)
    .lte("date", end);

  if (overridesError) {
    console.error("[getScheduleFromDB] overrides error:", overridesError);
  }

  const weekly_rules: WeeklyRule[] = (rulesData || []).map((r: any) => ({
    doctor_id: r.doctor_id,
    weekday: r.weekday,
    enabled: r.enabled,
    start_time: r.start_time || "",
    end_time: r.end_time || "",
    slot_minutes: r.slot_minutes || 15,
    capacity: r.capacity || 2,
  }));

  const overrides: Override[] = (overridesData || []).map((o: any) => ({
    doctor_id: o.doctor_id,
    date: o.date,
    type: o.type,
    start_time: o.start_time || undefined,
    end_time: o.end_time || undefined,
    slot_minutes: o.slot_minutes ?? undefined,
    capacity: o.capacity ?? undefined,
    memo: o.memo || undefined,
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

  const overrideMap = new Map<string, Override>();
  overrides
    .filter((o) => o.doctor_id === doctorId)
    .forEach((o) => overrideMap.set(String(o.date), o));

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
    const ov = overrideMap.get(date);

    // 休診
    if (ov?.type === "closed") {
      cur = addYmd(cur, 1);
      continue;
    }

    // base が休みでも、override が open / modify なら開ける
    const overrideOpens = ov?.type === "open" || ov?.type === "modify";
    if (!base?.enabled && !overrideOpens) {
      cur = addYmd(cur, 1);
      continue;
    }

    const slotMinutes =
      (typeof ov?.slot_minutes === "number" ? ov.slot_minutes : undefined) ??
      (base?.slot_minutes ?? 15);

    const cap =
      (typeof ov?.capacity === "number" ? ov.capacity : undefined) ??
      (base?.capacity ?? 2);

    const startTime =
      (ov?.start_time && String(ov.start_time).trim()
        ? String(ov.start_time)
        : "") || (base?.start_time || "");

    const endTime =
      (ov?.end_time && String(ov.end_time).trim()
        ? String(ov.end_time)
        : "") || (base?.end_time || "");

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

  try {
    const doctorId = "dr_default";

    // 単日（互換）
    if (date && !start && !end) {
      // ★ 予約済み枠とスケジュールを並列でDBから取得
      const [bookedSlots, scheduleData] = await Promise.all([
        getBookedSlotsFromDB(date, date),
        getScheduleFromDB(doctorId, date, date),
      ]);

      const out = buildAvailabilityRange(
        date,
        date,
        scheduleData.weekly_rules,
        scheduleData.overrides,
        bookedSlots,
        doctorId
      );

      // 翌月予約開放日チェック: 予約不可の日付の場合は空の枠を返す
      const bookable = await isDateBookable(date);
      const filteredOut = bookable ? out : [];

      return NextResponse.json(
        {
          date,
          slots: filteredOut.map((s) => ({ time: s.time, count: s.count })),
          bookingOpen: bookable,
        },
        { status: 200 }
      );
    }

    // 範囲
    if (!start || !end) {
      return NextResponse.json({ error: "start and end are required" }, { status: 400 });
    }

    // ★ 予約済み枠とスケジュールを並列でDBから取得
    const [bookedSlots, scheduleData] = await Promise.all([
      getBookedSlotsFromDB(start, end),
      getScheduleFromDB(doctorId, start, end),
    ]);

    const allSlots = buildAvailabilityRange(
      start,
      end,
      scheduleData.weekly_rules,
      scheduleData.overrides,
      bookedSlots,
      doctorId
    );

    // 翌月予約開放日チェック: 予約不可の日付の枠は count=0 にする
    // 日付ごとに予約可能かどうかをチェック（重複を避けるためキャッシュ）
    const uniqueDates = [...new Set(allSlots.map(s => s.date))];
    const dateBookableMap = new Map<string, boolean>();
    await Promise.all(
      uniqueDates.map(async (date) => {
        const bookable = await isDateBookable(date);
        dateBookableMap.set(date, bookable);
      })
    );

    const slots = allSlots.map((slot) => ({
      ...slot,
      count: dateBookableMap.get(slot.date) ? slot.count : 0,
    }));

    return NextResponse.json({ start, end, slots }, { status: 200 });
  } catch (err) {
    console.error("GET /api/reservations error");
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}


// =============================
// POST /api/reservations
// =============================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
        // ★★★ ここに入れる ★★★
    const patientId =
      req.cookies.get("__Host-patient_id")?.value ||
      req.cookies.get("patient_id")?.value ||
      "";

    const intakeId =
      req.cookies.get("__Host-intake_id")?.value ||
      req.cookies.get("intake_id")?.value ||
      "";

    const type = body?.type as string | undefined;

    // bodyはログしない
    console.log("POST /api/reservations type:", type);

    if (!GAS_RESERVATIONS_URL) {
      // body を返さない
      return NextResponse.json({ ok: true, mock: true }, { status: 200 });
    }

    // ★ 予約作成の場合のみSupabaseに並列書き込み
    if (type === "createReservation" || !type) {
      const date = body.date || "";
      const time = body.time || "";
      const pid = body.patient_id || patientId;

      // ★★ 翌月予約開放日チェック ★★
      if (date && !(await isDateBookable(date))) {
        console.log(`[Reservation] booking_not_open: date=${date}`);
        return NextResponse.json({
          ok: false,
          error: "booking_not_open",
          message: `この日付はまだ予約を受け付けていません。毎月${BOOKING_OPEN_DAY}日に翌月の予約が開放されます。`,
        }, { status: 400 });
      }

      // ★★ GASと同じ1人1件制限：既存のアクティブな予約をチェック ★★
      const { data: existingReservations } = await supabase
        .from("reservations")
        .select("reserve_id, reserved_date, reserved_time")
        .eq("patient_id", pid)
        .neq("status", "canceled")
        .limit(1);

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

      const payload = {
        ...body,
        patient_id: pid,
        intakeId: body.intakeId || intakeId,
        intake_id: body.intake_id || intakeId,
        reserveId: reserveId, // ★ Next.jsで生成したreserveIdを渡す
        skipSupabase: true, // GAS側でSupabase書き込みをスキップ
      };

      // ★ intakeテーブルから名前とステータスを取得（最新のレコード）
      // ★★ 予約作成前にintakeレコードの存在を必須チェック ★★
      const { data: intakeData, error: intakeCheckError } = await supabase
        .from("intake")
        .select("patient_name, patient_id, status")
        .eq("patient_id", pid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intakeCheckError) {
        console.error("[Reservation] Intake check error:", intakeCheckError);
        return NextResponse.json({
          ok: false,
          error: "intake_check_failed",
        }, { status: 500 });
      }

      if (!intakeData) {
        console.error("[Reservation] Intake record not found:", { patient_id: pid });
        return NextResponse.json({
          ok: false,
          error: "intake_not_found",
          message: "問診データが見つかりません。先に問診を完了してください。",
        }, { status: 400 });
      }

      const patientName = intakeData.patient_name || null;

      // ★ 前回NGの患者が再予約を取った場合、NGステータスをクリア
      if (intakeData.status === "NG") {
        console.log(`[Reservation] Resetting NG status for patient_id=${pid}`);
        const { error: resetError } = await supabase
          .from("intake")
          .update({ status: null })
          .eq("patient_id", pid);

        if (resetError) {
          console.error("[Reservation] Failed to reset NG status:", resetError);
        } else {
          console.log(`[Reservation] ✅ NG status cleared for patient_id=${pid}`);
        }
      }

      // ★ DB先行書き込み（高速レスポンスのため）
      const [supabaseReservationResult, supabaseIntakeResult] = await Promise.allSettled([
        // 1. reservationsテーブルに予約を作成（リトライあり）
        retrySupabaseWrite(async () => {
          const result = await supabase
            .from("reservations")
            .insert({
              reserve_id: reserveId,
              patient_id: pid,
              patient_name: patientName,
              reserved_date: date || null,
              reserved_time: time || null,
              status: "pending",
              note: null,
              prescription_menu: null,
            });

          if (result.error) {
            throw result.error;
          }
          return result;
        }),

        // 2. intakeテーブルの予約情報を更新（リトライあり）
        pid ? retrySupabaseWrite(async () => {
          const updateResult = await supabase
            .from("intake")
            .update({
              reserve_id: reserveId,
              reserved_date: date || null,
              reserved_time: time || null,
            })
            .eq("patient_id", pid)
            .select();

          if (updateResult.error) {
            throw updateResult.error;
          }

          if (!updateResult.data || updateResult.data.length === 0) {
            console.error("❌ [CRITICAL] Patient intake record NOT FOUND:", { patient_id: pid, reserve_id: reserveId });
          } else {
            console.log(`✓ Intake updated: patient_id=${pid}, reserve_id=${reserveId}`);
          }

          return updateResult;
        }) : Promise.resolve({ error: null }),
      ]);

      // DB結果チェック - 予約作成失敗はエラー
      if (supabaseReservationResult.status === "rejected" ||
          (supabaseReservationResult.status === "fulfilled" && supabaseReservationResult.value.error)) {
        const error = supabaseReservationResult.status === "rejected"
          ? supabaseReservationResult.reason
          : supabaseReservationResult.value.error;
        console.error("[Supabase] Reservation write failed:", error);
        return NextResponse.json({ ok: false, error: "db_error", detail: String(error) }, { status: 500 });
      }

      if (supabaseIntakeResult.status === "rejected" ||
          (supabaseIntakeResult.status === "fulfilled" && supabaseIntakeResult.value.error)) {
        const error = supabaseIntakeResult.status === "rejected"
          ? supabaseIntakeResult.reason
          : supabaseIntakeResult.value.error;
        console.error("[Supabase] Intake update failed:", error);
      }

      // キャッシュ削除
      if (pid) {
        await invalidateDashboardCache(pid);
        console.log(`[reservations] Cache invalidated for patient_id=${pid}`);
      }

      // ★ GASはバックグラウンドで同期（ユーザーを待たせない）
      syncToGASBackground(payload);

      return NextResponse.json({
        ok: true,
        reserveId: reserveId,
        supabaseSync: true,
      }, { status: 200 });
    }

    // ★ 予約キャンセルの場合はSupabaseにも並列書き込み
    if (type === "cancelReservation") {
      const reserveId = body.reserveId || body.reservationId || body.id || "";
      const pid = body.patient_id || patientId;

      if (!reserveId) {
        return NextResponse.json({ ok: false, error: "reserveId required" }, { status: 400 });
      }

      const payload = {
        ...body,
        patient_id: pid,
        intakeId: body.intakeId || intakeId,
        intake_id: body.intake_id || intakeId,
      };

      // ★ DB先行書き込み（高速レスポンスのため）
      const [supabaseReservationResult, supabaseIntakeResult] = await Promise.allSettled([
        // 1. reservationsテーブルのstatusを"canceled"に更新（リトライあり）
        retrySupabaseWrite(async () => {
          const result = await supabase
            .from("reservations")
            .update({ status: "canceled" })
            .eq("reserve_id", reserveId);

          if (result.error) {
            throw result.error;
          }
          return result;
        }),

        // 2. intakeテーブルの予約情報をクリア（リトライあり）
        pid ? retrySupabaseWrite(async () => {
          const result = await supabase
            .from("intake")
            .update({
              reserve_id: null,
              reserved_date: null,
              reserved_time: null,
            })
            .eq("patient_id", pid)
            .eq("reserve_id", reserveId);

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

      // ★ GASはバックグラウンドで同期（ユーザーを待たせない）
      syncToGASBackground(payload);

      return NextResponse.json({
        ok: true,
        reserveId,
        supabaseSync: true,
      }, { status: 200 });
    }

    // ★ 予約変更（日時のみ更新）
    if (type === "updateReservation") {
      const reserveId = body.reserveId || body.reservationId || "";
      const newDate = body.date || "";
      const newTime = body.time || "";
      const pid = body.patient_id || patientId;

      if (!reserveId || !newDate || !newTime) {
        return NextResponse.json({ ok: false, error: "missing parameters" }, { status: 400 });
      }

      // ★★ 翌月予約開放日チェック ★★
      if (!(await isDateBookable(newDate))) {
        console.log(`[Reservation] booking_not_open for update: date=${newDate}`);
        return NextResponse.json({
          ok: false,
          error: "booking_not_open",
          message: `この日付はまだ予約を受け付けていません。毎月${BOOKING_OPEN_DAY}日に翌月の予約が開放されます。`,
        }, { status: 400 });
      }

      const payload = {
        ...body,
        patient_id: pid,
        intakeId: body.intakeId || intakeId,
        intake_id: body.intake_id || intakeId,
      };

      // ★ DB先行書き込み（高速レスポンスのため）
      const [supabaseReservationResult, supabaseIntakeResult] = await Promise.allSettled([
        // 1. reservationsテーブルの日時を更新（リトライあり）
        retrySupabaseWrite(async () => {
          const result = await supabase
            .from("reservations")
            .update({
              reserved_date: newDate,
              reserved_time: newTime,
            })
            .eq("reserve_id", reserveId);

          if (result.error) {
            throw result.error;
          }
          return result;
        }),

        // 2. intakeテーブルの日時を更新（リトライあり）
        pid ? retrySupabaseWrite(async () => {
          const result = await supabase
            .from("intake")
            .update({
              reserved_date: newDate,
              reserved_time: newTime,
            })
            .eq("patient_id", pid)
            .eq("reserve_id", reserveId)
            .select();

          if (result.error) {
            throw result.error;
          }

          if (!result.data || result.data.length === 0) {
            console.error("❌ [CRITICAL] Intake update failed for updateReservation:", { patient_id: pid, reserve_id: reserveId });
          } else {
            console.log(`✓ Intake updated (change): patient_id=${pid}, reserve_id=${reserveId}, date=${newDate}, time=${newTime}`);
          }

          return result;
        }) : Promise.resolve({ error: null }),
      ]);

      // DB結果チェック - 更新失敗はエラー
      if (supabaseReservationResult.status === "rejected" ||
          (supabaseReservationResult.status === "fulfilled" && supabaseReservationResult.value.error)) {
        const error = supabaseReservationResult.status === "rejected"
          ? supabaseReservationResult.reason
          : supabaseReservationResult.value.error;
        console.error("[Supabase] Reservation update failed:", error);
        return NextResponse.json({ ok: false, error: "db_error", detail: String(error) }, { status: 500 });
      }

      if (supabaseIntakeResult.status === "rejected" ||
          (supabaseIntakeResult.status === "fulfilled" && supabaseIntakeResult.value.error)) {
        const error = supabaseIntakeResult.status === "rejected"
          ? supabaseIntakeResult.reason
          : supabaseIntakeResult.value.error;
        console.error("[Supabase] Intake update failed:", error);
      }

      // キャッシュ削除
      if (pid) {
        await invalidateDashboardCache(pid);
        console.log(`[reservations] Cache invalidated for patient_id=${pid}`);
      }

      // ★ GASはバックグラウンドで同期（ユーザーを待たせない）
      syncToGASBackground(payload);

      return NextResponse.json({
        ok: true,
        reserveId,
        supabaseSync: true,
      }, { status: 200 });
    }

    // ★ その他の操作は従来通りGASのみ
    const payload = {
      ...body,
      patient_id: body.patient_id || patientId,
      intakeId: body.intakeId || intakeId,
      intake_id: body.intake_id || intakeId,
    };

    const gasRes = await fetch(GAS_RESERVATIONS_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await gasRes.text().catch(() => "");
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }

    if (!gasRes.ok || json?.ok !== true) {
      console.error("GAS reservations POST error:", gasRes.status, text);

      return NextResponse.json(
        {
          ok: false,
          error: "gas_error",
          gas_status: gasRes.status,
          gas: json && Object.keys(json).length ? json : undefined,
          detail: text,
        },
        { status: 500 }
      );
    }


    // ★ キャッシュ削除（予約作成・変更・キャンセル時）
    // GASレスポンスからpatient_idを取得（cookieよりも確実）
    const pidFromGas = json.patientId || json.patient_id;
    const finalPid = pidFromGas || patientId;

    if (finalPid) {
      await invalidateDashboardCache(finalPid);
      console.log(`[reservations] Cache invalidated for patient_id=${finalPid}`);
    } else {
      console.warn(`[reservations] No patient_id found for cache invalidation (type=${type})`);
    }

    // ★ 丸返し禁止：成功だけ返す（必要なら予約ID等だけホワイトリストで返す）
    return NextResponse.json({
      ok: true,
      reserveId: json.reserveId,
      supabaseSync: json.supabaseSync
    }, { status: 200 });
  } catch {
    console.error("POST /api/reservations error");
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

