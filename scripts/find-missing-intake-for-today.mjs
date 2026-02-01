// scripts/find-missing-intake-for-today.mjs
// 今日の予約でintakeテーブルに存在しない患者を特定

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
const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

const today = "2026-01-30";

console.log(`=== 今日（${today}）の予約でintakeテーブルに存在しない患者を特定 ===\n`);

async function findMissingIntake() {
  // 1. GASから今日のpending予約を取得
  console.log("【1】GAS予約シートから今日のpending予約取得中...");

  const gasResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      token: adminToken,
    }),
  });

  const gasData = await gasResponse.json();
  const allGasReservations = gasData.reservations || [];

  const gasTodayPending = allGasReservations.filter(r => {
    const date = r.date || r.reserved_date;
    const status = (r.status || "").trim().toLowerCase();
    const isPending = status === "" || status === "pending";
    return date === today && isPending;
  });

  console.log(`✅ GAS今日のpending予約: ${gasTodayPending.length}件\n`);

  // 2. Supabaseのintakeテーブルから今日の予約を取得
  console.log("【2】Supabase intakeテーブルから今日の予約取得中...");

  const { data: intakeToday, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, status")
    .eq("reserved_date", today);

  if (error) {
    console.log(`❌ Supabaseエラー: ${error.message}`);
    return;
  }

  console.log(`✅ Supabase intakeテーブル 今日の予約: ${intakeToday.length}件\n`);

  // 3. patient_idのセットを作成
  const intakePatientIds = new Set(intakeToday.map(r => r.patient_id));

  // 4. GASにあってintakeテーブルにない患者を抽出
  const missingPatients = gasTodayPending.filter(r => {
    const patientId = r.patient_id || r.patientId;
    return patientId && !intakePatientIds.has(patientId);
  });

  console.log(`📊 GASにあってintakeテーブルにない患者: ${missingPatients.length}件\n`);

  if (missingPatients.length === 0) {
    console.log("✅ すべての患者のintakeレコードが存在します");
    return;
  }

  console.log("❌ 以下の患者のintakeレコードが存在しません:\n");

  for (const r of missingPatients) {
    const patientId = r.patient_id || r.patientId;
    const time = r.time || r.reserved_time;
    const reserveId = r.reserve_id || r.reserveId;

    console.log(`  patient_id: ${patientId}`);
    console.log(`  reserve_id: ${reserveId}`);
    console.log(`  time: ${time}`);

    // Supabaseでこの患者のintakeレコードを確認
    const { data: intakeData } = await supabase
      .from("intake")
      .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!intakeData) {
      console.log(`  → intakeレコード自体が存在しません`);
    } else {
      console.log(`  → intakeレコードは存在するが、reserved_date が ${intakeData.reserved_date} になっている`);
      console.log(`     reserve_id: ${intakeData.reserve_id || "NULL"}`);
    }
    console.log();
  }
}

findMissingIntake();
