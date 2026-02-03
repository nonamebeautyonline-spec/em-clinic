// app/api/doctor/reorders/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_REORDER_URL not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const id = body.id as string | number | undefined;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    const res = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id }),
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    if (!res.ok || json.ok === false) {
      return NextResponse.json(
        { ok: false, error: json.error || "GAS error" },
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
        console.error("[doctor/reorders/approve] Supabase update error:", dbError);
      } else {
        console.log(`[doctor/reorders/approve] Supabase update success, row=${id}`);

        // ★ キャッシュ削除
        if (reorderData?.patient_id) {
          await invalidateDashboardCache(reorderData.patient_id);
          console.log(`[doctor/reorders/approve] Cache invalidated for patient ${reorderData.patient_id}`);
        }
      }
    } catch (dbErr) {
      console.error("[doctor/reorders/approve] Supabase exception:", dbErr);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/doctor/reorders/approve error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
