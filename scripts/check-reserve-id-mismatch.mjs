// scripts/check-reserve-id-mismatch.mjs
// GASとSupabaseのreserve_id不一致を確認

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

async function checkMismatch() {
  console.log("=== GAS vs Supabase reserve_id不一致確認 ===\n");

  const affectedPatients = [
    '20260101586',
    '20260101381',
    '20260100132',
    '20260100576'
  ];

  // 1. GASから問診データを取得
  console.log("1. GASから問診データ取得中...");
  const gasResponse = await fetch(gasIntakeUrl, { method: "GET", redirect: "follow" });

  if (!gasResponse.ok) {
    console.error(`❌ GAS API Error: ${gasResponse.status}`);
    return;
  }

  const gasData = await gasResponse.json();
  let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

  console.log(`   GAS総行数: ${gasRows.length}\n`);

  // 2. 各患者について比較
  for (const patientId of affectedPatients) {
    console.log(`\n========================================`);
    console.log(`patient_id: ${patientId}`);
    console.log(`========================================`);

    // GASから該当患者のデータを検索
    const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

    // Supabaseのintakeテーブルを取得
    const { data: intakeData } = await supabase
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time")
      .eq("patient_id", patientId)
      .maybeSingle();

    // Supabaseのreservationsテーブルを取得
    const { data: reservations } = await supabase
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time, status")
      .eq("patient_id", patientId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!gasRecord) {
      console.log(`❌ GASにデータなし`);
      continue;
    }

    const gasReserveId = gasRecord.reserved || gasRecord.reserve_id || gasRecord.reserveId;
    const gasReservedDate = gasRecord.reserved_date || gasRecord.予約日;
    const gasReservedTime = gasRecord.reserved_time || gasRecord.予約時間;

    console.log(`\n【GAS問診シート】`);
    console.log(`  reserve_id: ${gasReserveId}`);
    console.log(`  reserved_date: ${gasReservedDate}`);
    console.log(`  reserved_time: ${gasReservedTime}`);

    console.log(`\n【Supabase intake】`);
    if (intakeData) {
      console.log(`  reserve_id: ${intakeData.reserve_id}`);
      console.log(`  reserved_date: ${intakeData.reserved_date}`);
      console.log(`  reserved_time: ${intakeData.reserved_time}`);
    } else {
      console.log(`  ❌ データなし`);
    }

    console.log(`\n【Supabase reservations (pending)】`);
    if (reservations && reservations.length > 0) {
      reservations.forEach((r, idx) => {
        console.log(`  ${idx + 1}. ${r.reserve_id} (${r.reserved_date} ${r.reserved_time})`);
      });
    } else {
      console.log(`  ❌ pending予約なし`);
    }

    // 不一致チェック
    const issues = [];

    if (intakeData && gasReserveId !== intakeData.reserve_id) {
      issues.push(`reserve_id: GAS=${gasReserveId}, intake=${intakeData.reserve_id}`);
    }

    if (intakeData && gasReservedDate !== intakeData.reserved_date) {
      issues.push(`reserved_date: GAS=${gasReservedDate}, intake=${intakeData.reserved_date}`);
    }

    if (intakeData && gasReservedTime !== intakeData.reserved_time) {
      issues.push(`reserved_time: GAS=${gasReservedTime}, intake=${intakeData.reserved_time}`);
    }

    if (issues.length > 0) {
      console.log(`\n【⚠️ GAS vs intake 不一致】`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log(`\n✅ GAS vs intake 一致`);
    }

    // GASのreserve_idがreservationsテーブルに存在するか確認
    if (reservations) {
      const gasReserveExists = reservations.some(r => r.reserve_id === gasReserveId);
      if (!gasReserveExists) {
        console.log(`\n⚠️ GASのreserve_id (${gasReserveId}) がreservationsテーブルに存在しません`);
      }
    }
  }

  console.log(`\n\n=== 確認完了 ===`);
}

checkMismatch();
