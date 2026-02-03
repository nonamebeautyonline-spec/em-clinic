// app/api/reorder/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(_req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_REORDER_URL is not configured" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: no patient_id cookie" },
        { status: 401 }
      );
    }

    // ★ GASでキャンセル（既存処理）
    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        patient_id: patientId,
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
      console.error("GAS reorder cancel error:", gasRes.status);
      return NextResponse.json(
        { ok: false, error: gasJson.error || "GAS error" },
        { status: 500 }
      );
    }

    // ★ Supabaseも更新（並列管理）
    // 注: updateでは.order()/.limit()が効かないので、最新のpendingを先に取得
    try {
      // まず最新のpendingレコードを取得
      const { data: latestPending, error: selectError } = await supabaseAdmin
        .from("reorders")
        .select("id, gas_row_number")
        .eq("patient_id", patientId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (selectError || !latestPending) {
        console.log("[reorder/cancel] No pending reorder found in DB:", selectError?.message);
      } else {
        // gas_row_numberでupdateを実行
        const { error: dbError } = await supabaseAdmin
          .from("reorders")
          .update({
            status: "cancelled",
          })
          .eq("gas_row_number", latestPending.gas_row_number);

        if (dbError) {
          console.error("[reorder/cancel] Supabase update error:", dbError);
        } else {
          console.log(`[reorder/cancel] Supabase update success, row=${latestPending.gas_row_number}`);
        }
      }
    } catch (dbErr) {
      console.error("[reorder/cancel] Supabase exception:", dbErr);
    }

    // ★ キャッシュ削除（再処方キャンセル時）
    await invalidateDashboardCache(patientId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/reorder/cancel error", e);
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}
