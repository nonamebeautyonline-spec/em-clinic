// scripts/verify-patient-20260100321.mjs
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

console.log("=== patient_id: 20260100321 のintakeレコード確認 ===\n");

const { data, error } = await supabase
  .from("intake")
  .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, status")
  .eq("patient_id", "20260100321")
  .maybeSingle();

if (error) {
  console.log("❌ エラー:", error.message);
} else if (!data) {
  console.log("❌ レコードなし");
} else {
  console.log("✅ intakeレコードあり:");
  console.log("  patient_name:", data.patient_name);
  console.log("  reserve_id:", data.reserve_id);
  console.log("  reserved_date:", data.reserved_date);
  console.log("  reserved_time:", data.reserved_time);
  console.log("  status:", data.status || "NULL");
}

// 重複予約も確認
console.log("\n=== reservationsテーブルの確認 ===\n");

const { data: reservations } = await supabase
  .from("reservations")
  .select("reserve_id, reserved_date, reserved_time, status")
  .eq("patient_id", "20260100321")
  .eq("status", "pending");

console.log(`pending予約: ${reservations?.length || 0}件`);
if (reservations && reservations.length > 0) {
  reservations.forEach(r => {
    console.log(`  - ${r.reserve_id}: ${r.reserved_date} ${r.reserved_time}`);
  });
}
