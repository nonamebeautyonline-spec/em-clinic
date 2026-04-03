import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { doctorUpsertSchema } from "@/lib/validations/admin-operations";
import { logAuditWithDiff } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("doctors")
        .select("doctor_id, doctor_name, is_active, sort_order, color")
        .eq("is_active", true)
        .order("sort_order"),
      tenantId
    );

    if (error) {
      console.error("doctors GET error:", error);
      return serverError("DB_ERROR");
    }

    return NextResponse.json({ ok: true, doctors: data || [] });
  } catch (error) {
    console.error("doctors GET error:", error);
    return serverError("SERVER_ERROR");
  }
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

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

    // 変更前の値を取得（差分ログ用: upsertなので存在しない場合はnull）
    const { data: before } = await strictWithTenant(
      supabaseAdmin.from("doctors").select("*").eq("doctor_id", doctor_id),
      tenantId
    ).single();

    const record: Record<string, unknown> = {
      doctor_id,
      doctor_name,
      is_active: doctor.is_active === true,
      sort_order: Number(doctor.sort_order) || 0,
      color: doctor.color || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("doctors")
      .upsert({ ...tenantPayload(tenantId), ...record }, { onConflict: "doctor_id" });

    if (error) {
      console.error("doctors upsert error:", error);
      return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
    }

    // 差分付き監査ログ（fire-and-forget）
    const action = before ? "doctor.update" : "doctor.create";
    logAuditWithDiff(req, action, "doctor", doctor_id, before, record);
    return NextResponse.json({ ok: true, doctor: record });
  } catch (error) {
    console.error("doctors POST error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
