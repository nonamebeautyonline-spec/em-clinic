// app/api/reservations/route.ts
import { NextResponse } from "next/server";

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as string | undefined;

// GET /api/reservations?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const date = searchParams.get("date");

  try {
    if (!GAS_RESERVATIONS_URL) {
      // GAS 未設定時はモックで返す
      return NextResponse.json({
        start,
        end,
        slots: [],
      });
    }

    // 旧：date 単独指定(listByDate)にも対応
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

    let json: any = {};
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
    const body = await req.json();
    const type = body.type ?? "createReservation";

    if (!GAS_RESERVATIONS_URL) {
      console.warn(
        "GAS_RESERVATIONS_URL is not set. /api/reservations will return mock."
      );
      return NextResponse.json({ ok: true, mock: true });
    }

    // ① 新規予約
    if (type === "createReservation") {
      const { date, time, lineId, name } = body;
      if (!date || !time) {
        return NextResponse.json(
          { ok: false, error: "missing date or time" },
          { status: 400 }
        );
      }

      const gasRes = await fetch(GAS_RESERVATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "createReservation",
          date,
          time,
          lineId,
          name,
        }),
      });

      const text = await gasRes.text();
      console.log("GAS createReservation raw:", text);

      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }

      if (!gasRes.ok || json.ok === false) {
        return NextResponse.json(
          {
            ok: false,
            error: json.error ?? "GAS error",
            detail: text,
          },
          { status: json.error === "slot_full" ? 409 : 500 }
        );
      }

      return NextResponse.json({ ok: true, reserveId: json.reserveId });
    }

    // ② 予約キャンセル
    if (type === "cancelReservation") {
      const reserveId = body.reserveId;
      if (!reserveId) {
        return NextResponse.json(
          { ok: false, error: "missing reserveId" },
          { status: 400 }
        );
      }

      const gasRes = await fetch(GAS_RESERVATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cancelReservation",
          reserveId,
        }),
      });

      const text = await gasRes.text();
      console.log("GAS cancelReservation raw:", text);

      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }

      if (!gasRes.ok || json.ok === false) {
        return NextResponse.json(
          {
            ok: false,
            error: json.error ?? "GAS error",
            detail: text,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // 他の type は未対応
    return NextResponse.json(
      { ok: false, error: "unsupported type" },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST /api/reservations error:", err);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
