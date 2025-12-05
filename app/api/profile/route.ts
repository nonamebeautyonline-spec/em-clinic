// app/api/mypage/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lineUserId = req.cookies.get("line_user_id")?.value;
  const patientIdFromCookie = req.cookies.get("patient_id")?.value;

  if (!lineUserId && !patientIdFromCookie) {
    return NextResponse.json({ message: "not_logged_in" }, { status: 401 });
  }

  const gasUrl = process.env.GAS_PATIENT_PROFILE_URL!;
  const res = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "profile",
      line_user_id: lineUserId || "",
      patient_id: patientIdFromCookie || "",
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({ message: "not_found" }, { status: 404 });
  }

  // data: { ok:true, patient_id, name, name_kana, tel, sex, birth, ... }
  return NextResponse.json({
    patientId: data.patient_id,
    name: data.name,
    nameKana: data.name_kana,
    tel: data.tel,
  });
}
