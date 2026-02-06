// app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabase } from "@/lib/supabase";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string | undefined;

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
    if (!GAS_INTAKE_URL) {
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

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

    // answersから個人情報を抽出（GASと同じロジック）
    const name = body.name || answersObj.氏名 || answersObj.name || "";
    const sex = body.sex || answersObj.性別 || answersObj.sex || "";
    const birth = body.birth || answersObj.生年月日 || answersObj.birth || "";
    const nameKana = body.name_kana || body.nameKana || answersObj.カナ || answersObj.name_kana || "";
    const tel = body.tel || body.phone || answersObj.電話番号 || answersObj.tel || "";
    const email = body.email || answersObj.メールアドレス || answersObj.email || "";
    const lineId = body.line_id || body.lineId || answersObj.line_id || "";
    const answererId = body.answerer_id || answersObj.answerer_id || null;

    // ★ デバッグログ：抽出後の値を確認
    console.log("[Intake Debug] Extracted - name:", name, "sex:", sex, "answererId:", answererId);

    // answersに個人情報を明示的に含める
    const fullAnswers = {
      ...answersObj,
      氏名: name,
      name: name,
      性別: sex,
      sex: sex,
      生年月日: birth,
      birth: birth,
      カナ: nameKana,
      name_kana: nameKana,
      電話番号: tel,
      tel: tel,
    };

    // ★ Supabase と GAS に並列書き込み
    const payload = {
      ...body,
      type: "intake",
      patient_id: patientId,
      skipSupabase: true, // ★ GAS側でSupabase書き込みをスキップ
    };

    const [supabaseIntakeResult, supabaseAnswererResult, gasResult] = await Promise.allSettled([
      // 1. Supabase intakeテーブルに書き込み（リトライあり）
      retrySupabaseWrite(async () => {
        // ★ 既存レコードがある場合はreserve_id等を保持
        const { data: existingRecord } = await supabase
          .from("intake")
          .select("reserve_id, reserved_date, reserved_time, status, note, prescription_menu")
          .eq("patient_id", patientId)
          .maybeSingle();

        const result = await supabase
          .from("intake")
          .upsert({
            patient_id: patientId,
            patient_name: name || null,
            // ★ patient_kana, phone, emailはintakeテーブルに列がない
            //   これらはanswersフィールド内に格納済み（カナ, 電話番号等）
            answerer_id: answererId,
            line_id: lineId || null,
            reserve_id: existingRecord?.reserve_id ?? null,
            reserved_date: existingRecord?.reserved_date ?? null,
            reserved_time: existingRecord?.reserved_time ?? null,
            status: existingRecord?.status ?? null,
            note: existingRecord?.note ?? null,
            prescription_menu: existingRecord?.prescription_menu ?? null,
            answers: fullAnswers,
          }, {
            onConflict: "patient_id",
          });

        if (result.error) {
          throw result.error;
        }
        return result;
      }),

      // 2. Supabase answerersテーブルに書き込み（リトライあり）
      retrySupabaseWrite(async () => {
        const result = await supabase
          .from("answerers")
          .upsert({
            patient_id: patientId,
            answerer_id: answererId,
            line_id: lineId || null,
            name: name || null,
            name_kana: nameKana || null,
            sex: sex || null,
            birthday: birth || null,
            tel: tel || null,
          }, {
            onConflict: "patient_id",
          });

        if (result.error) {
          throw result.error;
        }
        return result;
      }),

      // 3. GASにPOST
      fetch(GAS_INTAKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      }).then(async (res) => {
        const text = await res.text().catch(() => "");
        let json: any = {};
        try { json = text ? JSON.parse(text) : {}; } catch {}
        return { ok: res.ok && json?.ok === true, json, text };
      }),
    ]);

    // Supabase intake結果チェック
    if (supabaseIntakeResult.status === "rejected" || (supabaseIntakeResult.status === "fulfilled" && supabaseIntakeResult.value.error)) {
      const error = supabaseIntakeResult.status === "rejected"
        ? supabaseIntakeResult.reason
        : supabaseIntakeResult.value.error;

      // ★ Supabase失敗はログ出力のみ（GAS成功なら予約は確保される）
      console.error("❌❌❌ [CRITICAL] Supabase intake write FAILED ❌❌❌");
      console.error("[Supabase Error Details]", {
        patientId,
        error: error?.message || String(error),
        timestamp: new Date().toISOString()
      });
      console.error("⚠️ DATA INCONSISTENCY: Record exists in GAS but not in Supabase");
      console.error("⚠️ MANUAL FIX REQUIRED: Run bulk-fix-missing-info.mjs or create-missing script");
      // 処理は続行（GAS成功なら予約は有効）
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
      // 処理は続行（intakeとGASが成功すれば問題なし）
    }

    // GAS結果チェック
    let json: any = {};
    if (gasResult.status === "rejected" || (gasResult.status === "fulfilled" && !gasResult.value.ok)) {
      const error = gasResult.status === "rejected"
        ? gasResult.reason
        : gasResult.value.text;
      console.error("[GAS] Intake write failed:", error);
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    if (gasResult.status === "fulfilled") {
      json = gasResult.value.json;
    }

    // ★ キャッシュ削除（問診送信時）
    await invalidateDashboardCache(patientId);

    // ★ GASは { ok:true, intakeId, timing } を返す前提
const gasIntakeId = String(json.intakeId || "").trim();
const dedup = !!json.dedup;

// ★ タイミング情報をVercelログに記録
if (json.timing) {
  console.log("[Intake Timing]", {
    patientId,
    total: `${json.timing.total}ms`,
    sheetWrite: `${json.timing.sheetWrite}ms`,
    supabaseWrite: `${json.timing.supabaseWrite}ms`,
    masterSync: `${json.timing.masterSync}ms`,
    questionnaireSync: `${json.timing.questionnaireSync}ms`,
    cacheInvalidate: `${json.timing.cacheInvalidate}ms`
  });
}

// ★ デバッグ：GASレスポンスの構造を確認
console.log("[Intake Debug] GAS Response keys:", Object.keys(json));
console.log("[Intake Debug] masterInfo exists:", !!json.masterInfo);
if (json.masterInfo) {
  console.log("[Intake Debug] masterInfo keys:", Object.keys(json.masterInfo));
} else {
  console.log("[Intake Debug] ❌ masterInfo is missing from GAS response");
}

// ★ GASから返された問診マスター情報でSupabaseを更新
if (json.masterInfo) {
  try {
    const masterInfo = json.masterInfo;
    console.log("[Intake] Updating Supabase with master info:", masterInfo.name);

    // 既存のanswersを取得してマージ
    const { data: existingData } = await supabase
      .from("intake")
      .select("answers")
      .eq("patient_id", patientId)
      .maybeSingle();

    const existingAnswers = existingData?.answers || {};
    const mergedAnswers = {
      ...existingAnswers,
      氏名: masterInfo.name || existingAnswers.氏名 || "",
      name: masterInfo.name || existingAnswers.name || "",
      性別: masterInfo.sex || existingAnswers.性別 || "",
      sex: masterInfo.sex || existingAnswers.sex || "",
      生年月日: masterInfo.birth || existingAnswers.生年月日 || "",
      birth: masterInfo.birth || existingAnswers.birth || "",
      カナ: masterInfo.nameKana || existingAnswers.カナ || "",
      name_kana: masterInfo.nameKana || existingAnswers.name_kana || "",
      電話番号: masterInfo.tel || tel || existingAnswers.電話番号 || "",
      tel: masterInfo.tel || tel || existingAnswers.tel || "",
      answerer_id: masterInfo.answererId || existingAnswers.answerer_id || "",
      line_id: masterInfo.lineUserId || existingAnswers.line_id || ""
    };

    // Supabaseをupsert（リトライあり）- 最初のupsertが失敗している可能性を考慮
    try {
      await retrySupabaseWrite(async () => {
        const result = await supabase
          .from("intake")
          .upsert({
            patient_id: patientId,
            patient_name: masterInfo.name || null,
            answerer_id: masterInfo.answererId || null,
            line_id: masterInfo.lineUserId || null,
            reserve_id: null,
            reserved_date: null,
            reserved_time: null,
            status: null,
            note: null,
            prescription_menu: null,
            answers: mergedAnswers
          }, {
            onConflict: "patient_id",
          });

        if (result.error) {
          throw result.error;
        }
        return result;
      });

      console.log("[Intake] Successfully upserted master info in Supabase");
    } catch (error) {
      console.error("[Intake] Failed to upsert master info in Supabase after retries:", error);
    }
  } catch (e) {
    console.error("[Intake] Error updating master info:", e);
  }
}

const res = NextResponse.json({ ok: true, dedup });

// intakeId が取れたときだけ cookie を付与（dedup時に空でもOK）
if (gasIntakeId) {
  res.cookies.set("__Host-intake_id", gasIntakeId, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

return res;

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
