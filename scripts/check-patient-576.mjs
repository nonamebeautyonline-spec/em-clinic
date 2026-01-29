// scripts/check-patient-576.mjs
// patient_id=20260100576 の予約データを確認

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPatient576() {
  console.log("=== Patient ID: 20260100576 ===\n");

  // 1. reservations テーブルを確認
  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, created_at")
    .eq("patient_id", "20260100576")
    .order("created_at", { ascending: true });

  if (resError) {
    console.error("Error fetching reservations:", resError);
    return;
  }

  console.log(`Found ${reservations.length} reservations:\n`);
  reservations.forEach((res, index) => {
    console.log(`${index + 1}. reserve_id: ${res.reserve_id}`);
    console.log(`   Date/Time: ${res.reserved_date} ${res.reserved_time}`);
    console.log(`   Status: ${res.status}`);
    console.log(`   Created: ${res.created_at}`);
    console.log(`   patient_name: ${res.patient_name || "(null)"}`);
    console.log("");
  });

  // 2. intake テーブルを確認
  const { data: intakes, error: intError } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, created_at")
    .eq("patient_id", "20260100576")
    .order("created_at", { ascending: true });

  if (intError) {
    console.error("Error fetching intake:", intError);
    return;
  }

  console.log(`\nFound ${intakes.length} intake records:\n`);
  intakes.forEach((intake, index) => {
    console.log(`${index + 1}. patient_name: ${intake.patient_name || "(null)"}`);
    console.log(`   reserve_id: ${intake.reserve_id || "(null)"}`);
    console.log(`   reserved_date: ${intake.reserved_date || "(null)"}`);
    console.log(`   Created: ${intake.created_at}`);
    console.log("");
  });
}

checkPatient576();
