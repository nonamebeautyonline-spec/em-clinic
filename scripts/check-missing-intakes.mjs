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

console.log("=== Reservationsにあってintakeにない予約の詳細 ===\n");

// 1. Reservationsからアクティブな予約
const { data: activeRes } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time")
  .eq("reserved_date", today)
  .neq("status", "canceled")
  .order("reserved_time");

// 2. intakeから予約
const { data: intakeRes } = await supabase
  .from("intake")
  .select("reserve_id, patient_id")
  .eq("reserved_date", today)
  .not("reserved_date", "is", null);

const intakeIds = new Set(intakeRes.map(r => r.reserve_id));

// 3. 差分
const missing = activeRes.filter(r => !intakeIds.has(r.reserve_id));

console.log(`Reservationsにあってintakeにない: ${missing.length}件\n`);

for (const res of missing) {
  console.log(`${res.reserved_time} - patient_id: ${res.patient_id}`);
  console.log(`  reserve_id: ${res.reserve_id}`);
  
  // intakeテーブルにこのpatient_idのレコードがあるか
  const { data: intakeCheck } = await supabase
    .from("intake")
    .select("patient_id, reserve_id, reserved_date, reserved_time")
    .eq("patient_id", res.patient_id)
    .single();
  
  if (intakeCheck) {
    console.log(`  intakeにpatient_idは存在: reserve_id=${intakeCheck.reserve_id}, date=${intakeCheck.reserved_date}, time=${intakeCheck.reserved_time}`);
  } else {
    console.log(`  intakeにpatient_idが存在しない（問診未回答の可能性）`);
  }
  console.log();
}

console.log("=== 確認完了 ===");
