// app/api/admin/update-line-user-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateLineUserIdSchema } from "@/lib/validations/admin-operations";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const parsed = await parseBody(req, updateLineUserIdSchema);
    if ("error" in parsed) return parsed.error;
    const patientId = parsed.data.patient_id || parsed.data.patientId || "";
    const lineUserId = String(parsed.data.line_user_id);

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
