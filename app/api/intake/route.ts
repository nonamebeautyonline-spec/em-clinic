// app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string | undefined;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_INTAKE_URL) {
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({} as any));

    const patientId =
      req.cookies.get("__Host-patient_id")?.value ||
      req.cookies.get("patient_id")?.value ||
      "";

if (!patientId) {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}


    const payload = {
      ...body,
      type: "intake",
      patient_id: patientId,
    };

    const gasRes = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await gasRes.text().catch(() => "");
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}

    if (!gasRes.ok || json?.ok !== true) {
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    // ★ GASは { ok:true, intakeId } を返す前提
    const intakeId = String(json.intakeId || "").trim();
    if (!intakeId) {
      return NextResponse.json({ ok: false, error: "missing_intake_id_from_gas" }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });

res.cookies.set("__Host-intake_id", intakeId, {
  httpOnly: true,
  secure: true,
  sameSite: "none", // ← lax から none
  path: "/",
  maxAge: 60 * 60 * 24,
});


    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
