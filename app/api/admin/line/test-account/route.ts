// テスト送信アカウント設定API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting, deleteSetting } from "@/lib/settings";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// テスト送信アカウント取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const patientId = await getSetting("line", "test_send_patient_id", tenantId ?? undefined);
  if (!patientId) {
    return NextResponse.json({ patient_id: null, patient_name: null, has_line_uid: false });
  }

  // 患者情報取得
  const { data: patient } = await withTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patientId),
    tenantId
  ).maybeSingle();

  return NextResponse.json({
    patient_id: patientId,
    patient_name: patient?.name || "",
    has_line_uid: !!patient?.line_id,
  });
}

// テスト送信アカウント設定
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const body = await req.json();
  const patientId = body.patient_id?.trim();
  if (!patientId) {
    return NextResponse.json({ error: "patient_idは必須です" }, { status: 400 });
  }

  // 患者存在確認
  const { data: patient } = await withTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patientId),
    tenantId
  ).maybeSingle();

  if (!patient) {
    return NextResponse.json({ error: "患者が見つかりません" }, { status: 404 });
  }

  // 設定保存
  const ok = await setSetting("line", "test_send_patient_id", patientId, tenantId ?? undefined);
  if (!ok) {
    return NextResponse.json({ error: "設定の保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    patient_id: patientId,
    patient_name: patient.name || "",
    has_line_uid: !!patient.line_id,
  });
}

// テスト送信アカウント解除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  await deleteSetting("line", "test_send_patient_id", tenantId ?? undefined);

  return NextResponse.json({ ok: true });
}
