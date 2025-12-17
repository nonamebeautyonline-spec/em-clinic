// app/api/doctor/callstatus/route.ts
import { NextResponse } from "next/server";

const GAS_URL =
  process.env.GAS_MYPAGE_URL;
// ↑ あなたのプロジェクトで doctor/update が使っている方に合わせる

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reserveId = String(body.reserveId || "").trim();
    const callStatus = String(body.callStatus || "").trim(); // "no_answer" or ""

    if (!reserveId) {
      return NextResponse.json(
        { ok: false, error: "reserveId required" },
        { status: 400 }
      );
    }

    if (!GAS_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS URL not set" },
        { status: 500 }
      );
    }

    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "doctor_call_status",
        reserveId,
        callStatus,
      }),
    });

    const json = await r.json();
    return NextResponse.json(json);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
