// scripts/fix-incomplete-patients.mjs
// 不完全な患者情報をanswersersテーブルから補完

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

async function fixIncompletePatients() {
  console.log("=== 不完全な患者情報を修正 ===\n");

  // 1. intakeで情報不完全な患者を修正
  console.log("1. intakeテーブルの不完全データを修正中...\n");

  const incompletePatients = ["20260101592", "20260101596", "20260101597"];

  for (const patientId of incompletePatients) {
    console.log(`--- patient_id: ${patientId} ---`);

    // answersersから情報を取得
    const { data: answerer } = await supabase
      .from("answerers")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!answerer) {
      console.log(`  ❌ answersersにデータなし - スキップ\n`);
      continue;
    }

    console.log(`  answersersから取得: ${answerer.name} (${answerer.sex}, ${answerer.birthday}, ${answerer.tel})`);

    // intakeの現在のデータを取得
    const { data: intake } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!intake) {
      console.log(`  ⚠️ intakeにデータなし - 後で作成します\n`);
      continue;
    }

    // answersを更新
    const updatedAnswers = {
      ...(intake.answers || {}),
      sex: answerer.sex || intake.answers?.sex || null,
      birth: answerer.birthday || intake.answers?.birth || null,
      tel: answerer.tel || intake.answers?.tel || null,
      name: answerer.name || intake.answers?.name || null,
      name_kana: answerer.name_kana || intake.answers?.name_kana || null,
    };

    // intakeテーブルを更新
    const { error } = await supabase
      .from("intake")
      .update({
        patient_name: answerer.name || intake.patient_name,
        answerer_id: answerer.answerer_id || intake.answerer_id,
        line_id: answerer.line_id || intake.line_id,
        answers: updatedAnswers,
      })
      .eq("patient_id", patientId);

    if (error) {
      console.log(`  ❌ 更新失敗:`, error.message);
    } else {
      console.log(`  ✅ 更新成功: name=${answerer.name}, sex=${answerer.sex}, birth=${answerer.birthday}, tel=${answerer.tel}`);
    }
    console.log("");
  }

  // 2. reservationsにあってintakeにない患者のintakeレコードを作成
  console.log("\n2. reservationsにあってintakeにない患者のintakeレコードを作成中...\n");

  const missingIntakePatients = [
    "20260101430",
    "20260100253",
    "20260101355",
    "20260100576",
    "20260101457",
    "20260101538",
    "20260101580",
    "20251200229"
  ];

  for (const patientId of missingIntakePatients) {
    console.log(`--- patient_id: ${patientId} ---`);

    // answersersから情報を取得
    const { data: answerer } = await supabase
      .from("answerers")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!answerer) {
      console.log(`  ❌ answersersにデータなし - スキップ\n`);
      continue;
    }

    // 最新の予約情報を取得
    const { data: reservation } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`  answersersから取得: ${answerer.name}`);
    if (reservation) {
      console.log(`  予約情報: ${reservation.reserve_id} (${reservation.reserved_date})`);
    }

    // intakeレコードを作成
    const { error } = await supabase
      .from("intake")
      .insert({
        patient_id: patientId,
        patient_name: answerer.name,
        answerer_id: answerer.answerer_id,
        line_id: answerer.line_id,
        reserve_id: reservation?.reserve_id || null,
        reserved_date: reservation?.reserved_date || null,
        reserved_time: reservation?.reserved_time || null,
        status: reservation?.status || null,
        note: reservation?.note || null,
        prescription_menu: reservation?.prescription_menu || null,
        answers: {
          sex: answerer.sex,
          birth: answerer.birthday,
          tel: answerer.tel,
          name: answerer.name,
          name_kana: answerer.name_kana,
          Patient_ID: patientId,
          answerer_id: answerer.answerer_id,
          line_id: answerer.line_id,
        },
      });

    if (error) {
      console.log(`  ❌ 作成失敗:`, error.message);
    } else {
      console.log(`  ✅ intakeレコード作成成功`);
    }
    console.log("");
  }

  console.log("=== 修正完了 ===");
}

fixIncompletePatients();
