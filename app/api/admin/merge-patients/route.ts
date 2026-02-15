// app/api/admin/merge-patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

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

    const tenantId = resolveTenantId(req);

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

      const { error: delIntakeErr } = await withTenant(supabaseAdmin
        .from("intake")
        .delete()
        .eq("patient_id", newPatientId), tenantId);
      if (delIntakeErr) {
        console.error("[merge-patients] Delete new intake failed:", delIntakeErr.message);
      }

      const { error: delReservationsErr } = await withTenant(supabaseAdmin
        .from("reservations")
        .delete()
        .eq("patient_id", newPatientId), tenantId);
      if (delReservationsErr) {
        console.error("[merge-patients] Delete new reservations failed:", delReservationsErr.message);
      }

      // answerers も削除（統合元のデータで上書きするため）
      const { error: delAnswererErr } = await withTenant(supabaseAdmin
        .from("patients")
        .delete()
        .eq("patient_id", newPatientId), tenantId);
      if (delAnswererErr) {
        console.error("[merge-patients] Delete new answerers failed:", delAnswererErr.message);
      }

      console.log(`[merge-patients] New patient data deleted: ${newPatientId}`);
    }

    // ★ 全テーブルの patient_id を一括更新
    const results: Record<string, string> = {};

    for (const table of MERGE_TABLES) {
      const { error, count } = await withTenant(supabaseAdmin
        .from(table)
        .update({ patient_id: newPatientId })
        .eq("patient_id", oldPatientId), tenantId);

      if (error) {
        console.error(`[merge-patients] Failed to update ${table}:`, error.message);
        results[table] = `error: ${error.message}`;
      } else {
        results[table] = `ok (${count ?? "?"} rows)`;
        console.log(`[merge-patients] ${table}: ${oldPatientId} -> ${newPatientId} (${count ?? "?"} rows)`);
      }
    }

    // ★ answerers統合: 統合元のline_id・個人情報を統合先に引き継ぎ
    const { data: oldAnswerer } = await withTenant(supabaseAdmin
      .from("patients")
      .select("line_id, name, name_kana, tel, sex, birthday")
      .eq("patient_id", oldPatientId), tenantId)
      .maybeSingle();

    if (oldAnswerer) {
      const { data: newAnswerer } = await withTenant(supabaseAdmin
        .from("patients")
        .select("line_id, name, name_kana, tel, sex, birthday")
        .eq("patient_id", newPatientId), tenantId)
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
        await withTenant(supabaseAdmin
          .from("patients")
          .update(merged)
          .eq("patient_id", newPatientId), tenantId);
        console.log(`[merge-patients] answerers merged into ${newPatientId}`);
      } else {
        // 統合先にanswerersがない場合: 統合元をそのまま移行
        await withTenant(supabaseAdmin
          .from("patients")
          .update({ patient_id: newPatientId })
          .eq("patient_id", oldPatientId), tenantId);
        console.log(`[merge-patients] answerers moved: ${oldPatientId} -> ${newPatientId}`);
      }

      // 統合元のanswererを削除（重複防止）
      await withTenant(supabaseAdmin
        .from("patients")
        .delete()
        .eq("patient_id", oldPatientId), tenantId);
    }

    console.log(`[merge-patients] Completed: ${oldPatientId} -> ${newPatientId}`, results);
    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/merge-patients error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
