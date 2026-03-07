import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createScheduleSchema } from "@/lib/validations/line-management";

// 予約送信一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");
  const statusFilter = searchParams.get("status"); // "scheduled" でフィルタ可能

  let query = supabaseAdmin.from("scheduled_messages").select("*").order("scheduled_at", { ascending: true });
  if (patientId) query = query.eq("patient_id", patientId);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await withTenant(query, tenantId);

  if (error) return serverError(error.message);
  return NextResponse.json({ schedules: data });
}

// 予約送信登録
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, createScheduleSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_id, message, scheduled_at } = parsed.data;

  // LINE UIDを取得（patientsテーブルから）
  const { data: patient } = await withTenant(
    supabaseAdmin.from("patients").select("line_id").eq("patient_id", patient_id),
    tenantId
  ).maybeSingle();

  const { data, error } = await supabaseAdmin
    .from("scheduled_messages")
    .insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: patient?.line_id || null,
      message_content: message,
      scheduled_at,
      created_by: "admin",
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ schedule: data });
}
