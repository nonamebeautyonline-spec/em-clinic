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
        // ★ 既存レコードがある場合はreserve_id等＋answersを保持してマージ
        const { data: existingRecord } = await supabase
          .from("intake")
          .select("patient_name, line_id, answers, reserve_id, reserved_date, reserved_time, status, note, prescription_menu")
          .eq("patient_id", patientId)
          .maybeSingle();

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

        const result = await supabase
          .from("intake")
          .upsert({
            patient_id: patientId,
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
        // 既存レコードを取得して、空値で上書きしないようにする
        const { data: existingAnswerer } = await supabase
          .from("answerers")
          .select("tel, name, name_kana, sex, birthday, line_id")
          .eq("patient_id", patientId)
          .maybeSingle();

        const result = await supabase
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

    // GAS結果チェック（失敗してもSupabase書き込み済みなので続行）
    let json: any = {};
    if (gasResult.status === "rejected" || (gasResult.status === "fulfilled" && !gasResult.value.ok)) {
      const error = gasResult.status === "rejected"
        ? gasResult.reason
        : gasResult.value.text;
      console.error("[GAS] Intake write failed (non-blocking):", error);
      // GAS失敗でもSupabase書き込み済みなので処理を続行
    } else if (gasResult.status === "fulfilled") {
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

// GASレスポンスのログ（masterInfo第2 upsertは廃止 — Lステップ不使用のため不要）
console.log("[Intake Debug] GAS Response keys:", Object.keys(json));

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
