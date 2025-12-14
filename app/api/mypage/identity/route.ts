// app/api/mypage/identity/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const patientId = req.cookies.get("patient_id")?.value;

  if (!patientId) {
    return NextResponse.json(
      { ok: false, message: "not_linked" },
      { status: 401 }
    );
  }

  // ★ 識別子専用：patientId のみ返す（name は返さない）
  return NextResponse.json(
    { ok: true, patientId },
    { status: 200 }
  );
}
