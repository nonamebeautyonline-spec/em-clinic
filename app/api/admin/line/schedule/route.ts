import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// 予約送信一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin.from("scheduled_messages").select("*").order("scheduled_at", { ascending: true }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data });
}

// 予約送信登録
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { patient_id, message, scheduled_at } = await req.json();
  if (!patient_id || !message?.trim() || !scheduled_at) {
    return NextResponse.json({ error: "patient_id, message, scheduled_at は必須です" }, { status: 400 });
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}
