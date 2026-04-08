// app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { invalidateDashboardCache, invalidateFriendsListCache } from "@/lib/redis";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";
import { normalizeJPPhone } from "@/lib/phone";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { MERGE_TABLES } from "@/lib/merge-tables";
import { getBusinessRules } from "@/lib/business-rules";
import { parseBody } from "@/lib/validations/helpers";
import { intakeSchema } from "@/lib/validations/patient";
import { isMultiFieldEnabled, getDefaultMedicalField } from "@/lib/medical-fields";

// ★ Supabase書き込みリトライ機能
async function retrySupabaseWrite<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`[Supabase Retry] Success on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[Supabase Retry] Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        const delay = delayMs * attempt; // 指数バックオフ
        console.log(`[Supabase Retry] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const parsed = await parseBody(req, intakeSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    const session = await verifyPatientSession(req);
    if (!session) return unauthorized();
    const patientId = session.patientId;

    const answersObj = body.answers || {};

    // ★ field_id（診療分野）の解決
    // bodyにfield_idがあればそれを使用、なければデフォルト分野
    let fieldId: string | null = null;
    try {
      const rawBody = await req.clone().json();
      fieldId = rawBody.field_id || null;
    } catch { /* ignore */ }

    // マルチ分野モードの場合、field_id が必要
    const multiField = await isMultiFieldEnabled(tenantId);
    if (!fieldId && multiField) {
      const defaultField = await getDefaultMedicalField(tenantId);
      fieldId = defaultField?.id ?? null;
    }

    // every_time分野の判定（毎回新規INSERTする）
    let isEveryTime = false;
    if (multiField && fieldId) {
      const { getMedicalFieldById, resolveFlowConfig } = await import("@/lib/medical-fields");
      const fieldDef = await getMedicalFieldById(fieldId);
      if (fieldDef) {
        const fc = resolveFlowConfig(fieldDef.flow_config);
        isEveryTime = fc.intake_frequency === "every_time";
      }
    }

    // ★ デバッグログ：bodyの構造を確認
    console.log("[Intake Debug] patientId:", patientId);
    console.log("[Intake Debug] body keys:", Object.keys(body));
    console.log("[Intake Debug] answersObj keys:", Object.keys(answersObj));
    console.log("[Intake Debug] body.name:", body.name);
    console.log("[Intake Debug] body.answerer_id:", body.answerer_id);

    // answersから個人情報を抽出
    const name = body.name || answersObj.氏名 || answersObj.name || "";
    const sex = body.sex || answersObj.性別 || answersObj.sex || "";
    const birth = body.birth || answersObj.生年月日 || answersObj.birth || "";
    const nameKana = body.name_kana || body.nameKana || answersObj.カナ || answersObj.name_kana || "";
    const tel = normalizeJPPhone(String(body.tel || body.phone || answersObj.電話番号 || answersObj.tel || ""));
    const email = body.email || answersObj.メールアドレス || answersObj.email || "";
    const lineId = body.line_id || body.lineId || answersObj.line_id || "";
    const answererId = body.answerer_id || answersObj.answerer_id || null;

    // ★ デバッグログ：抽出後の値を確認
    console.log("[Intake Debug] Extracted - name:", name, "sex:", sex, "answererId:", answererId);

    // ★ Supabase に並列書き込み
    const [supabaseIntakeResult, supabaseAnswererResult] = await Promise.allSettled([
      // 1. Supabase intakeテーブルに書き込み（リトライあり）
      retrySupabaseWrite(async () => {
        // ★ supabaseAdmin を使う（anon key だと RLS で読めず null になる）
        // ★ 複数 intake レコード対策: 問診本体（reserve_id あり）を優先取得
        //   カルテレコード（note が "再処方" 始まり）の方が created_at が古い場合があるため
        let intakeQuery = strictWithTenant(
          supabaseAdmin
            .from("intake")
            .select("id, answers, reserve_id, status, note, field_id")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(10),
          tenantId
        );
        // マルチ分野モード: 同じ分野のintakeのみ検索
        if (multiField && fieldId) {
          intakeQuery = intakeQuery.eq("field_id", fieldId);
        }
        const { data: intakeRows } = await intakeQuery;
        // every_time分野では既存レコードを使わず常に新規INSERT
        const existingRecord = isEveryTime ? null
          : (intakeRows?.find(r => r.reserve_id != null)
            ?? intakeRows?.find(r => !(r.note || "").startsWith("再処方"))
            ?? null);

        // ★ 既存answersとマージ — 問診フォームは個人情報を送らないため、
        //   既存の個人情報（カナ,性別,生年月日,電話番号）を保持する
        const existingAnswers = (existingRecord?.answers as Record<string, unknown>) || {};
        const mergedAnswers = {
          ...existingAnswers,   // 既存の値を下地に
          ...answersObj,        // 新しい問診回答で上書き
          // 個人情報は実際に値がある場合のみ上書き（空文字で既存を消さない）
          ...(name ? { 氏名: name, name } : {}),
          ...(sex ? { 性別: sex, sex } : {}),
          ...(birth ? { 生年月日: birth, birth } : {}),
          ...(nameKana ? { カナ: nameKana, name_kana: nameKana } : {}),
          ...(tel ? { 電話番号: tel, tel } : {}),
          ...(email ? { メールアドレス: email, email } : {}),
        };

        // patient_idユニーク制約なしのため select→insert/update パターン
        // ★ 冗長カラム (patient_name, line_id, reserved_date, reserved_time, prescription_menu) は
        //   patients / reservations テーブルが正のため書き込み不要
        const intakePayload = {
            answerer_id: answererId,
            reserve_id: existingRecord?.reserve_id ?? null,
            status: existingRecord?.status ?? null,
            note: existingRecord?.note ?? null,
            answers: mergedAnswers,
        };

        // ★ 既存レコードは id 指定で更新（複数レコードの全上書き防止）
        // ★ レースコンディション対策: insert直前に再チェック
        let targetRecord = existingRecord;
        if (!targetRecord && intakePayload.reserve_id) {
          const { data: byReserveId } = await strictWithTenant(
            supabaseAdmin
              .from("intake")
              .select("id, answers, reserve_id, status, note, field_id")
              .eq("reserve_id", intakePayload.reserve_id)
              .limit(1)
              .maybeSingle(),
            tenantId
          );
          if (byReserveId) targetRecord = byReserveId;
        }
        const result = targetRecord
          ? await strictWithTenant(
              supabaseAdmin
                .from("intake")
                .update(intakePayload)
                .eq("id", targetRecord.id),
              tenantId
            )
          : await supabaseAdmin
              .from("intake")
              .insert({ ...tenantPayload(tenantId), patient_id: patientId, ...intakePayload, field_id: fieldId });

        if (result.error) {
          throw result.error;
        }
        return result;
      }),

      // 2. Supabase answerersテーブルに書き込み（リトライあり）
      retrySupabaseWrite(async () => {
        // 既存レコードを取得して、空値で上書きしないようにする
        // ★ supabaseAdmin を使う（anon key だと RLS で読めず null → name 消失バグの原因）
        const { data: existingAnswerer } = await strictWithTenant(
          supabaseAdmin
            .from("patients")
            .select("tel, name, name_kana, sex, birthday, line_id")
            .eq("patient_id", patientId)
            .maybeSingle(),
          tenantId
        );

        const result = await supabaseAdmin
          .from("patients")
          .upsert({
            ...tenantPayload(tenantId),
            patient_id: patientId,
            answerer_id: answererId,
            line_id: lineId || existingAnswerer?.line_id || null,
            name: name || existingAnswerer?.name || null,
            name_kana: nameKana || existingAnswerer?.name_kana || null,
            sex: sex || existingAnswerer?.sex || null,
            birthday: birth || existingAnswerer?.birthday || null,
            tel: tel || existingAnswerer?.tel || null,
          }, {
            onConflict: "patient_id",
          });

        if (result.error) {
          throw result.error;
        }
        return result;
      }),
    ]);

    // Supabase intake結果チェック
    if (supabaseIntakeResult.status === "rejected" || (supabaseIntakeResult.status === "fulfilled" && supabaseIntakeResult.value.error)) {
      const error = supabaseIntakeResult.status === "rejected"
        ? supabaseIntakeResult.reason
        : supabaseIntakeResult.value.error;

      console.error("❌❌❌ [CRITICAL] Supabase intake write FAILED ❌❌❌");
      console.error("[Supabase Error Details]", {
        patientId,
        error: error?.message || String(error),
        timestamp: new Date().toISOString()
      });
    }

    // Supabase answerers結果チェック
    if (supabaseAnswererResult.status === "rejected" || (supabaseAnswererResult.status === "fulfilled" && supabaseAnswererResult.value.error)) {
      const error = supabaseAnswererResult.status === "rejected"
        ? supabaseAnswererResult.reason
        : supabaseAnswererResult.value.error;

      console.error("❌ [WARNING] Supabase answerers write FAILED");
      console.error("[Answerers Error]", {
        patientId,
        error: error?.message || String(error),
        timestamp: new Date().toISOString()
      });
    }

    // ★ キャッシュ削除（問診送信時）
    await invalidateDashboardCache(patientId);

    // ★ 問診完了イベントをmessage_logに記録（トーク画面に表示）
    try {
      const { data: ptForLog } = await strictWithTenant(
        supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
        tenantId
      );
      if (ptForLog?.line_id) {
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: patientId,
          line_uid: ptForLog.line_id,
          event_type: "system",
          message_type: "event",
          content: "問診に回答しました",
          status: "received",
          direction: "incoming",
        });
        // friends-list キャッシュ無効化
        invalidateFriendsListCache(tenantId || "00000000-0000-0000-0000-000000000001").catch(() => {});
      }
    } catch (logErr) {
      console.error("[intake] message_log insert error (non-blocking):", logErr);
    }

    // ★ LINE_仮レコードが残っていたら統合して削除
    // line_id で直接検索し、同じ line_id を持つ LINE_ 患者を全てクリーンアップ
    if (!patientId.startsWith("LINE_")) {
      try {
        const { data: currentPatient } = await strictWithTenant(
          supabaseAdmin
            .from("patients")
            .select("line_id")
            .eq("patient_id", patientId)
            .maybeSingle(),
          tenantId
        );

        const resolvedLineId = currentPatient?.line_id;
        if (resolvedLineId) {
          // line_id が同じ LINE_ 患者を全て検索
          const { data: fakePatients } = await strictWithTenant(
            supabaseAdmin
              .from("patients")
              .select("patient_id")
              .eq("line_id", resolvedLineId)
              .like("patient_id", "LINE_%"),
            tenantId
          );

          for (const fake of fakePatients || []) {
            const fakeId = fake.patient_id;
            console.log(`[Intake] Merging fake record ${fakeId} -> ${patientId}`);

            // 関連テーブルの patient_id を正規に付け替え（MERGE_TABLES で一元管理）
            await Promise.all(
              MERGE_TABLES.map(async (table) => {
                const { error } = await strictWithTenant(
                  supabaseAdmin
                    .from(table)
                    .update({ patient_id: patientId })
                    .eq("patient_id", fakeId),
                  tenantId
                );
                // patient_tags 等の UNIQUE 制約違反は無視
                if (error && error.code !== "23505") {
                  console.error(`[Intake] Migration ${table} failed:`, error.message);
                }
              })
            );

            // ピン留めのIDも移行（admin_users.pinned_patients JSONB配列）
            try {
              const { data: admins } = await strictWithTenant(
                supabaseAdmin
                  .from("admin_users")
                  .select("id, pinned_patients"),
                tenantId
              );
              for (const admin of admins || []) {
                const pins: string[] = admin.pinned_patients || [];
                if (pins.includes(fakeId)) {
                  const newPins = pins.map((p: string) => p === fakeId ? patientId : p);
                  await strictWithTenant(
                    supabaseAdmin
                      .from("admin_users")
                      .update({ pinned_patients: newPins })
                      .eq("id", admin.id),
                    tenantId
                  );
                  console.log(`[Intake] Pin migrated for admin ${admin.id}: ${fakeId} -> ${patientId}`);
                }
              }
            } catch (e) {
              console.error("[Intake] Pin migration error:", (e as Error).message);
            }

            // friend_summaries 移行
            const { migrateFriendSummary } = await import("@/lib/merge-tables");
            await migrateFriendSummary(fakeId, patientId);
            // 仮レコード削除（intake → patients の順）
            await strictWithTenant(supabaseAdmin.from("intake").delete().eq("patient_id", fakeId), tenantId);
            await strictWithTenant(supabaseAdmin.from("patients").delete().eq("patient_id", fakeId), tenantId);
            console.log(`[Intake] Fake record ${fakeId} merged and deleted`);
          }
        }
      } catch (e) {
        console.error("[Intake] Fake record cleanup error (non-blocking):", (e as Error).message);
      }
    }

    // ★ 問診後リマインダー登録（ビジネスルール）
    // intake_completionモード（予約なし）ではリマインダー不要（スキップ）
    try {
      const { getSetting: getSettingForReminder } = await import("@/lib/settings");
      const karteMode = (await getSettingForReminder("consultation", "karte_mode", tenantId ?? undefined)) || "reservation";

      if (karteMode === "reservation") {
        // 予約制のみリマインダー送信
        const rules = await getBusinessRules(tenantId ?? undefined);
        if (rules.intakeReminderHours > 0 && patientId && !patientId.startsWith("LINE_")) {
          const remindAt = new Date(Date.now() + rules.intakeReminderHours * 60 * 60 * 1000).toISOString();
          const { data: ptData } = await strictWithTenant(
            supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
            tenantId
          );
          if (ptData?.line_id) {
            await supabaseAdmin.from("scheduled_messages").insert({
              tenant_id: tenantId || null,
              patient_id: patientId,
              line_uid: ptData.line_id,
              message_content: "問診のご回答ありがとうございます。まだ予約がお済みでない場合は、マイページより予約をお取りください。",
              message_type: "text",
              scheduled_at: remindAt,
              status: "scheduled",
              created_by: "intake_reminder",
            });
            console.log(`[intake] Reminder scheduled at ${remindAt} for patient=${patientId}`);
          }
        }
      } else {
        console.log(`[intake] Skipping reminder (karteMode=${karteMode})`);
      }
    } catch (reminderErr) {
      console.error("[intake] Reminder registration error (non-blocking):", reminderErr);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("❌❌❌ [CRITICAL] Unhandled error in /api/intake ❌❌❌");
    console.error("[Error Details]", {
      message: (error as Error).message || String(error),
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
