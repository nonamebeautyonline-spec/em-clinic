// app/api/mypage/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cookieStore = req.cookies;
  const patientId = cookieStore.get("patient_id")?.value;
  const name = cookieStore.get("patient_name")?.value;

  // まだ link-patient 済んでない → 401 で返す
  if (!patientId || !name) {
    return NextResponse.json(
      { message: "not_linked" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    patientId,
    name,
  });
}
