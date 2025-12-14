// app/api/reorder/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      console.error("GAS_REORDER_URL missing");
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;
    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const productCode = body.productCode as string | undefined;
    if (!productCode) {
      return NextResponse.json({ ok: false, error: "productCode_required" }, { status: 400 });
    }

    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", patient_id: patientId, product_code: productCode }),
      cache: "no-store",
    });

    const text = await gasRes.text().catch(() => "");
    let gasJson: any = {};
    try { gasJson = text ? JSON.parse(text) : {}; } catch { gasJson = {}; }

    if (!gasRes.ok || gasJson.ok === false) {
      console.error("GAS reorder apply error:", gasRes.status);
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    console.error("POST /api/reorder/apply error");
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
