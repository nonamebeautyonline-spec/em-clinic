// app/api/reservations/waitlist/route.ts — キャンセル待ちAPI
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST: キャンセル待ち登録
export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const body = await req.json();

    const { patient_id, target_date, target_time, slot_id, line_uid } = body;

    if (!patient_id || !target_date) {
      return badRequest("patient_id と target_date は必須です");
    }

    // 日付形式チェック
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
      return badRequest("target_date は YYYY-MM-DD 形式で指定してください");
    }

    const { data, error } = await supabaseAdmin
      .from("reservation_waitlist")
      .insert({
        patient_id,
        target_date,
        target_time: target_time || null,
        slot_id: slot_id || null,
        line_uid: line_uid || null,
        status: "waiting",
        ...tenantPayload(tenantId),
      })
      .select()
      .single();

    if (error) {
      // UNIQUE制約違反 → 既に登録済み
      if (error.code === "23505") {
        return NextResponse.json(
          { ok: false, error: "ALREADY_REGISTERED", message: "既にキャンセル待ちに登録済みです" },
          { status: 409 }
        );
      }
      console.error("[waitlist] 登録エラー:", error);
      return serverError("キャンセル待ちの登録に失敗しました");
    }

    return NextResponse.json({ ok: true, waitlist: data }, { status: 201 });
  } catch (err) {
    console.error("[waitlist] POST エラー:", err);
    return serverError("キャンセル待ちの登録に失敗しました");
  }
}

// GET: キャンセル待ち一覧取得
export async function GET(req: NextRequest) {
  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id");

    if (!patientId) {
      return badRequest("patient_id は必須です");
    }

    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_waitlist")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      tenantId
    );

    if (error) {
      console.error("[waitlist] 取得エラー:", error);
      return serverError("キャンセル待ちの取得に失敗しました");
    }

    return NextResponse.json({ ok: true, waitlist: data ?? [] });
  } catch (err) {
    console.error("[waitlist] GET エラー:", err);
    return serverError("キャンセル待ちの取得に失敗しました");
  }
}

// DELETE: キャンセル待ちキャンセル
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const { searchParams } = new URL(req.url);
    const waitlistId = searchParams.get("id");

    if (!waitlistId) {
      return badRequest("id は必須です");
    }

    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_waitlist")
        .update({ status: "cancelled" })
        .eq("id", waitlistId),
      tenantId
    );

    if (error) {
      console.error("[waitlist] キャンセルエラー:", error);
      return serverError("キャンセル待ちのキャンセルに失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waitlist] DELETE エラー:", err);
    return serverError("キャンセル待ちのキャンセルに失敗しました");
  }
}
