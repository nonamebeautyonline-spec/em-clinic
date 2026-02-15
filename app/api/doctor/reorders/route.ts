// app/api/doctor/reorders/route.ts
// DB-first: 再処方一覧をDBから取得
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from("reorders")
      .select("id, gas_row_number, patient_id, product_code, status, created_at, approved_at, rejected_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[doctor/reorders] DB error:", error);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    // GASフォーマットに合わせて変換
    const reorders = (data || []).map((r) => ({
      id: r.gas_row_number, // UIはgas_row_numberを使用
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
