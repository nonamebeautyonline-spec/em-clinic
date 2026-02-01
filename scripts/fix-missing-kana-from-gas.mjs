// scripts/fix-missing-kana-from-gas.mjs
// GAS問診シートからカナを取得してSupabaseに補完

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

const targetPatients = ["20260100576", "20260101597"];

async function fix() {
  console.log("=== GASからカナを取得してSupabaseに補完 ===\n");

  // 1. GASから全データを取得
  console.log("1. GAS問診データ取得中...");
  const gasResponse = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!gasResponse.ok) {
    console.log(`❌ GAS API Error: ${gasResponse.status}`);
    return;
  }

  const gasData = await gasResponse.json();
  let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

  if (!Array.isArray(gasRows)) {
    console.log("❌ レスポンスが配列ではありません");
    return;
  }

  console.log(`   ✅ 取得成功: ${gasRows.length} 件\n`);

  // 2. 各患者のカナを補完
  for (const patientId of targetPatients) {
    console.log(`【patient_id: ${patientId}】`);

    const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

    if (!gasRecord) {
      console.log("  ❌ GASシートにデータなし\n");
      continue;
    }

    const nameKana = gasRecord.name_kana || gasRecord.カナ || gasRecord.nameKana || null;

    if (!nameKana) {
      console.log("  ❌ GASにもカナがありません\n");
      continue;
    }

    console.log(`  GASのカナ: ${nameKana}`);

    // 3. Supabase intakeテーブルを更新
    console.log("\n  3-1. intakeテーブル更新中...");

    // 既存のanswersを取得
    const { data: existingIntake } = await supabase
      .from("intake")
      .select("answers")
      .eq("patient_id", patientId)
      .maybeSingle();

    const existingAnswers = existingIntake?.answers || {};
    const updatedAnswers = {
      ...existingAnswers,
      カナ: nameKana,
      name_kana: nameKana,
      フリガナ: nameKana
    };

    const { error: intakeError } = await supabase
      .from("intake")
      .update({ answers: updatedAnswers })
      .eq("patient_id", patientId);

    if (intakeError) {
      console.log(`     ❌ intakeテーブル更新失敗: ${intakeError.message}`);
    } else {
      console.log(`     ✅ intakeテーブル更新成功`);
    }

    // 4. Supabase answerersテーブルを更新
    console.log("  3-2. answerersテーブル更新中...");

    const { error: answererError } = await supabase
      .from("answerers")
      .update({ name_kana: nameKana })
      .eq("patient_id", patientId);

    if (answererError) {
      console.log(`     ❌ answerersテーブル更新失敗: ${answererError.message}`);
    } else {
      console.log(`     ✅ answerersテーブル更新成功`);
    }

    console.log();
  }

  console.log("\n【完了】");
  console.log("カルテをリロードすると、2人の患者のカナが表示されます。");
}

fix();
