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

console.log("=== 現在の予約状況確認 ===\n");

const today = new Date().toISOString().slice(0, 10);
console.log(`日付: ${today}\n`);

// 1. Intakeテーブル
const { data: intakeData } = await supabase
  .from("intake")
  .select("patient_id, reserve_id, reserved_date, reserved_time, patient_name")
  .eq("reserved_date", today)
  .not("reserve_id", "is", null);

console.log(`【Intakeテーブル】今日の予約: ${intakeData.length}件`);

// 2. Reservationsテーブル（アクティブのみ）
const { data: reservationsData } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_date, reserved_time, status")
  .eq("reserved_date", today)
  .neq("status", "canceled");

console.log(`【Reservationsテーブル】今日のアクティブ予約: ${reservationsData.length}件\n`);

// 3. テストデータを探す
const testReservations = reservationsData.filter(r =>
  r.reserve_id?.includes("TEST") ||
  r.patient_id?.includes("TEST") ||
  r.reserve_id?.includes("test")
);

if (testReservations.length > 0) {
  console.log("❌ テストデータが見つかりました:");
  testReservations.forEach(r => {
    console.log(`  reserve_id: ${r.reserve_id}`);
    console.log(`  patient_id: ${r.patient_id}`);
    console.log(`  日時: ${r.reserved_date} ${r.reserved_time}`);
    console.log(`  status: ${r.status}\n`);
  });
}

// 4. Intakeにあってreservationsにない
const intakeReserveIds = new Set(intakeData.map(i => i.reserve_id));
const reservationsReserveIds = new Set(reservationsData.map(r => r.reserve_id));

const inIntakeNotInReservations = Array.from(intakeReserveIds).filter(
  id => !reservationsReserveIds.has(id)
);

const inReservationsNotInIntake = Array.from(reservationsReserveIds).filter(
  id => !intakeReserveIds.has(id)
);

if (inIntakeNotInReservations.length > 0) {
  console.log("\n❌ Intakeにあるがreservationsにない:");
  inIntakeNotInReservations.forEach(id => {
    const record = intakeData.find(i => i.reserve_id === id);
    console.log(`  reserve_id: ${id}`);
    console.log(`  patient: ${record.patient_name} (${record.patient_id})`);
    console.log(`  日時: ${record.reserved_date} ${record.reserved_time}\n`);
  });
}

if (inReservationsNotInIntake.length > 0) {
  console.log("\n❌ Reservationsにあるがintakeにない:");
  inReservationsNotInIntake.forEach(id => {
    const record = reservationsData.find(r => r.reserve_id === id);
    console.log(`  reserve_id: ${id}`);
    console.log(`  patient_id: ${record.patient_id}`);
    console.log(`  日時: ${record.reserved_date} ${record.reserved_time}`);
    console.log(`  status: ${record.status}\n`);
  });
}

// 5. まとめ
console.log("\n=== まとめ ===");
console.log(`Intake: ${intakeData.length}件`);
console.log(`Reservations (アクティブ): ${reservationsData.length}件`);
console.log(`テストデータ: ${testReservations.length}件`);
console.log(`不一致: ${inIntakeNotInReservations.length + inReservationsNotInIntake.length}件`);

if (reservationsData.length > intakeData.length) {
  console.log(`\n⚠️  Reservationsが ${reservationsData.length - intakeData.length}件 多い`);
}

console.log("\n=== 確認完了 ===");
