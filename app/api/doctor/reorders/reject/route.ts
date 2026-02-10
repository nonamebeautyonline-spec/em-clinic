// app/api/doctor/reorders/reject/route.ts
// DB-first: 却下処理
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id as string | number | undefined;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    const gasRowNumber = Number(id);

    // ★ DB-first: まずDBを更新
    const { data: reorderData, error: selectError } = await supabaseAdmin
      .from("reorders")
      .select("id, patient_id, status")
      .eq("gas_row_number", gasRowNumber)
      .single();

    if (selectError || !reorderData) {
      console.error("[doctor/reorders/reject] Reorder not found:", gasRowNumber);
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

    const { error: updateError } = await supabaseAdmin
      .from("reorders")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
      })
      .eq("gas_row_number", gasRowNumber);

    if (updateError) {
      console.error("[doctor/reorders/reject] DB update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    console.log(`[doctor/reorders/reject] DB update success, gas_row=${gasRowNumber}`);

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
