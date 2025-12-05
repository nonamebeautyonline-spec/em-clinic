// app/api/reservations/route.ts
import { NextResponse } from "next/server";

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as
  | string
  | undefined;

// =============================
// GET /api/reservations
//   - ?start=YYYY-MM-DD&end=YYYY-MM-DD  → listRange
//   - ?date=YYYY-MM-DD                  → listByDate（旧仕様）
// =============================
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

    // ▼ 単日指定（旧仕様）: type=listByDate
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

    // ▼ 範囲指定（新仕様）: type=listRange
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
      // 開発時用モック
      return NextResponse.json({ ok: true, mock: true, body });
    }

    // type は createReservation / cancelReservation / updateReservation など。
    // ここでは判別せず、そのまま GAS に投げる。
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

    // ▼ ここが重要ポイント
    // - GAS の HTTP ステータスが 2xx のときは、
    //     json.ok が false（slot_full, already_reserved, ...）でも 200 でそのまま返す
    // - GAS の HTTP ステータス自体がエラーのときだけ 500 扱いにする
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

    // ここまで来たら GAS 自体は正常応答。
    // { ok:true } でも { ok:false, error:"slot_full" } でもそのままフロントに返す。
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
