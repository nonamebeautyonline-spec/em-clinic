// app/api/admin/patient-name-change/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { patientNameChangeSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, patientNameChangeSchema);
    if ("error" in parsed) return parsed.error;
    const patientId = parsed.data.patient_id.trim();
    const newName = parsed.data.new_name.trim();
    const newNameKana = (parsed.data.new_name_kana || "").trim();
    const newBirthday = (parsed.data.new_birthday || "").trim();

    const results: Record<string, string> = {};

    // 1. 現在の answerers データ取得（変更前の記録用）
    const { data: currentAnswerer } = await strictWithTenant(
      supabaseAdmin
        .from("patients")
        .select("name, name_kana, birthday")
        .eq("patient_id", patientId)
        .maybeSingle(),
      tenantId
    );

    const previous = {
      name: currentAnswerer?.name || "",
      name_kana: currentAnswerer?.name_kana || "",
      birthday: currentAnswerer?.birthday || "",
    };

    // 2. patients.name, name_kana, birthday を更新
    if (currentAnswerer) {
      const updateData: Record<string, string> = { name: newName, name_kana: newNameKana };
      if (newBirthday) {
        updateData.birthday = newBirthday;
      }
      const { error: answererErr } = await strictWithTenant(
        supabaseAdmin
          .from("patients")
          .update(updateData)
          .eq("patient_id", patientId),
        tenantId
      );
      results.answerers = answererErr ? `error: ${answererErr.message}` : "ok";
    } else {
      results.answerers = "skipped (no record)";
    }

    // 3. intake.answers JSONB の氏名・カナキーを全レコード更新
    //    Supabase JS は jsonb_set 非対応のため、fetch→merge→update by id
    const { data: intakeRows } = await strictWithTenant(
      supabaseAdmin
        .from("intake")
        .select("id, answers")
        .eq("patient_id", patientId),
      tenantId
    );

    let answersUpdated = 0;
    let answersErrors = 0;
    for (const row of intakeRows || []) {
      const answers = (row.answers as Record<string, unknown>) || {};
      const updatedAnswers: Record<string, unknown> = {
        ...answers,
        "氏名": newName,
        name: newName,
        "カナ": newNameKana,
        name_kana: newNameKana,
      };
      if (newBirthday) {
        updatedAnswers["生年月日"] = newBirthday;
        updatedAnswers["birth"] = newBirthday;
      }

      const { error } = await strictWithTenant(
        supabaseAdmin
          .from("intake")
          .update({ answers: updatedAnswers })
          .eq("id", row.id),
        tenantId
      );

      if (error) answersErrors++;
      else answersUpdated++;
    }
    results.intake_answers = answersErrors > 0
      ? `partial: ${answersUpdated} ok, ${answersErrors} errors`
      : `ok (${answersUpdated} rows)`;

    // 5. reservations.patient_name を全レコード更新
    const { error: reservErr, count: reservCount } = await strictWithTenant(
      supabaseAdmin
        .from("reservations")
        .update({ patient_name: newName })
        .eq("patient_id", patientId),
      tenantId
    );
    results.reservations = reservErr
      ? `error: ${reservErr.message}`
      : `ok (${reservCount ?? "?"} rows)`;

    console.log(
      `[patient-name-change] ${patientId}: "${previous.name}" -> "${newName}", kana: "${previous.name_kana}" -> "${newNameKana}", birthday: "${previous.birthday}" -> "${newBirthday}"`,
      results
    );

    logAudit(req, "patient.name_change", "patient", String(patientId));
    return NextResponse.json({ ok: true, results, previous });
  } catch (err) {
    console.error("POST /api/admin/patient-name-change error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
