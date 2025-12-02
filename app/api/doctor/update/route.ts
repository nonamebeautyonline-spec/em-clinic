// app/api/doctor/update/route.ts
import { NextResponse } from "next/server";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string;

export async function POST(req: Request) {
  try {
    const body = await req.json(); // { reserveId, status?, note?, prescriptionMenu? }

    const res = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "doctor_update",
        ...body,
      }),
    });

    const text = await res.text();
    console.log("doctor_update raw:", text);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "GAS error", detail: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("doctor_update error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
