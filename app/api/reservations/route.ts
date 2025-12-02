// app/api/reservations/route.ts
import { NextResponse } from "next/server";

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as string;

// GAS(listRange) から返ってくる想定の形
type GasListRangeResponse = {
  ok: boolean;
  startDate: string;
  endDate: string;
  slots: { date: string; time: string; count: number }[];
};

// GET /api/reservations?start=YYYY-MM-DD&end=YYYY-MM-DD
// （保険で date=YYYY-MM-DD 単独も受ける）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const date = searchParams.get("date"); // 互換用

  try {
    // もし date だけ指定されている場合は旧 listByDate を叩く（保険）
    if (date && !start && !end) {
      const gasRes = await fetch(GAS_RESERVATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "listByDate", date }),
      });

      const text = await gasRes.text();
      if (!gasRes.ok) {
        return NextResponse.json(
          { error: "GAS error", detail: text },
          { status: 500 }
        );
      }

      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }

      const reservations: { date: string; time: string }[] =
        json.reservations ?? [];

      const counts: Record<string, number> = {};
      for (const r of reservations) {
        const t = r.time;
        if (!t) continue;
        counts[t] = (counts[t] ?? 0) + 1;
      }

      const slots = Object.entries(counts).map(([time, count]) => ({
        time,
        count,
      }));

      return NextResponse.json({ date, slots });
    }

    // 新方式：start & end 必須
    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end are required" },
        { status: 400 }
      );
    }

    const gasRes = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "listRange",
        startDate: start,
        endDate: end,
      }),
    });

    const text = await gasRes.text();
    console.log("GAS reservations listRange raw:", text);

    if (!gasRes.ok) {
      return NextResponse.json(
        { error: "GAS error", detail: text },
        { status: 500 }
      );
    }

    let json: GasListRangeResponse | any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    const slots =
      (json.slots as { date: string; time: string; count: number }[]) ?? [];

    return NextResponse.json({
      start,
      end,
      slots,
    });
  } catch (err) {
    console.error("GET /api/reservations error:", err);
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}

// POST /api/reservations
export async function POST(req: Request) {
  try {
    const body = await req.json(); // { type, date, time, lineId, name }
    const { type, date, time, lineId, name } = body || {};

    console.log("RESERVATION body:", body);
    console.log("GAS_RESERVATIONS_URL:", GAS_RESERVATIONS_URL);

    if (!date || !time) {
      console.error("RESERVATION error: missing date or time", body);
      return NextResponse.json(
        { ok: false, error: "missing date or time" },
        { status: 400 }
      );
    }

    const gasRes = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: type ?? "createReservation",
        date,
        time,
        lineId,
        name,
      }),
    });

    const text = await gasRes.text();
    console.log("GAS reservation raw:", text);

    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    // GAS が ok:false を返してくるパターンあり
    if (json && json.ok === false) {
      if (json.error === "slot_full") {
        return NextResponse.json(
          { ok: false, error: "slot_full" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: json.error ?? "GAS error" },
        { status: 500 }
      );
    }

    if (!gasRes.ok) {
      return NextResponse.json(
        { ok: false, error: "GAS error", detail: text },
        { status: 500 }
      );
    }

    const reserveId = json.reserveId ?? `mock-${Date.now()}`;
    return NextResponse.json({ ok: true, reserveId });
  } catch (err) {
    console.error("RESERVATION API error:", err);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
