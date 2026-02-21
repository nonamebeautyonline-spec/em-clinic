// app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { normalizeJPPhone } from "@/lib/phone";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// ★ Supabase書き込みリトライ機能
async function retrySupabaseWrite<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

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
    const tenantId = resolveTenantId(req);
    const body = await req.json().catch(() => ({} as any));

    const patientId =
      req.cookies.get("__Host-patient_id")?.value ||
      req.cookies.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const answersObj = body.answers || {};

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
    const tel = normalizeJPPhone(body.tel || body.phone || answersObj.電話番号 || answersObj.tel || "");
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
        // ★ tenant付き→tenant無しフォールバック: tenant_id不一致で重複INSERT防止
        let intakeRows = (await withTenant(
          supabaseAdmin
            .from("intake")
            .select("id, answers, reserve_id, status, note")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(10),
          tenantId
        )).data;
        if ((!intakeRows || intakeRows.length === 0) && tenantId) {
          const { data: fallback } = await supabaseAdmin
            .from("intake")
            .select("id, answers, reserve_id, status, note")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(10);
          if (fallback && fallback.length > 0) {
            intakeRows = fallback;
            // tenant_id修復
            await Promise.all(fallback.map(r =>
              supabaseAdmin.from("intake").update({ tenant_id: tenantId }).eq("id", r.id)
            ));
          }
        }
        const existingRecord = intakeRows?.find(r => r.reserve_id != null)
          ?? intakeRows?.find(r => !(r.note || "").startsWith("再処方"))
          ?? null;

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
          const { data: byReserveId } = await withTenant(
            supabaseAdmin
              .from("intake")
              .select("id, answers, reserve_id, status, note")
              .eq("reserve_id", intakePayload.reserve_id)
              .limit(1)
              .maybeSingle(),
            tenantId
          );
          if (byReserveId) targetRecord = byReserveId;
        }
        const result = targetRecord
          ? await withTenant(
              supabaseAdmin
                .from("intake")
                .update(intakePayload)
                .eq("id", targetRecord.id),
              tenantId
            )
          : await supabaseAdmin
              .from("intake")
              .insert({ ...tenantPayload(tenantId), patient_id: patientId, ...intakePayload });

        if (result.error) {
          throw result.error;
        }
        return result;
      }),

      // 2. Supabase answerersテーブルに書き込み（リトライあり）
      retrySupabaseWrite(async () => {
        // 既存レコードを取得して、空値で上書きしないようにする
        // ★ supabaseAdmin を使う（anon key だと RLS で読めず null → name 消失バグの原因）
        const { data: existingAnswerer } = await withTenant(
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

    // ★ LINE_仮レコードが残っていたら統合して削除
    // line_id で直接検索し、同じ line_id を持つ LINE_ 患者を全てクリーンアップ
    if (!patientId.startsWith("LINE_")) {
      try {
        const { data: currentPatient } = await withTenant(
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
          const { data: fakePatients } = await withTenant(
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

            // 関連テーブルの patient_id を正規に付け替え
            const migrateTables = ["message_log", "patient_tags", "patient_marks", "friend_field_values"];
            await Promise.all(
              migrateTables.map(async (table) => {
                const { error } = await withTenant(
                  supabaseAdmin
                    .from(table)
                    .update({ patient_id: patientId })
                    .eq("patient_id", fakeId),
                  tenantId
                );
                if (error) console.error(`[Intake] Migration ${table} failed:`, error.message);
              })
            );

            // ピン留めのIDも移行（admin_users.pinned_patients JSONB配列）
            try {
              const { data: admins } = await withTenant(
                supabaseAdmin
                  .from("admin_users")
                  .select("id, pinned_patients"),
                tenantId
              );
              for (const admin of admins || []) {
                const pins: string[] = admin.pinned_patients || [];
                if (pins.includes(fakeId)) {
                  const newPins = pins.map((p: string) => p === fakeId ? patientId : p);
                  await withTenant(
                    supabaseAdmin
                      .from("admin_users")
                      .update({ pinned_patients: newPins })
                      .eq("id", admin.id),
                    tenantId
                  );
                  console.log(`[Intake] Pin migrated for admin ${admin.id}: ${fakeId} -> ${patientId}`);
                }
              }
            } catch (e: any) {
              console.error("[Intake] Pin migration error:", e.message);
            }

            // 仮レコード削除（intake → patients の順）
            await withTenant(supabaseAdmin.from("intake").delete().eq("patient_id", fakeId), tenantId);
            await withTenant(supabaseAdmin.from("patients").delete().eq("patient_id", fakeId), tenantId);
            console.log(`[Intake] Fake record ${fakeId} merged and deleted`);
          }
        }
      } catch (e: any) {
        console.error("[Intake] Fake record cleanup error (non-blocking):", e.message);
      }
    }

return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("❌❌❌ [CRITICAL] Unhandled error in /api/intake ❌❌❌");
    console.error("[Error Details]", {
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
