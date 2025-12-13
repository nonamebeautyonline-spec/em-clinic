import { NextResponse } from "next/server";

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as
  | string
  | undefined;

// 管理UI統合済みの予約GASを叩く（同一URLでOK）
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
    .forEach((r) => weeklyMap.set(r.weekday, r));

  const overrideMap = new Map<string, Override>();
  overrides
    .filter((o) => o.doctor_id === doctorId)
    .forEach((o) => overrideMap.set(o.date, o));

  const bookedMap = new Map<string, number>(); // "YYYY-MM-DD|HH:mm" -> bookedCount
  booked.forEach((b) =>
    bookedMap.set(`${b.date}|${b.time}`, Number(b.count || 0))
  );

  const startDate = new Date(`${start}T00:00:00+09:00`);
  const endDate = new Date(`${end}T00:00:00+09:00`);

  const slots: { date: string; time: string; count: number }[] = [];

  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    const date = ymd(d);
    const weekday = d.getDay(); // 0..6

    const base = weeklyMap.get(weekday);
    const ov = overrideMap.get(date);

    // 1) closed は全休
    if (ov?.type === "closed") continue;

    // 2) baseが無効で、openでもないなら休み
    if (!base?.enabled && ov?.type !== "open") continue;

    // 3) 値決定（override優先）
    const slotMinutes =
      (typeof ov?.slot_minutes === "number" ? ov.slot_minutes : undefined) ??
      (base?.slot_minutes ?? 15);

    const cap =
      (typeof ov?.capacity === "number" ? ov.capacity : undefined) ??
      (base?.capacity ?? 2);

    const startTime =
      (ov?.start_time && ov.start_time.trim() ? ov.start_time : "") ||
      (base?.start_time || "");

    const endTime =
      (ov?.end_time && ov.end_time.trim() ? ov.end_time : "") ||
      (base?.end_time || "");

    if (!startTime || !endTime) continue;

    const sMin = parseMinutes(startTime);
    const eMin = parseMinutes(endTime);
    if (!(sMin < eMin) || slotMinutes <= 0) continue;

    for (let t = sMin; t + slotMinutes <= eMin; t += slotMinutes) {
      const time = toHHMM(t);
      const key = `${date}|${time}`;
      const bookedCount = bookedMap.get(key) ?? 0;
      const remain = Math.max(0, cap - bookedCount);
      slots.push({ date, time, count: remain }); // count=残枠（0..2）
    }
  }

  return slots;
}

// =============================
// GET /api/reservations
//   - ?start=YYYY-MM-DD&end=YYYY-MM-DD  → 管理UI連動の可用枠（残枠count）
//   - ?date=YYYY-MM-DD                  → 旧仕様互換（{date, slots:[{time,count}] }）
// =============================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const date = searchParams.get("date");

  try {
    if (!GAS_RESERVATIONS_URL) {
      // GAS 未設定時はモック
      return NextResponse.json({
        start: start ?? date ?? null,
        end: end ?? date ?? null,
        slots: [],
      });
    }

    // ▼ 単日指定（旧仕様互換）
    if (date && !start && !end) {
      // 単日も内部的には「範囲生成」でやる（date=date）
      const doctorId = "dr_default";

      // 予約済み件数（その日だけ）
      const bookedRes = await gasPost({
        type: "listRange",
        startDate: date,
        endDate: date,
      });
      if (!bookedRes.okHttp) {
        return NextResponse.json(
          { error: "GAS error", detail: bookedRes.text },
          { status: 500 }
        );
      }
      const booked: BookedSlot[] = bookedRes.json?.slots ?? [];

      // ルール取得（管理系は token 必須）
      if (!ADMIN_TOKEN) {
        // token無ければ安全側（空）
        return NextResponse.json({ date, slots: [] });
      }
      const schedRes = await gasPost({
        type: "getScheduleRange",
        token: ADMIN_TOKEN,
        doctor_id: doctorId,
        start: date,
        end: date,
      });
      if (!schedRes.okHttp || !schedRes.json?.ok) {
        return NextResponse.json({ date, slots: [] });
      }

      const weekly: WeeklyRule[] = schedRes.json.weekly_rules ?? [];
      const overrides: Override[] = schedRes.json.overrides ?? [];

      const rangeSlots = buildAvailabilityRange(
        date,
        date,
        weekly,
        overrides,
        booked,
        doctorId
      );

      // 旧仕様：{ time, count } の配列に変換（timeごと残枠count）
      const slots = rangeSlots
        .filter((s) => s.date === date)
        .map((s) => ({ time: s.time, count: s.count }));

      return NextResponse.json({ date, slots });
    }

    // ▼ 範囲指定（新仕様）
    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end are required" },
        { status: 400 }
      );
    }

    const doctorId = "dr_default";

    // ① 予約済み件数
    const bookedRes = await gasPost({
      type: "listRange",
      startDate: start,
      endDate: end,
    });
    if (!bookedRes.okHttp) {
      return NextResponse.json(
        { error: "GAS error", detail: bookedRes.text },
        { status: 500 }
      );
    }
    const booked: BookedSlot[] = bookedRes.json?.slots ?? [];

    // ② ルール取得（管理系は token 必須）
    if (!ADMIN_TOKEN) {
      // token無ければ安全側（空）
      return NextResponse.json({ start, end, slots: [] });
    }

    const schedRes = await gasPost({
      type: "getScheduleRange",
      token: ADMIN_TOKEN,
      doctor_id: doctorId,
      start,
      end,
    });

    if (!schedRes.okHttp || !schedRes.json?.ok) {
      return NextResponse.json({ start, end, slots: [] });
    }

    const weekly: WeeklyRule[] = schedRes.json.weekly_rules ?? [];
    const overrides: Override[] = schedRes.json.overrides ?? [];

    // ③ 営業枠生成→予約済を引いて残枠countに
    const slots = buildAvailabilityRange(
      start,
      end,
      weekly,
      overrides,
      booked,
      doctorId
    );

    return NextResponse.json({ start, end, slots });
  } catch (err) {
    console.error("GET /api/reservations error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// =============================
// POST /api/reservations
//   - createReservation
//   - cancelReservation
//   - updateReservation
// =============================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body?.type as string | undefined;

    console.log("POST /api/reservations type:", type, "body:", body);

    if (!GAS_RESERVATIONS_URL) {
      console.warn(
        "GAS_RESERVATIONS_URL is not set. /api/reservations will return mock."
      );
      return NextResponse.json({ ok: true, mock: true, body });
    }

    const gasRes = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
      console.error("GAS reservations HTTP error:", {
        status: gasRes.status,
        text,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "GAS error",
          detail: text,
        },
        { status: 500 }
      );
    }

    if (typeof json.ok === "boolean") {
      return NextResponse.json(json);
    } else {
      return NextResponse.json({ ok: true, ...json });
    }
  } catch (err) {
    console.error("POST /api/reservations error:", err);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
