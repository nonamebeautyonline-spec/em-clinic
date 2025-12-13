import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as
  | string
  | undefined;

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

function parseMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  return h * 60 + m;
}
function toHHMM(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function gasPost(payload: any) {
  if (!GAS_RESERVATIONS_URL) throw new Error("Missing GAS_RESERVATIONS_URL");

  const res = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = {};
  }
  return { okHttp: res.ok, status: res.status, text, json };
}

function addYmd(ymdStr: string, days: number) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  // UTC で固定してズレ防止
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

    // 休診 or 休み
    if (ov?.type === "closed" || (!base?.enabled && ov?.type !== "open")) {
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
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const date = searchParams.get("date");

  try {
    if (!GAS_RESERVATIONS_URL) {
      return NextResponse.json({
        start: start ?? date ?? null,
        end: end ?? date ?? null,
        slots: [],
      });
    }

    const doctorId = "dr_default";

    // 単日（互換）
    if (date && !start && !end) {
      if (!ADMIN_TOKEN) return NextResponse.json({ date, slots: [] });

      const bookedRes = await gasPost({
        type: "listRange",
        startDate: date,
        endDate: date,
      });
      if (!bookedRes.okHttp || !bookedRes.json?.ok) {
        return NextResponse.json(
          { error: "GAS listRange error", detail: bookedRes.text },
          { status: 500 }
        );
      }

      const schedRes = await gasPost({
        type: "getScheduleRange",
        token: ADMIN_TOKEN,
        doctor_id: doctorId,
        start: date,
        end: date,
      });
      if (!schedRes.okHttp || !schedRes.json?.ok) {
        return NextResponse.json(
          { error: "GAS getScheduleRange error", detail: schedRes.text },
          { status: 500 }
        );
      }

      const out = buildAvailabilityRange(
        date,
        date,
        (schedRes.json.weekly_rules || []) as WeeklyRule[],
        (schedRes.json.overrides || []) as Override[],
        (bookedRes.json.slots || []) as BookedSlot[],
        doctorId
      );

      return NextResponse.json({
        date,
        slots: out.map((s) => ({ time: s.time, count: s.count })),
      });
    }

    // 範囲（連動版）
    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end are required" },
        { status: 400 }
      );
    }

    if (!ADMIN_TOKEN) {
      return NextResponse.json(
        { error: "ADMIN_TOKEN is not set" },
        { status: 500 }
      );
    }

    const bookedRes = await gasPost({
      type: "listRange",
      startDate: start,
      endDate: end,
    });
    if (!bookedRes.okHttp || !bookedRes.json?.ok) {
      return NextResponse.json(
        { error: "GAS listRange error", detail: bookedRes.text },
        { status: 500 }
      );
    }

    const schedRes = await gasPost({
      type: "getScheduleRange",
      token: ADMIN_TOKEN,
      doctor_id: doctorId,
      start,
      end,
    });
    if (!schedRes.okHttp || !schedRes.json?.ok) {
      return NextResponse.json(
        { error: "GAS getScheduleRange error", detail: schedRes.text },
        { status: 500 }
      );
    }

    const slots = buildAvailabilityRange(
      start,
      end,
      (schedRes.json.weekly_rules || []) as WeeklyRule[],
      (schedRes.json.overrides || []) as Override[],
      (bookedRes.json.slots || []) as BookedSlot[],
      doctorId
    );

 return NextResponse.json({
  start,
  end,
  slots,
  _ver: "avail-v2",
  _debug: {
    weekly_len: (schedRes.json.weekly_rules || []).length,
    overrides_len: (schedRes.json.overrides || []).length,
    booked_len: (bookedRes.json.slots || []).length,
    sample_weekly: (schedRes.json.weekly_rules || []).slice(0, 3),
    sample_override: (schedRes.json.overrides || []).slice(0, 3),
  },
});


  } catch (err: any) {
    console.error("GET /api/reservations error:", err);
    return NextResponse.json(
      { error: "server error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}

// =============================
// POST /api/reservations
// =============================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body?.type as string | undefined;

    console.log("POST /api/reservations type:", type, "body:", body);

    if (!GAS_RESERVATIONS_URL) {
      return NextResponse.json({ ok: true, mock: true, body });
    }

    const gasRes = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await gasRes.text();
    console.log("GAS reservations POST raw:", text);

    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    if (!gasRes.ok) {
      return NextResponse.json(
        { ok: false, error: "GAS error", detail: text },
        { status: 500 }
      );
    }

    if (typeof json.ok === "boolean") return NextResponse.json(json);
    return NextResponse.json({ ok: true, ...json });
  } catch (err) {
    console.error("POST /api/reservations error:", err);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
