// app/api/intake/has/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const reserveId = String(searchParams.get("reserveId") || "").trim();
  if (!reserveId) {
    return NextResponse.json({ ok: false, error: "reserveId_required" }, { status: 400 });
  }

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("patient_id")
      .eq("patient_id", patientId)
      .eq("reserve_id", reserveId)
      .maybeSingle(),
    tenantId
  );

  if (error) {
    console.error("[intake/has] Supabase error:", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, exists: !!data });
}
