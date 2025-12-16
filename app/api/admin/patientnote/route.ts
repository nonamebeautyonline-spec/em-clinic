// app/api/admin/patientnote/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const patientId = (body?.patientId || "").trim();
    const note = String(body?.note ?? "");

    if (!patientId) {
      return NextResponse.json(
        { ok: false, message: "patientId_required" },
        { status: 400 }
      );
    }

    const GAS_KARTE_URL = process.env.GAS_KARTE_URL;
    const KARTE_API_KEY = process.env.KARTE_API_KEY;

    if (!GAS_KARTE_URL || !KARTE_API_KEY) {
      return NextResponse.json(
        { ok: false, message: "env_not_set" },
        { status: 500 }
      );
    }

    const res = await fetch(GAS_KARTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        apiKey: KARTE_API_KEY,
        type: "updateDoctorNote",
        patientId,
        note,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!data || data.ok !== true) {
      return NextResponse.json(
        { ok: false, message: "gas_error", data },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      editedAt: data.editedAt || "",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "server_error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
