// app/api/doctor/reorders/reject/route.ts
// DB-first: 却下処理
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { doctorReorderRejectSchema } from "@/lib/validations/doctor";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, doctorReorderRejectSchema);
    if ("error" in parsed) return parsed.error;
    const { id } = parsed.data;

    const reorderNumber = Number(id);

    // ★ DB-first: まずDBを更新
    const { data: reorderData, error: selectError } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, patient_id, status")
        .eq("reorder_number", reorderNumber)
        .single(),
      tenantId
    );

    if (selectError || !reorderData) {
      console.error("[doctor/reorders/reject] Reorder not found:", reorderNumber);
      return NextResponse.json(
        { ok: false, error: "reorder_not_found" },
        { status: 404 }
      );
    }

    if (reorderData.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: `invalid_status: ${reorderData.status}` },
        { status: 400 }
      );
    }

    const { error: updateError } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        })
        .eq("reorder_number", reorderNumber),
      tenantId
    );

    if (updateError) {
      console.error("[doctor/reorders/reject] DB update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    console.log(`[doctor/reorders/reject] DB update success, reorder_num=${reorderNumber}`);

    // ★ キャッシュ削除
    if (reorderData.patient_id) {
      await invalidateDashboardCache(reorderData.patient_id);
      console.log(`[doctor/reorders/reject] Cache invalidated for patient ${reorderData.patient_id}`);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/doctor/reorders/reject error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
