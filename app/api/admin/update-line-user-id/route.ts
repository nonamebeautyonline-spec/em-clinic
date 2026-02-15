// app/api/admin/update-line-user-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json().catch(() => ({}));
    const patientId = body.patient_id || body.patientId || "";
    const lineUserId = body.line_user_id !== undefined ? String(body.line_user_id) : null;

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "patient_id required" }, { status: 400 });
    }

    if (lineUserId === null) {
      return NextResponse.json({ ok: false, error: "line_user_id required" }, { status: 400 });
    }

    // ★ patients テーブルの line_id を更新（intake の line_id は不要）
    const updateValue = lineUserId === "" ? null : lineUserId;

    const { error: patientsError } = await withTenant(
      supabaseAdmin
        .from("patients")
        .update({ line_id: updateValue })
        .eq("patient_id", patientId),
      tenantId
    );

    if (patientsError) {
      console.error(`[update-line-user-id] DB update error:`, patientsError.message);
      return NextResponse.json(
        { ok: false, error: "db_update_failed", detail: patientsError.message },
        { status: 500 }
      );
    }

    console.log(`[update-line-user-id] DB updated for patient ${patientId}: line_id=${lineUserId || "(null)"}`);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/update-line-user-id error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
