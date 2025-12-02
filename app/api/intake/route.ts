// app/api/intake/route.ts
import { NextResponse } from "next/server";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string;

export async function POST(req: Request) {
  try {
    const body = await req.json(); // { reserveId, answers, submittedAt }
    const { reserveId, answers, submittedAt } = body || {};

    console.log("INTAKE body:", body);
    console.log("GAS_INTAKE_URL:", GAS_INTAKE_URL);

    // 必須チェックはするけど 400 は返さず、警告だけ残す
    if (!reserveId || !answers) {
      console.error("INTAKE warning: missing reserveId or answers", body);
      return NextResponse.json({ ok: false, warning: "missing reserveId or answers" });
    }

    const gasRes = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reserveId, answers, submittedAt }),
    });

    const text = await gasRes.text();
    console.log("GAS intake raw:", text);

    if (!gasRes.ok) {
      console.error("GAS intake error:", text);
      return NextResponse.json(
        { ok: false, error: "GAS error", detail: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("INTAKE API error:", err);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
