// バイタルサイン記録 API（管理画面カルテ用）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { vitalCreateSchema } from "@/lib/validations/vitals";
import { unauthorized, badRequest, serverError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// バイタル一覧取得（patient_id + tenant_id で時系列取得）
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);
    const patientId = new URL(req.url).searchParams.get("patient_id");

    if (!patientId) {
      return badRequest("patient_id は必須です");
    }

    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("patient_vitals")
        .select("*")
        .eq("patient_id", patientId)
        .order("measured_at", { ascending: false }),
      tenantId,
    );

    if (error) {
      // テーブル未作成時は空配列を返す
      if (error.message.includes("does not exist")) {
        return NextResponse.json({ ok: true, vitals: [] });
      }
      return serverError(error.message);
    }

    return NextResponse.json({ ok: true, vitals: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}

// バイタル新規記録
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, vitalCreateSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    // BMI自動計算（体重・身長があり、BMI未指定の場合）
    let bmi = body.bmi ?? null;
    if (bmi == null && body.weight_kg && body.height_cm && body.height_cm > 0) {
      const heightM = body.height_cm / 100;
      bmi = Math.round((body.weight_kg / (heightM * heightM)) * 10) / 10;
    }

    const insertData: Record<string, unknown> = {
      ...tenantPayload(tenantId),
      patient_id: body.patient_id,
      bmi,
    };

    // オプショナルフィールドを設定（undefinedのものは含めない）
    if (body.intake_id !== undefined) insertData.intake_id = body.intake_id;
    if (body.measured_at !== undefined) insertData.measured_at = body.measured_at;
    if (body.weight_kg !== undefined) insertData.weight_kg = body.weight_kg;
    if (body.height_cm !== undefined) insertData.height_cm = body.height_cm;
    if (body.systolic_bp !== undefined) insertData.systolic_bp = body.systolic_bp;
    if (body.diastolic_bp !== undefined) insertData.diastolic_bp = body.diastolic_bp;
    if (body.pulse !== undefined) insertData.pulse = body.pulse;
    if (body.temperature !== undefined) insertData.temperature = body.temperature;
    if (body.spo2 !== undefined) insertData.spo2 = body.spo2;
    if (body.respiratory_rate !== undefined) insertData.respiratory_rate = body.respiratory_rate;
    if (body.waist_cm !== undefined) insertData.waist_cm = body.waist_cm;
    if (body.notes !== undefined) insertData.notes = body.notes;

    const { data, error } = await supabaseAdmin
      .from("patient_vitals")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return serverError(error.message);
    }

    return NextResponse.json({ ok: true, vital: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
