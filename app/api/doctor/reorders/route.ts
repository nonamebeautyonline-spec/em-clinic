// app/api/doctor/reorders/route.ts
// DB-first: 再処方一覧をDBから取得
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    const { data, error } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, reorder_number, patient_id, product_code, status, created_at, approved_at, rejected_at")
        .order("created_at", { ascending: false }),
      tenantId
    );

    if (error) {
      console.error("[doctor/reorders] DB error:", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    // レスポンス形式に変換
    const reorders = (data || []).map((r) => ({
      id: r.reorder_number, // UIはreorder_numberを使用
      dbId: r.id,
      patient_id: r.patient_id,
      product_code: r.product_code,
      status: r.status,
      timestamp: r.created_at,
      approved_at: r.approved_at,
      rejected_at: r.rejected_at,
    }));

    return NextResponse.json(
      { ok: true, reorders },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/doctor/reorders error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
