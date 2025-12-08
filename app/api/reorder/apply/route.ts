// app/api/reorder/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      console.error("GAS_REORDER_URL is not configured");
      return NextResponse.json(
        { ok: false, error: "GAS_REORDER_URL is not configured" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;
    if (!patientId) {
      console.error("no patient_id cookie");
      return NextResponse.json(
        { ok: false, error: "unauthorized: no patient_id cookie" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const productCode = body.productCode as string | undefined;
    if (!productCode) {
      console.error("no productCode in body");
      return NextResponse.json(
        { ok: false, error: "productCode required" },
        { status: 400 }
      );
    }

    console.log("POST /api/reorder/apply → GAS", {
      patientId,
      productCode,
    });

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

    const gasText = await gasRes.text(); // ★ 一旦 text として受ける
    let gasJson: any = {};
    try {
      gasJson = JSON.parse(gasText);
    } catch {
      gasJson = {};
    }

    console.log("GAS reorder apply response", {
      status: gasRes.status,
      body: gasText,
    });

    if (!gasRes.ok || gasJson.ok === false) {
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
