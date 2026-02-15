// app/api/repair/route.ts
// 個人情報消失した患者の再入力API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const patientId =
      req.cookies.get("__Host-patient_id")?.value ||
      req.cookies.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json().catch(() => ({} as Record<string, string>));
    const { name_kana, sex, birth, tel } = body;

    if (!name_kana || !sex || !birth || !tel) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // 1. intake.answers を更新（既存をマージ）
    const { data: intake } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("answers")
        .eq("patient_id", patientId),
      tenantId
    ).maybeSingle();

    const existingAnswers = (intake?.answers as Record<string, unknown>) || {};
    const updatedAnswers = {
      ...existingAnswers,
      カナ: name_kana,
      name_kana: name_kana,
      性別: sex,
      sex: sex,
      生年月日: birth,
      birth: birth,
      電話番号: tel,
      tel: tel,
    };

    const { error: intakeError } = await withTenant(
      supabaseAdmin
        .from("intake")
        .update({ answers: updatedAnswers })
        .eq("patient_id", patientId),
      tenantId
    );

    if (intakeError) {
      console.error("[repair] intake update error:", intakeError.message);
      return NextResponse.json({ ok: false, error: "intake_update_failed" }, { status: 500 });
    }

    // 2. answerers テーブルも更新
    const { error: answererError } = await supabaseAdmin
      .from("patients")
      .upsert({
        patient_id: patientId,
        name_kana: name_kana,
        sex: sex,
        birthday: birth,
        tel: tel,
        ...tenantPayload(tenantId),
      }, { onConflict: "patient_id" });

    if (answererError) {
      console.error("[repair] answerers update error:", answererError.message);
    }

    // 3. キャッシュ削除
    await invalidateDashboardCache(patientId);

    console.log(`[repair] Updated personal info for ${patientId}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[repair] Error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
