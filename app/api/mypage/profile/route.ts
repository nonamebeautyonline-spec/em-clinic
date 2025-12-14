// app/api/mypage/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  // name は任意（無くてもOK）
  const name = req.cookies.get("patient_name")?.value || "";

  if (!patientId) {
    return NextResponse.json(
      { ok: false, message: "not_linked" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    patientId,
    name,
  });
}
