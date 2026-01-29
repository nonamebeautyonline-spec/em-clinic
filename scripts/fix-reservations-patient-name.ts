// scripts/fix-reservations-patient-patient_name.ts
// reservations.patient_name が null のレコードを answerers から補完

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// .env.localを手動でパース
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixReservationsPatientName() {
  console.log("=== Fix Reservations Patient Name ===\n");

  // 1. patient_name が null の予約を取得
  const { data: nullNameReservations, error: fetchError } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, patient_name")
    .is("patient_name", null);

  if (fetchError) {
    console.error("❌ Error fetching reservations:", fetchError);
    process.exit(1);
  }

  if (!nullNameReservations || nullNameReservations.length === 0) {
    console.log("✅ No reservations with null patient_name found. All good!");
    return;
  }

  console.log(`Found ${nullNameReservations.length} reservations with null patient_name\n`);

  let successCount = 0;
  let failCount = 0;
  let noNameCount = 0;

  for (const reservation of nullNameReservations) {
    const { reserve_id, patient_id } = reservation;

    // 2. intake テーブルから名前を取得（最新のレコード）
    const { data: intakeData, error: intakeError } = await supabase
      .from("intake")
      .select("patient_name")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intakeError) {
      console.error(`❌ Error fetching intake for patient_id=${patient_id}:`, intakeError);
      failCount++;
      continue;
    }

    if (!intakeData || !intakeData.patient_name) {
      console.log(`⚠️  No patient_name found in intake for patient_id=${patient_id}, reserve_id=${reserve_id}`);
      noNameCount++;
      continue;
    }

    const patientName = intakeData.patient_name;

    // 3. reservations テーブルを更新
    const { error: updateError } = await supabase
      .from("reservations")
      .update({ patient_name: patientName })
      .eq("reserve_id", reserve_id);

    if (updateError) {
      console.error(`❌ Error updating reserve_id=${reserve_id}:`, updateError);
      failCount++;
      continue;
    }

    console.log(`✅ Updated reserve_id=${reserve_id}, patient_id=${patient_id}, patient_name="${patientName}"`);
    successCount++;
  }

  console.log("\n=== Summary ===");
  console.log(`Total: ${nullNameReservations.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️  No patient_name in answerers: ${noNameCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

fixReservationsPatientName();
