// scripts/check-specific-patient-20260100253.mjs
// 20260100253の詳細確認

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

async function checkPatient() {
  const patientId = "20260100253";
  console.log(`=== patient_id: ${patientId} の詳細確認 ===\n`);

  // 1. GASから取得
  console.log("1. GAS問診マスターから取得中...");
  try {
    const response = await fetch(gasIntakeUrl, {
      method: "GET",
      redirect: "follow",
    });

    if (response.ok) {
      const data = await response.json();
      let rows;
      if (data.ok && Array.isArray(data.rows)) {
        rows = data.rows;
      } else if (Array.isArray(data)) {
        rows = data;
      }

      const gasRecord = rows?.find(r => r.patient_id === patientId);

      if (gasRecord) {
        console.log("   ✅ GASに存在:");
        console.log(`      name: ${gasRecord.name || "なし"}`);
        console.log(`      sex: ${gasRecord.sex || "なし"}`);
        console.log(`      birth: ${gasRecord.birth || "なし"}`);
        console.log(`      tel: ${gasRecord.tel || "なし"}`);
        console.log(`      answerer_id: ${gasRecord.answerer_id || "なし"}`);
        console.log(`      line_id: ${gasRecord.line_id || "なし"}`);
        console.log(`      reserve_id: ${gasRecord.reserve_id || "なし"}`);
        console.log(`      reserved_date: ${gasRecord.reserved_date || "なし"}`);
      } else {
        console.log("   ❌ GASに見つかりません");
      }
    } else {
      console.log(`   ⚠️ GAS API error: ${response.status}`);
    }
  } catch (e) {
    console.log(`   ❌ GAS取得エラー:`, e.message);
  }

  // 2. Supabase answerers
  console.log("\n2. Supabase answerers テーブル:");
  const { data: answerer } = await supabase
    .from("answerers")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (answerer) {
    console.log("   ✅ 存在:");
    console.log(`      name: ${answerer.name || "なし"}`);
    console.log(`      sex: ${answerer.sex || "なし"}`);
    console.log(`      birthday: ${answerer.birthday || "なし"}`);
    console.log(`      tel: ${answerer.tel || "なし"}`);
    console.log(`      answerer_id: ${answerer.answerer_id || "なし"}`);
    console.log(`      line_id: ${answerer.line_id || "なし"}`);
  } else {
    console.log("   ❌ 存在しません");
  }

  // 3. Supabase intake
  console.log("\n3. Supabase intake テーブル:");
  const { data: intakes, count } = await supabase
    .from("intake")
    .select("*", { count: "exact" })
    .eq("patient_id", patientId);

  console.log(`   レコード数: ${count}`);
  if (intakes && intakes.length > 0) {
    intakes.forEach((intake, idx) => {
      console.log(`   --- レコード ${idx + 1} ---`);
      console.log(`      patient_name: ${intake.patient_name || "なし"}`);
      console.log(`      reserve_id: ${intake.reserve_id || "なし"}`);
      console.log(`      reserved_date: ${intake.reserved_date || "なし"}`);
      console.log(`      status: ${intake.status || "なし"}`);
      console.log(`      answers.sex: ${intake.answers?.sex || "なし"}`);
      console.log(`      answers.birth: ${intake.answers?.birth || "なし"}`);
      console.log(`      answers.tel: ${intake.answers?.tel || "なし"}`);
    });
  } else {
    console.log("   ❌ 存在しません");
  }

  // 4. Supabase reservations
  console.log("\n4. Supabase reservations テーブル:");
  const { data: reservations, count: resCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact" })
    .eq("patient_id", patientId);

  console.log(`   レコード数: ${resCount}`);
  if (reservations && reservations.length > 0) {
    reservations.forEach((res, idx) => {
      console.log(`   --- 予約 ${idx + 1} ---`);
      console.log(`      reserve_id: ${res.reserve_id}`);
      console.log(`      patient_name: ${res.patient_name || "なし"}`);
      console.log(`      reserved_date: ${res.reserved_date || "なし"}`);
      console.log(`      status: ${res.status || "なし"}`);
    });
  } else {
    console.log("   ❌ 存在しません");
  }

  console.log("\n=== 確認完了 ===");
}

checkPatient();
