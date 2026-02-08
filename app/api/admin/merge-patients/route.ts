// app/api/admin/merge-patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL;

// 統合対象テーブル一覧（patient_id カラムを持つテーブル）
const MERGE_TABLES = [
  "intake",
  "orders",
  "reservations",
  "reorders",
  "message_log",
  "patient_tags",
  "patient_marks",
  "friend_field_values",
] as const;

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const oldPatientId = body.old_patient_id || "";
    const newPatientId = body.new_patient_id || "";
    const deleteNewIntake = !!body.delete_new_intake; // 統合先の予約/問診を先に削除

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

    // ★ 統合先の予約/問診を先に削除（オプション）
    if (deleteNewIntake) {
      console.log(`[merge-patients] Deleting new patient data: ${newPatientId}`);

      const { error: delIntakeErr } = await supabaseAdmin
        .from("intake")
        .delete()
        .eq("patient_id", newPatientId);
      if (delIntakeErr) {
        console.error("[merge-patients] Delete new intake failed:", delIntakeErr.message);
      }

      const { error: delReservationsErr } = await supabaseAdmin
        .from("reservations")
        .delete()
        .eq("patient_id", newPatientId);
      if (delReservationsErr) {
        console.error("[merge-patients] Delete new reservations failed:", delReservationsErr.message);
      }

      // answerers も削除（統合元のデータで上書きするため）
      const { error: delAnswererErr } = await supabaseAdmin
        .from("answerers")
        .delete()
        .eq("patient_id", newPatientId);
      if (delAnswererErr) {
        console.error("[merge-patients] Delete new answerers failed:", delAnswererErr.message);
      }

      console.log(`[merge-patients] New patient data deleted: ${newPatientId}`);
    }

    // ★ 全テーブルの patient_id を一括更新
    const results: Record<string, string> = {};

    for (const table of MERGE_TABLES) {
      const { error, count } = await supabaseAdmin
        .from(table)
        .update({ patient_id: newPatientId })
        .eq("patient_id", oldPatientId);

      if (error) {
        console.error(`[merge-patients] Failed to update ${table}:`, error.message);
        results[table] = `error: ${error.message}`;
      } else {
        results[table] = `ok (${count ?? "?"} rows)`;
        console.log(`[merge-patients] ${table}: ${oldPatientId} -> ${newPatientId} (${count ?? "?"} rows)`);
      }
    }

    // ★ answerers統合: 統合元のline_id・個人情報を統合先に引き継ぎ
    const { data: oldAnswerer } = await supabaseAdmin
      .from("answerers")
      .select("line_id, name, name_kana, tel, sex, birthday")
      .eq("patient_id", oldPatientId)
      .maybeSingle();

    if (oldAnswerer) {
      const { data: newAnswerer } = await supabaseAdmin
        .from("answerers")
        .select("line_id, name, name_kana, tel, sex, birthday")
        .eq("patient_id", newPatientId)
        .maybeSingle();

      if (newAnswerer) {
        // 統合先が存在する場合: 統合元の値で空フィールドを埋める
        const merged = {
          line_id: newAnswerer.line_id || oldAnswerer.line_id || null,
          name: newAnswerer.name || oldAnswerer.name || null,
          name_kana: newAnswerer.name_kana || oldAnswerer.name_kana || null,
          tel: newAnswerer.tel || oldAnswerer.tel || null,
          sex: newAnswerer.sex || oldAnswerer.sex || null,
          birthday: newAnswerer.birthday || oldAnswerer.birthday || null,
        };
        await supabaseAdmin
          .from("answerers")
          .update(merged)
          .eq("patient_id", newPatientId);
        console.log(`[merge-patients] answerers merged into ${newPatientId}`);
      } else {
        // 統合先にanswerersがない場合: 統合元をそのまま移行
        await supabaseAdmin
          .from("answerers")
          .update({ patient_id: newPatientId })
          .eq("patient_id", oldPatientId);
        console.log(`[merge-patients] answerers moved: ${oldPatientId} -> ${newPatientId}`);
      }

      // 統合元のanswererを削除（重複防止）
      await supabaseAdmin
        .from("answerers")
        .delete()
        .eq("patient_id", oldPatientId);
    }

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

    console.log(`[merge-patients] Completed: ${oldPatientId} -> ${newPatientId}`, results);
    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/merge-patients error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
