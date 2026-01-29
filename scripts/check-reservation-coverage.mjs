// scripts/check-reservation-coverage.mjs
// GASシートとSupabase reservationsテーブルの予約データ比較

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// .env.localを手動でパース
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReservationCoverage() {
  console.log("=== 予約データカバレッジ確認 ===\n");

  // 1. GASから全データ取得
  console.log("1. GASシートから予約データ取得中...");
  const gasResponse = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!gasResponse.ok) {
    throw new Error(`GAS fetch failed: ${gasResponse.status}`);
  }

  const gasData = await gasResponse.json();
  let gasRows;
  if (gasData.ok && Array.isArray(gasData.rows)) {
    gasRows = gasData.rows;
  } else if (Array.isArray(gasData)) {
    gasRows = gasData;
  } else {
    throw new Error("Invalid GAS response");
  }

  console.log(`   GAS総行数: ${gasRows.length}\n`);

  // 予約情報を持つレコードをカウント
  const gasReservations = gasRows.filter(row => row.reserve_id);
  console.log(`   予約ID（reserve_id）を持つ行: ${gasReservations.length}`);

  // ユニークなreserve_id
  const uniqueGasReserveIds = new Set(gasReservations.map(r => r.reserve_id));
  console.log(`   ユニークな予約ID: ${uniqueGasReserveIds.size}\n`);

  // 2. Supabase reservationsテーブル
  console.log("2. Supabase reservations テーブル確認中...");
  const { data: supabaseReservations, count: reservationsCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact" });

  console.log(`   Supabase reservations レコード数: ${reservationsCount}`);
  console.log(`   取得データ数: ${supabaseReservations?.length || 0}\n`);

  // 3. Supabase intakeテーブル
  console.log("3. Supabase intake テーブル確認中...");
  const { data: supabaseIntakes, count: intakeCount } = await supabase
    .from("intake")
    .select("patient_id, reserve_id, reserved_date, reserved_time, status", { count: "exact" });

  console.log(`   Supabase intake レコード数: ${intakeCount}`);

  const intakeWithReservation = supabaseIntakes?.filter(i => i.reserve_id) || [];
  console.log(`   予約情報を持つintakeレコード: ${intakeWithReservation.length}\n`);

  // 4. 比較
  console.log("=== データ比較 ===\n");

  const supabaseReserveIds = new Set(supabaseReservations?.map(r => r.reserve_id) || []);
  const intakeReserveIds = new Set(intakeWithReservation.map(i => i.reserve_id));

  // GASにあってSupabaseにない予約
  const missingInReservations = [];
  for (const reserveId of uniqueGasReserveIds) {
    if (!supabaseReserveIds.has(reserveId)) {
      const gasRecord = gasReservations.find(r => r.reserve_id === reserveId);
      missingInReservations.push(gasRecord);
    }
  }

  console.log(`GASにあってreservationsテーブルにない予約: ${missingInReservations.length}`);
  if (missingInReservations.length > 0 && missingInReservations.length <= 10) {
    console.log("  サンプル:");
    missingInReservations.slice(0, 5).forEach(r => {
      console.log(`    - reserve_id: ${r.reserve_id}, patient_id: ${r.patient_id}, name: ${r.name}`);
    });
  }

  // Supabaseにあって GASにない予約
  const extraInSupabase = [];
  for (const reserveId of supabaseReserveIds) {
    if (!uniqueGasReserveIds.has(reserveId)) {
      extraInSupabase.push(reserveId);
    }
  }

  console.log(`\nreservationsテーブルにあってGASにない予約: ${extraInSupabase.length}`);
  if (extraInSupabase.length > 0 && extraInSupabase.length <= 10) {
    console.log("  reserve_id:", extraInSupabase.slice(0, 5));
  }

  // 統計
  console.log("\n=== 統計 ===");
  console.log(`GAS予約総数: ${uniqueGasReserveIds.size}`);
  console.log(`Supabase reservations: ${reservationsCount}`);
  console.log(`Supabase intake（予約あり）: ${intakeWithReservation.length}`);
  console.log(`\nカバレッジ: ${((supabaseReserveIds.size / uniqueGasReserveIds.size) * 100).toFixed(1)}%`);
}

checkReservationCoverage();
