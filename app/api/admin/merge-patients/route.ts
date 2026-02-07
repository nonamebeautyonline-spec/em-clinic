// app/api/admin/merge-patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
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

    // ★ DB先行: Supabase intakesテーブルの旧patient_idを新patient_idに置き換え
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

    // ★ Supabase ordersテーブル
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

    // ★ Supabase reservationsテーブル
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

    // ★ GAS同期（非同期・失敗してもログのみ）
    if (GAS_MYPAGE_URL) {
      fetch(GAS_MYPAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "merge_patients",
          old_patient_id: oldPatientId,
          new_patient_id: newPatientId,
        }),
        signal: AbortSignal.timeout(120000),
      }).then(async (res) => {
        const text = await res.text().catch(() => "");
        if (res.ok) console.log(`[merge-patients] GAS intake synced: ${oldPatientId} -> ${newPatientId}`);
        else console.error("[merge-patients] GAS intake sync failed (non-blocking):", text);
      }).catch((e) => console.error("[merge-patients] GAS intake sync error (non-blocking):", e));
    }

    if (GAS_ADMIN_URL) {
      fetch(GAS_ADMIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "merge_patients",
          old_patient_id: oldPatientId,
          new_patient_id: newPatientId,
        }),
        signal: AbortSignal.timeout(120000),
      }).then(async (res) => {
        const text = await res.text().catch(() => "");
        if (res.ok) console.log(`[merge-patients] GAS admin synced: ${oldPatientId} -> ${newPatientId}`);
        else console.error("[merge-patients] GAS admin sync failed (non-blocking):", text);
      }).catch((e) => console.error("[merge-patients] GAS admin sync error (non-blocking):", e));
    }

    console.log(`[merge-patients] Completed: ${oldPatientId} -> ${newPatientId}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/merge-patients error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
