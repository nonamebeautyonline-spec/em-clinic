// scripts/analyze-missing-patients.mjs
// 抜けていた2人の患者のデータを詳しく分析

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
const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;
const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

const targetPatientIds = ["20260100321"];

console.log("=== 抜けている患者データ分析 ===\n");

async function analyzePatients() {
  for (const patientId of targetPatientIds) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`【patient_id: ${patientId}】`);
    console.log("=".repeat(60));

    // 1. GAS問診データ確認
    console.log("\n【1】GAS問診データ:");
    const intakeUrl = `${gasIntakeListUrl}`;
    const intakeResponse = await fetch(intakeUrl, { method: "GET" });
    const allIntake = await intakeResponse.json();

    const gasIntake = allIntake.find(row => String(row.patient_id) === patientId);

    if (gasIntake) {
      console.log(`  ✅ GASに問診データあり`);
      console.log(`  問診送信日時: ${gasIntake.submittedAt || gasIntake.timestamp}`);
      console.log(`  氏名: ${gasIntake.name}`);
      console.log(`  電話番号: ${gasIntake.tel}`);
      console.log(`  line_id: ${gasIntake.line_id || "なし"}`);
      console.log(`  answerer_id: ${gasIntake.answerer_id || "なし"}`);
    } else {
      console.log(`  ❌ GASに問診データなし`);
    }

    // 2. GAS予約データ確認
    console.log("\n【2】GAS予約データ:");
    const reservationsResponse = await fetch(gasReservationsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "getAllReservations", token: adminToken }),
    });
    const reservationsData = await reservationsResponse.json();
    const allReservations = reservationsData.reservations || [];

    const gasReservations = allReservations.filter(r =>
      String(r.patient_id || r.patientId) === patientId
    );

    if (gasReservations.length > 0) {
      console.log(`  ✅ GASに予約データあり: ${gasReservations.length}件`);
      gasReservations.forEach(r => {
        const reserveId = r.reserve_id || r.reserveId;
        const date = r.date || r.reserved_date;
        const time = r.time || r.reserved_time;
        const timestamp = r.timestamp || r.created_at;
        console.log(`    - ${reserveId}: ${date} ${time} (作成: ${timestamp})`);
      });
    } else {
      console.log(`  ❌ GASに予約データなし`);
    }

    // 3. Supabase intakeテーブル確認
    console.log("\n【3】Supabase intakeテーブル:");
    const { data: supabaseIntake, error: intakeError } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (intakeError) {
      console.log(`  ❌ エラー: ${intakeError.message}`);
    } else if (!supabaseIntake) {
      console.log(`  ❌ レコードなし`);
    } else {
      console.log(`  ✅ レコードあり`);
      console.log(`  patient_name: ${supabaseIntake.patient_name}`);
      console.log(`  reserve_id: ${supabaseIntake.reserve_id || "NULL"}`);
      console.log(`  reserved_date: ${supabaseIntake.reserved_date || "NULL"}`);
      console.log(`  created_at: ${supabaseIntake.created_at}`);
      console.log(`  answers keys: ${Object.keys(supabaseIntake.answers || {}).length}個`);
    }

    // 4. Supabase reservationsテーブル確認
    console.log("\n【4】Supabase reservationsテーブル:");
    const { data: supabaseReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", patientId);

    if (!supabaseReservations || supabaseReservations.length === 0) {
      console.log(`  ❌ レコードなし`);
    } else {
      console.log(`  ✅ レコードあり: ${supabaseReservations.length}件`);
      supabaseReservations.forEach(r => {
        console.log(`    - ${r.reserve_id}: ${r.reserved_date} ${r.reserved_time} (status: ${r.status})`);
        console.log(`      created_at: ${r.created_at}`);
      });
    }

    // 5. answerers テーブル確認
    console.log("\n【5】Supabase answerersテーブル:");
    const { data: answerer } = await supabase
      .from("answerers")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!answerer) {
      console.log(`  ❌ レコードなし`);
    } else {
      console.log(`  ✅ レコードあり`);
      console.log(`  name: ${answerer.name}`);
      console.log(`  tel: ${answerer.tel}`);
      console.log(`  created_at: ${answerer.created_at}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("分析完了");
}

analyzePatients();
