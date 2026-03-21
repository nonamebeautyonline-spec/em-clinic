// app/api/mypage/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyPatientSession } from "@/lib/patient-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await verifyPatientSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, message: "not_linked" }, { status: 401 });
  }

  // GASは呼ばない（名前も返さない）
  return NextResponse.json({ ok: true }, { status: 200 });
}
