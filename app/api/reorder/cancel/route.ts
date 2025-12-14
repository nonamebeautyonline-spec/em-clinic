// app/api/reorder/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_REORDER_URL is not configured" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;
    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: no patient_id cookie" },
        { status: 401 }
      );
    }

    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        patient_id: patientId,
      }),
      cache: "no-store",
    });

    const gasText = await gasRes.text();
    let gasJson: any = {};
    try {
      gasJson = JSON.parse(gasText);
    } catch {
      gasJson = {};
    }

    if (!gasRes.ok || gasJson.ok === false) {
          console.error("GAS reorder cancel error:", gasRes.status);
      return NextResponse.json(
        { ok: false, error: gasJson.error || "GAS error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/reorder/cancel error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
