// 20251200128 の予約状況を確認
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

console.log("=== 20251200128 の予約状況 ===\n");

const patientId = "20251200128";

// 1. reservations テーブル
console.log("【1. reservations テーブル】");
const { data: reservations, error: resError } = await supabase
  .from("reservations")
  .select("reserve_id, reserved_date, reserved_time, status, created_at, updated_at")
  .eq("patient_id", patientId)
  .order("created_at", { ascending: false });

if (resError) {
  console.error("エラー:", resError.message);
} else {
  console.log(`予約件数: ${reservations.length}件\n`);

  for (const res of reservations) {
    console.log(`reserve_id: ${res.reserve_id}`);
    console.log(`  reserved_date: ${res.reserved_date}`);
    console.log(`  reserved_time: ${res.reserved_time}`);
    console.log(`  status: ${res.status}`);
    console.log(`  created_at: ${res.created_at}`);
    console.log(`  updated_at: ${res.updated_at}`);
    console.log();
  }
}

// 2. intake テーブル
console.log("\n【2. intake テーブル】");
const { data: intake, error: intakeError } = await supabase
  .from("intake")
  .select("reserve_id, reserved_date, reserved_time, status, created_at, updated_at")
  .eq("patient_id", patientId)
  .single();

if (intakeError) {
  console.error("エラー:", intakeError.message);
} else {
  console.log(`reserve_id: ${intake.reserve_id || "null"}`);
  console.log(`reserved_date: ${intake.reserved_date || "null"}`);
  console.log(`reserved_time: ${intake.reserved_time || "null"}`);
  console.log(`status: ${intake.status || "null"}`);
  console.log(`created_at: ${intake.created_at}`);
  console.log(`updated_at: ${intake.updated_at}`);
}

console.log("\n=== 確認完了 ===");
