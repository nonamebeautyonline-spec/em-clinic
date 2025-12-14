import { NextRequest, NextResponse } from "next/server";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string | undefined;
// ↑ すでにマイページで使っているGAS URLがあればそれを使う（名前が違うなら合わせます）

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json({ ok: false, message: "not_linked" }, { status: 401 });
  }

  // GASが無いなら name は空で返す（UI側がゲストにする）
  if (!GAS_INTAKE_URL) {
    return NextResponse.json({ ok: true, patientId, name: "" });
  }

  try {
    // GAS doGet(type=getDashboard) から displayName を取得
    const url = `${GAS_INTAKE_URL}?type=getDashboard&pid=${encodeURIComponent(patientId)}`;
    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text();

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error("profile: GAS returned non-JSON:", text);
      return NextResponse.json({ ok: true, patientId, name: "" });
    }

    const name = String(data?.patient?.displayName || "").trim();

    return NextResponse.json({ ok: true, patientId, name });
  } catch (e) {
    console.error("profile: GAS fetch error:", e);
    return NextResponse.json({ ok: true, patientId, name: "" });
  }
}
