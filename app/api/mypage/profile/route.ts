// app/api/mypage/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const patientId = req.cookies.get("patient_id")?.value;
  const name = req.cookies.get("patient_name")?.value;

  if (!patientId || !name) {
    return NextResponse.json(
      { ok: false, message: "not_linked" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    patientId: patientId,
    name: name,
  });
}
