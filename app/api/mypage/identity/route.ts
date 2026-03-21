// app/api/mypage/identity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyPatientSession } from "@/lib/patient-session";

export async function GET(req: NextRequest) {
  const session = await verifyPatientSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, message: "not_linked" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, patientId: session.patientId }, { status: 200 });
}
