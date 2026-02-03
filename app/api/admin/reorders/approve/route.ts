import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { error: "GAS_REORDER_URL is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { id } = body; // id = GAS行番号 = gas_row_number

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // ★ GASで承認（既存処理）
    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        id: id,
      }),
      cache: "no-store",
    });

    const gasText = await gasRes.text().catch(() => "");
    let gasJson: any = {};
    try {
      gasJson = gasText ? JSON.parse(gasText) : {};
    } catch {
      gasJson = {};
    }

    if (!gasRes.ok || gasJson.ok === false) {
      console.error("GAS reorder approve error:", gasJson.error || gasRes.status);
      return NextResponse.json(
        { error: gasJson.error || "GAS error" },
        { status: 500 }
      );
    }

    // ★ Supabaseも更新（gas_row_numberでマッチング）
    try {
      // まずpatient_idを取得
      const { data: reorderData } = await supabaseAdmin
        .from("reorders")
        .select("patient_id")
        .eq("gas_row_number", Number(id))
        .single();

      const { error: dbError } = await supabaseAdmin
        .from("reorders")
        .update({
          status: "confirmed",
          approved_at: new Date().toISOString(),
        })
        .eq("gas_row_number", Number(id));

      if (dbError) {
        console.error("[admin/reorders/approve] Supabase update error:", dbError);
      } else {
        console.log(`[admin/reorders/approve] Supabase update success, row=${id}`);

        // ★ キャッシュ削除
        if (reorderData?.patient_id) {
          await invalidateDashboardCache(reorderData.patient_id);
          console.log(`[admin/reorders/approve] Cache invalidated for patient ${reorderData.patient_id}`);
        }
      }
    } catch (dbErr) {
      console.error("[admin/reorders/approve] Supabase exception:", dbErr);
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
