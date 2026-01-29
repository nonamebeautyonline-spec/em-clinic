// scripts/check-incomplete-patients.mjs
// 個人情報が不完全な患者を全件チェック

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

async function checkIncompletePatients() {
  console.log("=== 情報が不完全な患者をチェック ===\n");

  const targetPatients = ["20260101597", "20260100576"];

  // 1. 指定された2人の患者を確認
  console.log("1. 指定患者の確認:");
  for (const patientId of targetPatients) {
    console.log(`\n--- patient_id: ${patientId} ---`);

    // intakeテーブル
    const { data: intakeData, count: intakeCount } = await supabase
      .from("intake")
      .select("*", { count: "exact" })
      .eq("patient_id", patientId);

    console.log(`  intake: ${intakeCount} 件`);
    if (intakeData && intakeData.length > 0) {
      const intake = intakeData[0];
      console.log(`    patient_name: ${intake.patient_name || "なし"}`);
      console.log(`    answerer_id: ${intake.answerer_id || "なし"}`);
      console.log(`    line_id: ${intake.line_id || "なし"}`);
      console.log(`    answers.sex: ${intake.answers?.sex || "なし"}`);
      console.log(`    answers.birth: ${intake.answers?.birth || "なし"}`);
      console.log(`    answers.tel: ${intake.answers?.tel || "なし"}`);
    }

    // answersersテーブル
    const { data: answererData } = await supabase
      .from("answerers")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    console.log(`  answerers:`);
    if (answererData) {
      console.log(`    name: ${answererData.name || "なし"}`);
      console.log(`    sex: ${answererData.sex || "なし"}`);
      console.log(`    birthday: ${answererData.birthday || "なし"}`);
      console.log(`    tel: ${answererData.tel || "なし"}`);
    } else {
      console.log(`    データなし`);
    }

    // reservationsテーブル
    const { data: reservationData, count: reservationCount } = await supabase
      .from("reservations")
      .select("*", { count: "exact" })
      .eq("patient_id", patientId);

    console.log(`  reservations: ${reservationCount} 件`);
    if (reservationData && reservationData.length > 0) {
      console.log(`    最新予約: ${reservationData[0].reserved_date} (${reservationData[0].status})`);
    }
  }

  // 2. 全患者で情報が不完全なケースを検索
  console.log("\n\n2. 全患者から不完全な情報を持つレコードを検索中...\n");

  // (A) answersersテーブルでsex, birthday, telのいずれかがnullの患者
  const { data: incompleteAnswerers } = await supabase
    .from("answerers")
    .select("patient_id, name, sex, birthday, tel")
    .or("sex.is.null,birthday.is.null,tel.is.null");

  console.log(`A. answersersテーブルで情報不完全: ${incompleteAnswerers?.length || 0} 件`);
  if (incompleteAnswerers && incompleteAnswerers.length > 0) {
    console.log("   患者リスト（最初の10件）:");
    incompleteAnswerers.slice(0, 10).forEach(a => {
      const missing = [];
      if (!a.sex) missing.push("sex");
      if (!a.birthday) missing.push("birthday");
      if (!a.tel) missing.push("tel");
      console.log(`   - ${a.patient_id} (${a.name || "名前なし"}) - 欠落: ${missing.join(", ")}`);
    });
  }

  // (B) intakeテーブルでpatient_nameがnullの患者
  let allIntakes = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answerer_id, answers")
      .range(offset, offset + batchSize - 1);

    if (!data || data.length === 0) break;
    allIntakes = allIntakes.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  const incompleteIntakes = allIntakes.filter(i => {
    const noName = !i.patient_name;
    const noSex = !i.answers?.sex;
    const noBirth = !i.answers?.birth;
    const noTel = !i.answers?.tel;
    return noName || noSex || noBirth || noTel;
  });

  console.log(`\nB. intakeテーブルで情報不完全: ${incompleteIntakes.length} 件`);
  if (incompleteIntakes.length > 0) {
    console.log("   患者リスト（最初の10件）:");
    incompleteIntakes.slice(0, 10).forEach(i => {
      const missing = [];
      if (!i.patient_name) missing.push("name");
      if (!i.answers?.sex) missing.push("sex");
      if (!i.answers?.birth) missing.push("birth");
      if (!i.answers?.tel) missing.push("tel");
      console.log(`   - ${i.patient_id} (${i.patient_name || "名前なし"}) - 欠落: ${missing.join(", ")}`);
    });
  }

  // (C) reservationsにあってintakeにない患者
  let allReservations = [];
  offset = 0;

  while (true) {
    const { data } = await supabase
      .from("reservations")
      .select("patient_id, patient_name")
      .range(offset, offset + batchSize - 1);

    if (!data || data.length === 0) break;
    allReservations = allReservations.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  const intakePatientIds = new Set(allIntakes.map(i => i.patient_id));
  const reservationsWithoutIntake = allReservations.filter(r => !intakePatientIds.has(r.patient_id));

  // ユニークにする
  const uniqueReservationsWithoutIntake = [];
  const seen = new Set();
  for (const r of reservationsWithoutIntake) {
    if (!seen.has(r.patient_id)) {
      seen.add(r.patient_id);
      uniqueReservationsWithoutIntake.push(r);
    }
  }

  console.log(`\nC. reservationsにあってintakeにない患者: ${uniqueReservationsWithoutIntake.length} 件`);
  if (uniqueReservationsWithoutIntake.length > 0) {
    console.log("   患者リスト:");
    for (const r of uniqueReservationsWithoutIntake) {
      const { count } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", r.patient_id);

      console.log(`   - ${r.patient_id} (${r.patient_name || "名前なし"}) - 予約数: ${count} 件`);
    }
  }

  console.log("\n=== チェック完了 ===");

  // サマリー
  console.log("\n【サマリー】");
  console.log(`answersersで情報不完全: ${incompleteAnswerers?.length || 0} 件`);
  console.log(`intakeで情報不完全: ${incompleteIntakes.length} 件`);
  console.log(`reservationsあり・intakeなし: ${uniqueReservationsWithoutIntake.length} 件`);
}

checkIncompletePatients();
