// app/api/reservations/route.ts
import { NextResponse } from "next/server";

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as string | undefined;

// GET /api/reservations?start=YYYY-MM-DD&end=YYYY-MM-DD
// 予約枠のカウント用（listRange）
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

    // 新方式：start & end 必須（listRange）
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
// createReservation / cancelReservation などを GAS にそのまま中継
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("POST /api/reservations body:", body);

    if (!GAS_RESERVATIONS_URL) {
      console.warn(
        "GAS_RESERVATIONS_URL is not set. /api/reservations will return mock."
      );
      return NextResponse.json({ ok: true, mock: true, body });
    }

    const gasRes = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // type, reserveId, date, time, lineId, name などをそのまま渡す
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

    // GAS 側が { ok:false, error:"..." } を返してきた場合もここで検知
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

    // GAS が { ok:true, ... } を返す前提
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
