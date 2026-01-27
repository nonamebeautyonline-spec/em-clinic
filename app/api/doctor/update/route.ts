import { NextResponse } from "next/server";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string;

function fail(code: string, status: number = 500) {
  return NextResponse.json({ ok: false, code }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const res = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "doctor_update", ...body }),
    });

    const text = await res.text().catch(() => "");
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      console.error("[doctor/update] GAS response is not JSON:", text);
      return fail("GAS_NON_JSON", 500);
    }

    console.log("[doctor/update] GAS response:", json);

    if (!res.ok || json?.ok !== true) {
      console.error("[doctor/update] GAS error:", { status: res.status, json });
      return fail("GAS_ERROR", 500);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    console.error("doctor_update error");
    return fail("INTERNAL_ERROR", 500);
  }
}
