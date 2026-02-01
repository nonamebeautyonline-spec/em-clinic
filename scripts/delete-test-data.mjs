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

console.log("=== テストデータの削除 ===\n");

const testPatientId = "TEST_FLOW_1769698821310";

// 1. reservationsテーブルから削除
const { data: testReservations } = await supabase
  .from("reservations")
  .select("reserve_id, reserved_date, reserved_time, status")
  .eq("patient_id", testPatientId);

const resCount = testReservations ? testReservations.length : 0;
console.log(`【Reservations】テストデータ: ${resCount}件`);
if (testReservations) {
  testReservations.forEach(r => {
    console.log(`  ${r.reserved_date} ${r.reserved_time} - ${r.status} (${r.reserve_id})`);
  });
}

const { error: delResError } = await supabase
  .from("reservations")
  .delete()
  .eq("patient_id", testPatientId);

if (delResError) {
  console.error("Reservations削除エラー:", delResError);
} else {
  console.log(`✓ Reservations削除完了\n`);
}

// 2. intakeテーブルから削除
const { data: testIntake } = await supabase
  .from("intake")
  .select("patient_id, reserve_id, reserved_date")
  .eq("patient_id", testPatientId);

const intakeCount = testIntake ? testIntake.length : 0;
console.log(`【Intake】テストデータ: ${intakeCount}件`);

const { error: delIntakeError } = await supabase
  .from("intake")
  .delete()
  .eq("patient_id", testPatientId);

if (delIntakeError) {
  console.error("Intake削除エラー:", delIntakeError);
} else {
  console.log(`✓ Intake削除完了`);
}

console.log("\n=== 削除完了 ===");
