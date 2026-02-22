import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { dateOverridePostSchema, dateOverrideDeleteSchema } from "@/lib/validations/admin-operations";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, dateOverridePostSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const override = body.override || body;

    const doctor_id = String(override.doctor_id || "").trim();
    const date = String(override.date || "").trim();

    if (!doctor_id || !date) {
      return NextResponse.json(
        { ok: false, error: "doctor_id and date required" },
        { status: 400 }
      );
    }

    // slot_name: 複数時間帯対応（例：午前、午後、夜間など）
    const slot_name = override.slot_name ? String(override.slot_name).trim() : null;

    const record = {
      doctor_id,
      date,
      type: override.type || "modify",
      slot_name,
      start_time: override.start_time || null,
      end_time: override.end_time || null,
      slot_minutes: override.slot_minutes === "" || override.slot_minutes == null
        ? null
        : Number(override.slot_minutes),
      capacity: override.capacity === "" || override.capacity == null
        ? null
        : Number(override.capacity),
      memo: override.memo || null,
      updated_at: new Date().toISOString(),
    };

    // まず既存レコードを削除してから挿入（upsertの代わり）
    // slot_nameがある場合は特定スロットのみ、ない場合は基本設定を対象
    let deleteQuery = supabaseAdmin
      .from("doctor_date_overrides")
      .delete()
      .eq("doctor_id", doctor_id)
      .eq("date", date);

    if (slot_name) {
      deleteQuery = deleteQuery.eq("slot_name", slot_name);
    } else {
      deleteQuery = deleteQuery.is("slot_name", null);
    }

    const { error: deleteError } = await withTenant(deleteQuery, tenantId);
    if (deleteError) {
      console.error("date_override delete error:", deleteError);
      // 削除エラーは無視（レコードがない場合もある）
    }

    // 新規挿入
    const { error: insertError } = await supabaseAdmin
      .from("doctor_date_overrides")
      .insert({ ...tenantPayload(tenantId), ...record });

    if (insertError) {
      console.error("date_override insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, override: record });
  } catch (error) {
    console.error("date_override POST error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, dateOverrideDeleteSchema);
    if ("error" in parsed) return parsed.error;
    const doctor_id = parsed.data.doctor_id;
    const date = parsed.data.date;
    const slot_name = parsed.data.slot_name ? String(parsed.data.slot_name).trim() : null;
    const delete_all = parsed.data.delete_all === true; // その日の全スロットを削除

    let query = supabaseAdmin
      .from("doctor_date_overrides")
      .delete()
      .eq("doctor_id", doctor_id)
      .eq("date", date);

    // delete_all: trueの場合は、その日の全スロットを削除
    // slot_nameが指定されている場合は、そのスロットのみ削除
    // slot_nameがnullでdelete_allがfalseの場合は、slot_nameがnullのレコードを削除
    if (!delete_all && slot_name) {
      query = query.eq("slot_name", slot_name);
    } else if (!delete_all) {
      query = query.is("slot_name", null);
    }

    const { error } = await withTenant(query, tenantId);

    if (error) {
      console.error("date_override delete error:", error);
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, deleted: { doctor_id, date, slot_name, delete_all } });
  } catch (error) {
    console.error("date_override DELETE error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
