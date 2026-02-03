// app/api/reorder/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      console.error("GAS_REORDER_URL missing");
      return NextResponse.json(
        { ok: false, error: "server_config_error" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";
    const lineUid =
      cookieStore.get("__Host-line_user_id")?.value ||
      cookieStore.get("line_user_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const productCode = body.productCode as string | undefined;
    if (!productCode) {
      return NextResponse.json({ ok: false, error: "productCode_required" }, { status: 400 });
    }

    // ★ GASに書き込み（既存処理）
    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        patient_id: patientId,
        product_code: productCode,
      }),
      cache: "no-store",
    });

    const text = await gasRes.text().catch(() => "");
    let gasJson: any = {};
    try {
      gasJson = text ? JSON.parse(text) : {};
    } catch {
      gasJson = {};
    }

    if (!gasRes.ok || gasJson.ok === false) {
      console.error("GAS reorder apply error:", gasRes.status);
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    // ★ Supabaseにも書き込み（並列管理）
    try {
      // GASから行番号が返される場合はそれを使用、なければDBの最大値+1
      let rowNumber = gasJson.rowNumber;
      if (!rowNumber) {
        const { data: maxRow } = await supabaseAdmin
          .from("reorders")
          .select("gas_row_number")
          .order("gas_row_number", { ascending: false })
          .limit(1)
          .single();
        rowNumber = (maxRow?.gas_row_number || 1) + 1;
      }

      const { error: dbError } = await supabaseAdmin
        .from("reorders")
        .insert({
          patient_id: patientId,
          product_code: productCode,
          status: "pending",
          line_uid: lineUid || null,
          gas_row_number: rowNumber,
        });

      if (dbError) {
        console.error("[reorder/apply] Supabase insert error:", dbError);
      } else {
        console.log(`[reorder/apply] Supabase insert success, row=${rowNumber}`);
      }
    } catch (dbErr) {
      console.error("[reorder/apply] Supabase exception:", dbErr);
    }

    // ★ キャッシュ削除（再処方申請時）
    await invalidateDashboardCache(patientId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    console.error("POST /api/reorder/apply error");
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
