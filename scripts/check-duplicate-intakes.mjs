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

console.log("=== 問題のpatient_idのintakeレコード確認 ===\n");

const problemPatients = ["20260101576", "20260100211"];

for (const pid of problemPatients) {
  console.log(`\n【patient_id: ${pid}】`);
  
  const { data: intakeRecords } = await supabase
    .from("intake")
    .select("patient_id, reserve_id, reserved_date, reserved_time, created_at")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });
  
  console.log(`  Intakeレコード数: ${intakeRecords.length}件`);
  
  intakeRecords.forEach((record, i) => {
    console.log(`    ${i+1}. created_at: ${record.created_at}`);
    console.log(`       reserve_id: ${record.reserve_id}`);
    console.log(`       reserved_date: ${record.reserved_date}, reserved_time: ${record.reserved_time}`);
  });
  
  // reservationsテーブルの予約を確認
  const { data: reservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });
  
  console.log(`  Reservations: ${reservations.length}件`);
  
  reservations.slice(0, 5).forEach((res, i) => {
    console.log(`    ${i+1}. ${res.reserved_date} ${res.reserved_time} - ${res.status} (${res.reserve_id})`);
  });
}

console.log("\n=== 確認完了 ===");
