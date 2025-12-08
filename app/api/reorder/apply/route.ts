// app/api/reorder/apply/route.ts
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

    // cookie から patient_id を取得
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;
    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: no patient_id cookie" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const productCode = body.productCode as string | undefined;
    if (!productCode) {
      return NextResponse.json(
        { ok: false, error: "productCode required" },
        { status: 400 }
      );
    }

    // GAS_REORDER_URL に再処方申請（apply）を投げる
    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        patient_id: patientId,
        product_code: productCode,
      }),
      cache: "no-store",
    });

    const gasJson = await gasRes.json().catch(() => ({}));

    if (!gasRes.ok || gasJson.ok === false) {
      console.error("GAS reorder apply error:", gasRes.status, gasJson);
      return NextResponse.json(
        { ok: false, error: gasJson.error || "GAS error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/reorder/apply error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
