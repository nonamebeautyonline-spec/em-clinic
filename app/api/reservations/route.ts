// app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as string | undefined;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;

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

async function gasPost(payload: any) {
  if (!GAS_RESERVATIONS_URL) throw new Error("Missing GAS_RESERVATIONS_URL");

  const res = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  // ★ text は返すが、GET側ではログに出さない（診療/個人情報混入防止）
  return { okHttp: res.ok, status: res.status, text, json };
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
    if (!GAS_RESERVATIONS_URL) {
      // GAS未設定時は空で返す（text等は返さない）
      return NextResponse.json(
        { start: start ?? date ?? null, end: end ?? date ?? null, slots: [] },
        { status: 200 }
      );
    }

    const doctorId = "dr_default";

    // 単日（互換）
    if (date && !start && !end) {
      if (!ADMIN_TOKEN) {
        return NextResponse.json({ date, slots: [] }, { status: 200 });
      }

      const bookedRes = await gasPost({
        type: "listRange",
        startDate: date,
        endDate: date,
      });
      if (!bookedRes.okHttp || bookedRes.json?.ok !== true) {
        console.error("GAS listRange error:", bookedRes.status);
        return NextResponse.json({ error: "GAS error" }, { status: 500 });
      }

      const schedRes = await gasPost({
        type: "getScheduleRange",
        token: ADMIN_TOKEN,
        doctor_id: doctorId,
        start: date,
        end: date,
      });
      if (!schedRes.okHttp || schedRes.json?.ok !== true) {
        console.error("GAS getScheduleRange error:", schedRes.status, "ADMIN_TOKEN:", ADMIN_TOKEN ? "SET" : "MISSING", "response:", schedRes.json);
        return NextResponse.json({ error: "GAS error" }, { status: 500 });
      }

      const out = buildAvailabilityRange(
        date,
        date,
        (schedRes.json.weekly_rules || []) as WeeklyRule[],
        (schedRes.json.overrides || []) as Override[],
        (bookedRes.json.slots || []) as BookedSlot[],
        doctorId
      );

      return NextResponse.json(
        { date, slots: out.map((s) => ({ time: s.time, count: s.count })) },
        { status: 200 }
      );
    }

    // 範囲
    if (!start || !end) {
      return NextResponse.json({ error: "start and end are required" }, { status: 400 });
    }

    if (!ADMIN_TOKEN) {
      return NextResponse.json({ error: "ADMIN_TOKEN is not set" }, { status: 500 });
    }

    const bookedRes = await gasPost({
      type: "listRange",
      startDate: start,
      endDate: end,
    });
    if (!bookedRes.okHttp || bookedRes.json?.ok !== true) {
      console.error("GAS listRange error:", bookedRes.status);
      return NextResponse.json({ error: "GAS error" }, { status: 500 });
    }

    const schedRes = await gasPost({
      type: "getScheduleRange",
      token: ADMIN_TOKEN,
      doctor_id: doctorId,
      start,
      end,
    });
    if (!schedRes.okHttp || schedRes.json?.ok !== true) {
      console.error("GAS getScheduleRange error:", schedRes.status);
      return NextResponse.json({ error: "GAS error" }, { status: 500 });
    }

    const slots = buildAvailabilityRange(
      start,
      end,
      (schedRes.json.weekly_rules || []) as WeeklyRule[],
      (schedRes.json.overrides || []) as Override[],
      (bookedRes.json.slots || []) as BookedSlot[],
      doctorId
    );

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
      const reserveId = "resv-" + Date.now();

      const payload = {
        ...body,
        patient_id: pid,
        intakeId: body.intakeId || intakeId,
        intake_id: body.intake_id || intakeId,
        reserveId: reserveId, // ★ Next.jsで生成したreserveIdを渡す
        skipSupabase: true, // GAS側でSupabase書き込みをスキップ
      };

      // Supabase と GAS に並列書き込み
      const [supabaseReservationResult, supabaseIntakeResult, gasResult] = await Promise.allSettled([
        // 1. reservationsテーブルに予約を作成
        supabase
          .from("reservations")
          .insert({
            reserve_id: reserveId,
            patient_id: pid,
            patient_name: null,
            reserved_date: date || null,
            reserved_time: time || null,
            status: "pending",
            note: null,
            prescription_menu: null,
          }),

        // 2. intakeテーブルの予約情報を更新
        pid ? supabase
          .from("intake")
          .update({
            reserve_id: reserveId,
            reserved_date: date || null,
            reserved_time: time || null,
          })
          .eq("patient_id", pid) : Promise.resolve({ error: null }),

        // 3. GASにPOST
        fetch(GAS_RESERVATIONS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        }).then(async (res) => {
          const text = await res.text().catch(() => "");
          let json: any = {};
          try { json = text ? JSON.parse(text) : {}; } catch {}
          return { ok: res.ok && json?.ok === true, json, text, status: res.status };
        }),
      ]);

      // Supabase結果チェック
      if (supabaseReservationResult.status === "rejected" ||
          (supabaseReservationResult.status === "fulfilled" && supabaseReservationResult.value.error)) {
        const error = supabaseReservationResult.status === "rejected"
          ? supabaseReservationResult.reason
          : supabaseReservationResult.value.error;
        console.error("[Supabase] Reservation write failed:", error);
      }

      if (supabaseIntakeResult.status === "rejected" ||
          (supabaseIntakeResult.status === "fulfilled" && supabaseIntakeResult.value.error)) {
        const error = supabaseIntakeResult.status === "rejected"
          ? supabaseIntakeResult.reason
          : supabaseIntakeResult.value.error;
        console.error("[Supabase] Intake update failed:", error);
      }

      // GAS結果チェック
      let json: any = {};
      if (gasResult.status === "rejected" || (gasResult.status === "fulfilled" && !gasResult.value.ok)) {
        const error = gasResult.status === "rejected"
          ? gasResult.reason
          : gasResult.value.text;
        console.error("GAS reservations POST error:", error);

        const status = gasResult.status === "fulfilled" ? gasResult.value.status : 500;
        const gasJson = gasResult.status === "fulfilled" ? gasResult.value.json : {};

        return NextResponse.json(
          {
            ok: false,
            error: "gas_error",
            gas_status: status,
            gas: gasJson && Object.keys(gasJson).length ? gasJson : undefined,
            detail: error,
          },
          { status: 500 }
        );
      }

      if (gasResult.status === "fulfilled") {
        json = gasResult.value.json;
      }

      // GASから返されたreserveIdを使う（GASが生成したID）
      const finalReserveId = json.reserveId || reserveId;

      // キャッシュ削除
      const pidFromGas = json.patientId || json.patient_id;
      const finalPid = pidFromGas || pid;

      if (finalPid) {
        await invalidateDashboardCache(finalPid);
        console.log(`[reservations] Cache invalidated for patient_id=${finalPid}`);
      }

      return NextResponse.json({
        ok: true,
        reserveId: finalReserveId,
        supabaseSync: true,
      }, { status: 200 });
    }

    // ★ 予約作成以外（キャンセルなど）は従来通りGASのみ
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

