// app/api/mypage/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json({ ok: false, message: "not_linked" }, { status: 401 });
  }

  // GASは呼ばない（名前も返さない）
  return NextResponse.json({ ok: true }, { status: 200 });
}
