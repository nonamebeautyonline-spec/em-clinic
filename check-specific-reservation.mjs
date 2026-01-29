// check-specific-reservation.mjs
// 特定の予約の詳細を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const reserveId = "resv-1768464596770";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`=== Checking reservation ${reserveId} ===\n`);

try {
  // reservationsテーブルから取得
  const { data: resData, error: resError } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserve_id", reserveId)
    .single();

  if (resError || !resData) {
    console.log("✗ Not found in reservations table");
  } else {
    console.log("=== Reservations Table ===");
    console.log(`  reserve_id: ${resData.reserve_id}`);
    console.log(`  patient_id: ${resData.patient_id}`);
    console.log(`  patient_name: ${resData.patient_name}`);
    console.log(`  reserved_date: ${resData.reserved_date}`);
    console.log(`  reserved_time: ${resData.reserved_time}`);
    console.log(`  status: ${resData.status}`);
    console.log(`  created_at: ${resData.created_at}`);
  }

  // intakeテーブルから取得
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("reserve_id", reserveId)
    .single();

  if (intakeError || !intakeData) {
    console.log("\n✗ Not found in intake table");
  } else {
    console.log("\n=== Intake Table ===");
    console.log(`  reserve_id: ${intakeData.reserve_id}`);
    console.log(`  patient_id: ${intakeData.patient_id}`);
    console.log(`  patient_name: ${intakeData.patient_name}`);
    console.log(`  reserved_date: ${intakeData.reserved_date}`);
    console.log(`  reserved_time: ${intakeData.reserved_time}`);
    console.log(`  status: ${intakeData.status}`);
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
