// app/api/profile/route.ts — 患者プロフィール取得API
import { NextRequest, NextResponse } from "next/server";
import { verifyPatientSession } from "@/lib/patient-session";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  // 患者セッション検証（JWT + 旧Cookieフォールバック）
  const session = await verifyPatientSession(req);
  if (!session) {
    return NextResponse.json(
      { message: "not_linked" },
      { status: 401 }
    );
  }

  const tenantId = resolveTenantId(req);

  // DBから患者名を取得（旧Cookie「patient_name」からの移行）
  const { data: patient } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("name")
      .eq("patient_id", session.patientId),
    tenantId,
  ).maybeSingle();

  const name = patient?.name || "";

  return NextResponse.json({
    patientId: session.patientId,
    name,
  });
}
