// app/api/intake/has/route.ts
// ?reserveId=xxx&fieldId=xxx で分野別に問診済み判定（マルチ分野モード時）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import { verifyPatientSession } from "@/lib/patient-session";

export async function GET(req: NextRequest) {
  const session = await verifyPatientSession(req);
  if (!session) return unauthorized();
  const patientId = session.patientId;

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const reserveId = String(searchParams.get("reserveId") || "").trim();
  const fieldId = searchParams.get("fieldId");

  if (!reserveId) {
    return badRequest("reserveId_required");
  }

  let query = strictWithTenant(
    supabaseAdmin
      .from("intake")
      .select("patient_id")
      .eq("patient_id", patientId)
      .eq("reserve_id", reserveId),
    tenantId
  );

  // マルチ分野モードかつfieldId指定時のみ分野フィルタ
  const multiField = await isMultiFieldEnabled(tenantId);
  if (multiField && fieldId) {
    query = query.eq("field_id", fieldId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[intake/has] Supabase error:", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, exists: !!data });
}
