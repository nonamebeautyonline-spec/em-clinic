// app/api/admin/merge-patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const GAS_INTAKE_URL = process.env.GAS_MYPAGE_URL; // intake GAS (問診マスター)
const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL; // Square Webhook GAS (のなめマスター)

export async function POST(req: NextRequest) {
  try {
    // ★ ADMIN_TOKEN チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const oldPatientId = body.old_patient_id || "";
    const newPatientId = body.new_patient_id || "";

    if (!oldPatientId || !newPatientId) {
      return NextResponse.json(
        { ok: false, error: "old_patient_id and new_patient_id required" },
        { status: 400 }
      );
    }

    if (oldPatientId === newPatientId) {
      return NextResponse.json(
        { ok: false, error: "old_patient_id and new_patient_id must be different" },
        { status: 400 }
      );
    }

    if (!GAS_INTAKE_URL) {
      console.error("[merge-patients] GAS_INTAKE_URL not configured");
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

    // ★ GAS merge_patients を呼び出し
    const gasResponse = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "merge_patients",
        old_patient_id: oldPatientId,
        new_patient_id: newPatientId,
      }),
      signal: AbortSignal.timeout(120000),
    });

    const gasText = await gasResponse.text().catch(() => "");
    let gasData: any = {};

    try {
      gasData = gasText ? JSON.parse(gasText) : {};
    } catch {
      console.error("[merge-patients] GAS returned invalid JSON");
      return NextResponse.json({ ok: false, error: "gas_invalid_response" }, { status: 500 });
    }

    if (!gasResponse.ok || !gasData.ok) {
      console.error(`[merge-patients] GAS error:`, gasData);
      return NextResponse.json(
        { ok: false, error: gasData.error || "gas_merge_failed" },
        { status: gasResponse.ok ? 200 : gasResponse.status }
      );
    }

    console.log(`[merge-patients] GAS intake merged: ${oldPatientId} -> ${newPatientId}`);

    // ★ Square Webhook GAS (のなめマスター) の patient_id を更新
    if (GAS_ADMIN_URL) {
      try {
        const squareGasResponse = await fetch(GAS_ADMIN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "merge_patients",
            old_patient_id: oldPatientId,
            new_patient_id: newPatientId,
          }),
          signal: AbortSignal.timeout(120000),
        });

        const squareGasText = await squareGasResponse.text().catch(() => "");
        let squareGasData: any = {};

        try {
          squareGasData = squareGasText ? JSON.parse(squareGasText) : {};
        } catch {
          console.error("[merge-patients] Square Webhook GAS returned invalid JSON");
        }

        if (squareGasResponse.ok && squareGasData.ok) {
          console.log(`[merge-patients] Square Webhook GAS (のなめマスター) merged: ${oldPatientId} -> ${newPatientId}`);
        } else {
          console.error(`[merge-patients] Square Webhook GAS error:`, squareGasData);
        }
      } catch (err) {
        console.error(`[merge-patients] Square Webhook GAS call failed:`, err);
        // のなめマスター更新失敗は警告のみ（統合処理は継続）
      }
    } else {
      console.log("[merge-patients] GAS_ADMIN_URL not configured, skipping のなめマスター update");
    }

    // ★ Supabase intakesテーブルの旧patient_idを新patient_idに置き換え
    const { error: intakesError } = await supabase
      .from("intakes")
      .update({ patient_id: newPatientId })
      .eq("patient_id", oldPatientId);

    if (intakesError) {
      console.error(`[merge-patients] Failed to update intakes:`, intakesError);
      return NextResponse.json(
        { ok: false, error: "db_intakes_update_failed", detail: intakesError.message },
        { status: 500 }
      );
    }

    console.log(`[merge-patients] DB intakes: Updated patient_id ${oldPatientId} -> ${newPatientId}`);

    // ★ Supabase ordersテーブルの旧patient_idを新patient_idに置き換え
    const { error: ordersError } = await supabase
      .from("orders")
      .update({ patient_id: newPatientId })
      .eq("patient_id", oldPatientId);

    if (ordersError) {
      console.error(`[merge-patients] Failed to update orders:`, ordersError);
      return NextResponse.json(
        { ok: false, error: "db_orders_update_failed", detail: ordersError.message },
        { status: 500 }
      );
    }

    console.log(`[merge-patients] DB orders: Updated patient_id ${oldPatientId} -> ${newPatientId}`);

    // ★ Supabase reservationsテーブルの旧patient_idを新patient_idに置き換え
    const { error: reservationsError } = await supabase
      .from("reservations")
      .update({ patient_id: newPatientId })
      .eq("patient_id", oldPatientId);

    if (reservationsError) {
      console.error(`[merge-patients] Failed to update reservations:`, reservationsError);
      return NextResponse.json(
        { ok: false, error: "db_reservations_update_failed", detail: reservationsError.message },
        { status: 500 }
      );
    }

    console.log(`[merge-patients] DB reservations: Updated patient_id ${oldPatientId} -> ${newPatientId}`);

    console.log(`[merge-patients] Completed: ${oldPatientId} -> ${newPatientId}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/merge-patients error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
