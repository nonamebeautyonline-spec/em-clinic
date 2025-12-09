import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function GET(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_REORDER_URL not configured" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;
    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", patient_id: patientId }),
      cache: "no-store",
    });

    const gasJson = await gasRes.json().catch(() => ({}));

    if (!gasRes.ok || !gasJson.ok) {
      return NextResponse.json(
        { ok: false, error: gasJson.error || "GAS error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, reorders: gasJson.reorders ?? [] },
      { status: 200 }
    );
  } catch (e) {
    console.error("mypage/reorders error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
