// 51件の pending 予約と intake テーブルを照合
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 余分な予約を特定（intake照合） ===\n");

// 1. DBから今日のpending予約を取得
const { data: pendingReservations, error: dbError } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time")
  .eq("reserved_date", "2026-01-30")
  .eq("status", "pending")
  .order("reserved_time");

if (dbError) {
  console.error("DBエラー:", dbError.message);
  process.exit(1);
}

console.log(`【1. reservations pending予約】${pendingReservations.length}件\n`);

// 2. intakeテーブルから今日の問診データを取得
const { data: intakeData, error: intakeError } = await supabase
  .from("intake")
  .select("reserve_id, patient_id, reserved_time")
  .eq("reserved_date", "2026-01-30")
  .not("reserve_id", "is", null);

if (intakeError) {
  console.error("intakeエラー:", intakeError.message);
  process.exit(1);
}

console.log(`【2. intake問診データ】${intakeData.length}件\n`);

// 3. intakeにある reserve_id のセットを作成
const intakeReserveIds = new Set(
  intakeData
    .map(row => String(row.reserve_id).trim())
    .filter(id => id)
);

console.log(`【3. intakeのreserve_id】${intakeReserveIds.size}件\n`);

// 4. reservationsのpending予約で、intakeに存在しないものを探す
const extraReservations = [];

for (const res of pendingReservations) {
  if (!intakeReserveIds.has(res.reserve_id)) {
    extraReservations.push(res);
  }
}

console.log(`【4. 問診データがないpending予約】${extraReservations.length}件\n`);

if (extraReservations.length > 0) {
  console.log("以下の予約はreservationsにpendingとして存在するが、intakeに問診データがありません:\n");

  for (const res of extraReservations) {
    console.log(`  reserve_id: ${res.reserve_id}`);
    console.log(`  patient_id: ${res.patient_id}`);
    console.log(`  reserved_time: ${res.reserved_time}`);
    console.log();
  }
} else {
  console.log("全てのpending予約に問診データが存在します。");
}

// 5. 逆パターン: intakeにはあるがreservationsにpendingとして存在しないもの
const reservationIds = new Set(pendingReservations.map(r => r.reserve_id));
const missingInReservations = [];

for (const intake of intakeData) {
  if (!reservationIds.has(intake.reserve_id)) {
    missingInReservations.push(intake);
  }
}

if (missingInReservations.length > 0) {
  console.log(`\n【5. intakeにはあるがreservationsにpendingとして存在しない】${missingInReservations.length}件\n`);
  for (const intake of missingInReservations) {
    // この予約のステータスを確認
    const { data: reservation } = await supabase
      .from("reservations")
      .select("status")
      .eq("reserve_id", intake.reserve_id)
      .single();

    console.log(`  reserve_id: ${intake.reserve_id}`);
    console.log(`  patient_id: ${intake.patient_id}`);
    console.log(`  reserved_time: ${intake.reserved_time}`);
    console.log(`  reservations status: ${reservation?.status || "not found"}`);
    console.log();
  }
}

console.log("=== 確認完了 ===");
