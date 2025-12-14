// app/api/mypage/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL as string | undefined;

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json({ ok: false, message: "not_linked" }, { status: 401 });
  }

  // GAS未設定なら name 空（UIがゲストにする）
  if (!GAS_MYPAGE_URL) {
    return NextResponse.json({ ok: true, patientId, name: "" });
  }

  try {
    // GAS doGet(type=getDashboard) を叩いて displayName を取る
    const url = `${GAS_MYPAGE_URL}?type=getDashboard&pid=${encodeURIComponent(patientId)}`;
    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text();

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error("mypage/profile: GAS returned non-JSON:", text);
      return NextResponse.json({ ok: true, patientId, name: "" });
    }

    const name = String(data?.patient?.displayName || "").trim();

    return NextResponse.json({ ok: true, patientId, name });
  } catch (e) {
    console.error("mypage/profile: GAS fetch error:", e);
    return NextResponse.json({ ok: true, patientId, name: "" });
  }
}
