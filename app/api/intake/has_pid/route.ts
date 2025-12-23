// app/api/intake/has_pid/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_INTAKE_LIST_URL = process.env.GAS_INTAKE_LIST_URL as string;

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!GAS_INTAKE_LIST_URL) {
    return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
  }

  const url =
    `${GAS_INTAKE_LIST_URL}?type=hasIntakeByPid&patient_id=${encodeURIComponent(patientId)}`;

  const gasRes = await fetch(url, { method: "GET", cache: "no-store" });
  const text = await gasRes.text().catch(() => "");
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch {}

  if (!gasRes.ok || json?.ok !== true) {
    return NextResponse.json({ ok: false, error: "gas_error", detail: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true, exists: !!json.exists, intakeId: json.intakeId || "" });
}
