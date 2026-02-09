// app/api/admin/patient-name-change/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const patientId = (body.patient_id || "").trim();
    const newName = (body.new_name || "").trim();
    const newNameKana = (body.new_name_kana || "").trim();

    if (!patientId || !newName) {
      return NextResponse.json(
        { ok: false, error: "patient_id and new_name are required" },
        { status: 400 }
      );
    }

    const results: Record<string, string> = {};

    // 1. 現在の answerers データ取得（変更前の記録用）
    const { data: currentAnswerer } = await supabaseAdmin
      .from("answerers")
      .select("name, name_kana")
      .eq("patient_id", patientId)
      .maybeSingle();

    const previous = {
      name: currentAnswerer?.name || "",
      name_kana: currentAnswerer?.name_kana || "",
    };

    // 2. answerers.name, answerers.name_kana を更新
    if (currentAnswerer) {
      const { error: answererErr } = await supabaseAdmin
        .from("answerers")
        .update({ name: newName, name_kana: newNameKana })
        .eq("patient_id", patientId);
      results.answerers = answererErr ? `error: ${answererErr.message}` : "ok";
    } else {
      results.answerers = "skipped (no record)";
    }

    // 3. intake.patient_name を全レコード更新
    const { error: intakeNameErr, count: intakeNameCount } = await supabaseAdmin
      .from("intake")
      .update({ patient_name: newName })
      .eq("patient_id", patientId);
    results.intake_patient_name = intakeNameErr
      ? `error: ${intakeNameErr.message}`
      : `ok (${intakeNameCount ?? "?"} rows)`;

    // 4. intake.answers JSONB の氏名・カナキーを全レコード更新
    //    Supabase JS は jsonb_set 非対応のため、fetch→merge→update by id
    const { data: intakeRows } = await supabaseAdmin
      .from("intake")
      .select("id, answers")
      .eq("patient_id", patientId);

    let answersUpdated = 0;
    let answersErrors = 0;
    for (const row of intakeRows || []) {
      const answers = (row.answers as Record<string, unknown>) || {};
      const updatedAnswers = {
        ...answers,
        "氏名": newName,
        name: newName,
        "カナ": newNameKana,
        name_kana: newNameKana,
      };

      const { error } = await supabaseAdmin
        .from("intake")
        .update({ answers: updatedAnswers })
        .eq("id", row.id);

      if (error) answersErrors++;
      else answersUpdated++;
    }
    results.intake_answers = answersErrors > 0
      ? `partial: ${answersUpdated} ok, ${answersErrors} errors`
      : `ok (${answersUpdated} rows)`;

    // 5. reservations.patient_name を全レコード更新
    const { error: reservErr, count: reservCount } = await supabaseAdmin
      .from("reservations")
      .update({ patient_name: newName })
      .eq("patient_id", patientId);
    results.reservations = reservErr
      ? `error: ${reservErr.message}`
      : `ok (${reservCount ?? "?"} rows)`;

    console.log(
      `[patient-name-change] ${patientId}: "${previous.name}" -> "${newName}", kana: "${previous.name_kana}" -> "${newNameKana}"`,
      results
    );

    return NextResponse.json({ ok: true, results, previous });
  } catch (err) {
    console.error("POST /api/admin/patient-name-change error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
