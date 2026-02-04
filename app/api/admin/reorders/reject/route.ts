// DB-only: 再処方却下（GAS不要）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body; // id = gas_row_number

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // まずpatient_idを取得
    const { data: reorderData, error: fetchError } = await supabaseAdmin
      .from("reorders")
      .select("id, patient_id, status")
      .eq("gas_row_number", Number(id))
      .single();

    if (fetchError || !reorderData) {
      console.error("[admin/reorders/reject] Reorder not found:", id);
      return NextResponse.json({ error: "Reorder not found" }, { status: 404 });
    }

    // ステータス更新
    const { error: dbError } = await supabaseAdmin
      .from("reorders")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
      })
      .eq("gas_row_number", Number(id));

    if (dbError) {
      console.error("[admin/reorders/reject] DB update error:", dbError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log(`[admin/reorders/reject] Rejected: gas_row=${id}, patient=${reorderData.patient_id}`);

    // キャッシュ削除
    if (reorderData.patient_id) {
      await invalidateDashboardCache(reorderData.patient_id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
