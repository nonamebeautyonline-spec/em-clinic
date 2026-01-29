// app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabase } from "@/lib/supabase";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string | undefined;

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

    // answersから個人情報を抽出（GASと同じロジック）
    const name = body.name || answersObj.氏名 || answersObj.name || "";
    const sex = body.sex || answersObj.性別 || answersObj.sex || "";
    const birth = body.birth || answersObj.生年月日 || answersObj.birth || "";
    const nameKana = body.name_kana || body.nameKana || answersObj.カナ || answersObj.name_kana || "";
    const tel = body.tel || body.phone || answersObj.電話番号 || answersObj.tel || "";
    const lineId = body.line_id || body.lineId || answersObj.line_id || "";
    const answererId = body.answerer_id || answersObj.answerer_id || null;

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

    const [supabaseResult, gasResult] = await Promise.allSettled([
      // 1. Supabaseに直接書き込み
      supabase
        .from("intake")
        .upsert({
          patient_id: patientId,
          patient_name: name || null,
          answerer_id: answererId,
          line_id: lineId || null,
          reserve_id: null,
          reserved_date: null,
          reserved_time: null,
          status: null,
          note: null,
          prescription_menu: null,
          answers: fullAnswers,
        }, {
          onConflict: "patient_id",
        }),

      // 2. GASにPOST
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

    // Supabase結果チェック
    if (supabaseResult.status === "rejected" || (supabaseResult.status === "fulfilled" && supabaseResult.value.error)) {
      const error = supabaseResult.status === "rejected"
        ? supabaseResult.reason
        : supabaseResult.value.error;
      console.error("[Supabase] Intake write failed:", error);
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

  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
