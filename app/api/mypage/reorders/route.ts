import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function GET(_req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { ok: false, error: "server_config_error" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", patient_id: patientId }),
      cache: "no-store",
    });

    const gasJson = await gasRes.json().catch(() => ({} as any));
    if (!gasRes.ok || !gasJson.ok) {
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    // ★ 丸返し禁止：必要最小限へ射影
    const raw = Array.isArray(gasJson.reorders) ? gasJson.reorders : [];
    const reorders = raw.map((r: any) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      productCode: r.productCode ?? r.product_code,
      mg: r.mg,
      months: r.months,
    }));

    return NextResponse.json({ ok: true, reorders }, { status: 200 });
  } catch {
    console.error("mypage/reorders error");
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
