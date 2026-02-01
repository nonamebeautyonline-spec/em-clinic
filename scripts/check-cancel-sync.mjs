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

console.log("=== キャンセル同期状況の確認 ===\n");

// 1. reservationsテーブルから今日のキャンセル予約を取得
const { data: canceledRes, error: resError } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time, status")
  .eq("reserved_date", today)
  .eq("status", "canceled");

if (resError) {
  console.error("Reservationsエラー:", resError);
  process.exit(1);
}

console.log(`今日のキャンセル予約: ${canceledRes.length}件\n`);

// 2. それらのpatient_idがintakeテーブルでまだ予約を持っているか確認
let stillHasReservation = 0;
const samples = [];

for (const res of canceledRes.slice(0, 5)) {
  const { data: intakeData } = await supabase
    .from("intake")
    .select("patient_id, reserve_id, reserved_date, reserved_time")
    .eq("patient_id", res.patient_id)
    .not("reserved_date", "is", null);
  
  if (intakeData && intakeData.length > 0) {
    stillHasReservation++;
    samples.push({
      patient_id: res.patient_id,
      canceled_reserve_id: res.reserve_id,
      intake_reserve_id: intakeData[0].reserve_id,
      intake_date: intakeData[0].reserved_date,
      intake_time: intakeData[0].reserved_time,
    });
  }
}

console.log(`キャンセル済みなのにintakeに予約が残っている: ${stillHasReservation}件\n`);

if (samples.length > 0) {
  console.log("サンプル（最初の5件）:");
  samples.forEach((s, i) => {
    console.log(`  ${i+1}. patient_id: ${s.patient_id}`);
    console.log(`     キャンセル済みreserve_id: ${s.canceled_reserve_id}`);
    console.log(`     intakeに残っているreserve_id: ${s.intake_reserve_id}`);
    console.log(`     intake予約日時: ${s.intake_date} ${s.intake_time}`);
    console.log();
  });
}

console.log("=== 確認完了 ===");
