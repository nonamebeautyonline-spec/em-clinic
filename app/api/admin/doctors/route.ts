import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { doctorUpsertSchema } from "@/lib/validations/admin-operations";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, doctorUpsertSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const doctor = body.doctor || body;

    const doctor_id = String(doctor.doctor_id || "").trim();
    const doctor_name = String(doctor.doctor_name || "").trim();

    if (!doctor_id) {
      return badRequest("doctor_id required");
    }
    if (!doctor_name) {
      return badRequest("doctor_name required");
    }

    const record: Record<string, unknown> = {
      doctor_id,
      doctor_name,
      is_active: doctor.is_active === true,
      sort_order: Number(doctor.sort_order) || 0,
      color: doctor.color || null,
      updated_at: new Date().toISOString(),
    };

    // 新カラム（存在する場合のみ設定）
    if (doctor.specialties !== undefined) record.specialties = doctor.specialties || [];
    if (doctor.photo_url !== undefined) record.photo_url = doctor.photo_url || null;
    if (doctor.bio !== undefined) record.bio = doctor.bio || null;
    if (doctor.display_in_booking !== undefined) record.display_in_booking = doctor.display_in_booking !== false;

    const { error } = await supabaseAdmin
      .from("doctors")
      .upsert({ ...tenantPayload(tenantId), ...record }, { onConflict: "doctor_id" });

    if (error) {
      console.error("doctors upsert error:", error);
      return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, doctor: record });
  } catch (error) {
    console.error("doctors POST error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
