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

const today = new Date().toISOString().slice(0, 10);

console.log("=== 予約データの詳細比較 ===\n");

// 1. reservationsテーブルから今日のアクティブな予約
const { data: activeReservations } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time")
  .eq("reserved_date", today)
  .neq("status", "canceled")
  .order("reserved_time");

console.log(`【Reservations】アクティブな予約: ${activeReservations.length}件\n`);

// 2. intakeテーブルから今日の予約
const { data: intakeReservations } = await supabase
  .from("intake")
  .select("reserve_id, patient_id, reserved_time, patient_name")
  .eq("reserved_date", today)
  .not("reserved_date", "is", null)
  .order("reserved_time");

console.log(`【Intake】予約あり: ${intakeReservations.length}件\n`);

// 3. reserve_idで比較
const resIds = new Set(activeReservations.map(r => r.reserve_id));
const intakeIds = new Set(intakeReservations.map(r => r.reserve_id));

// reservationsにあってintakeにない
const missingInIntake = activeReservations.filter(r => !intakeIds.has(r.reserve_id));

// intakeにあってreservationsにない（またはキャンセル済み）
const missingInRes = intakeReservations.filter(r => !resIds.has(r.reserve_id));

console.log(`【差分】`);
console.log(`Reservationsにあってintakeにない: ${missingInIntake.length}件`);
console.log(`Intakeにあってreservationsにない: ${missingInRes.length}件\n`);

if (missingInIntake.length > 0) {
  console.log("Reservationsにあってintakeにない予約（最初の10件）:");
  missingInIntake.slice(0, 10).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.reserved_time} - reserve_id: ${r.reserve_id}, patient_id: ${r.patient_id}`);
  });
  console.log();
}

if (missingInRes.length > 0) {
  console.log("Intakeにあってreservationsにない予約（最初の10件）:");
  for (const r of missingInRes.slice(0, 10)) {
    const { data: resCheck } = await supabase
      .from("reservations")
      .select("status")
      .eq("reserve_id", r.reserve_id)
      .single();
    
    const status = resCheck ? resCheck.status : "見つからない";
    console.log(`  ${r.reserved_time} - ${r.patient_name}`);
    console.log(`    reserve_id: ${r.reserve_id}, status: ${status}`);
  }
}

console.log("\n=== 確認完了 ===");
