// scripts/check-patient-20260100211.mjs
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
const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

async function check() {
  console.log("=== patient_id: 20260100211 の確認 ===\n");

  // 0. Supabase intakeテーブル確認
  console.log("【0】Supabase intake:");
  const { data: intakeData, error: intakeError } = await supabase
    .from('intake')
    .select('*')
    .eq('patient_id', '20260100211')
    .maybeSingle();

  if (intakeError) {
    console.log('  ❌ エラー:', intakeError.message);
  } else if (!intakeData) {
    console.log('  ❌ 存在しません');
  } else {
    console.log('  ✅ 存在します:');
    console.log(`    patient_name: ${intakeData.patient_name}`);
    console.log(`    reserve_id: ${intakeData.reserve_id || 'NULL'}`);
    console.log(`    reserved_date: ${intakeData.reserved_date || 'NULL'}`);
    console.log(`    reserved_time: ${intakeData.reserved_time || 'NULL'}`);
  }

  // 1. Supabaseで確認
  console.log("\n【1】Supabase reservations:");
  const { data: supabaseData, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('patient_id', '20260100211');

  if (error) {
    console.log('  ❌ エラー:', error.message);
  } else if (!supabaseData || supabaseData.length === 0) {
    console.log('  ❌ 存在しません');
  } else {
    console.log(`  ✅ ${supabaseData.length}件存在:`);
    supabaseData.forEach(r => {
      console.log(`    reserve_id: ${r.reserve_id}`);
      console.log(`    date/time: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`    status: ${r.status}`);
      console.log();
    });
  }

  // 2. GASで確認
  console.log("\n【2】GAS予約シート:");
  const gasResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      token: adminToken,
    }),
  });

  const gasData = await gasResponse.json();
  const gasReservations = gasData.reservations || [];
  const gasMatches = gasReservations.filter(r => {
    const pid = r.patient_id || r.patientId;
    return pid === "20260100211";
  });

  if (gasMatches.length === 0) {
    console.log('  ❌ 存在しません');
  } else {
    console.log(`  ✅ ${gasMatches.length}件存在:`);
    gasMatches.forEach(r => {
      const reserveId = r.reserve_id || r.reserveId;
      const date = r.date || r.reserved_date;
      const time = r.time || r.reserved_time;
      const status = r.status || "";
      console.log(`    reserve_id: ${reserveId}`);
      console.log(`    date/time: ${date} ${time}`);
      console.log(`    status: ${status}`);
      console.log();
    });
  }
}

check();
