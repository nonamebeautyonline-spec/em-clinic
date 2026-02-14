// app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { normalizeJPPhone } from "@/lib/phone";

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
        const { data: intakeRows } = await supabaseAdmin
          .from("intake")
          .select("id, patient_name, line_id, answers, reserve_id, reserved_date, reserved_time, status, note, prescription_menu")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(10);
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
        const intakePayload = {
            patient_name: name || existingRecord?.patient_name || null,
            answerer_id: answererId,
            line_id: lineId || existingRecord?.line_id || null,
            reserve_id: existingRecord?.reserve_id ?? null,
            reserved_date: existingRecord?.reserved_date ?? null,
            reserved_time: existingRecord?.reserved_time ?? null,
            status: existingRecord?.status ?? null,
            note: existingRecord?.note ?? null,
            prescription_menu: existingRecord?.prescription_menu ?? null,
            answers: mergedAnswers,
        };

        // ★ 既存レコードは id 指定で更新（複数レコードの全上書き防止）
        const result = existingRecord
          ? await supabaseAdmin
              .from("intake")
              .update(intakePayload)
              .eq("id", existingRecord.id)
          : await supabaseAdmin
              .from("intake")
              .insert({ patient_id: patientId, ...intakePayload });

        if (result.error) {
          throw result.error;
        }
        return result;
      }),

      // 2. Supabase answerersテーブルに書き込み（リトライあり）
      retrySupabaseWrite(async () => {
        // 既存レコードを取得して、空値で上書きしないようにする
        // ★ supabaseAdmin を使う（anon key だと RLS で読めず null → name 消失バグの原因）
        const { data: existingAnswerer } = await supabaseAdmin
          .from("answerers")
          .select("tel, name, name_kana, sex, birthday, line_id")
          .eq("patient_id", patientId)
          .maybeSingle();

        const result = await supabaseAdmin
          .from("answerers")
          .upsert({
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
    if (!patientId.startsWith("LINE_")) {
      try {
        // intakeに書き込まれたline_idを取得
        const { data: currentIntake } = await supabaseAdmin
          .from("intake")
          .select("line_id")
          .eq("patient_id", patientId)
          .maybeSingle();

        const resolvedLineId = currentIntake?.line_id;
        if (resolvedLineId) {
          const fakeId = `LINE_${resolvedLineId.slice(-8)}`;
          const { data: fakeRecord } = await supabaseAdmin
            .from("intake")
            .select("patient_id")
            .eq("patient_id", fakeId)
            .maybeSingle();

          if (fakeRecord) {
            console.log(`[Intake] Merging fake record ${fakeId} -> ${patientId}`);
            // message_log, patient_tags, patient_marks, friend_field_values を移行
            const migrateTables = ["message_log", "patient_tags", "patient_marks", "friend_field_values"];
            await Promise.all(
              migrateTables.map(async (table) => {
                const { error } = await supabaseAdmin
                  .from(table)
                  .update({ patient_id: patientId })
                  .eq("patient_id", fakeId);
                if (error) console.error(`[Intake] Migration ${table} failed:`, error.message);
              })
            );
            // ピン留めのIDも移行（admin_users.pinned_patients JSONB配列）
            try {
              const { data: admins } = await supabaseAdmin
                .from("admin_users")
                .select("id, pinned_patients");
              for (const admin of admins || []) {
                const pins: string[] = admin.pinned_patients || [];
                if (pins.includes(fakeId)) {
                  const newPins = pins.map((p: string) => p === fakeId ? patientId : p);
                  await supabaseAdmin
                    .from("admin_users")
                    .update({ pinned_patients: newPins })
                    .eq("id", admin.id);
                  console.log(`[Intake] Pin migrated for admin ${admin.id}: ${fakeId} -> ${patientId}`);
                }
              }
            } catch (e: any) {
              console.error("[Intake] Pin migration error:", e.message);
            }
            // 仮レコード削除
            await supabaseAdmin.from("intake").delete().eq("patient_id", fakeId);
            await supabaseAdmin.from("answerers").delete().eq("patient_id", fakeId);
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
