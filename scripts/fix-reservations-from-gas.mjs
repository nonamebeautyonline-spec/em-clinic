// scripts/fix-reservations-from-gas.mjs
// intake テーブルにも patient_name がない場合、GAS から取得して補完

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
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

// GAS から問診データを取得
async function fetchIntakeFromGAS(patientId) {
  const response = await fetch(gasIntakeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getIntakeByPatientId",
      patient_id: patientId,
    }),
  });

  if (!response.ok) {
    throw new Error(`GAS request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.ok || !data.intake) {
    return null;
  }

  return data.intake;
}

async function fixReservationsFromGAS() {
  console.log("=== Fix Reservations Patient Name from GAS ===\n");

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

  // 2. patient_id でグループ化（同じpatient_idの予約をまとめる）
  const groupedByPatientId = {};
  for (const reservation of nullNameReservations) {
    const pid = reservation.patient_id;
    if (!groupedByPatientId[pid]) {
      groupedByPatientId[pid] = [];
    }
    groupedByPatientId[pid].push(reservation);
  }

  let successCount = 0;
  let failCount = 0;
  let noNameCount = 0;

  // 3. patient_id ごとに GAS から名前を取得して更新
  for (const [patientId, reservations] of Object.entries(groupedByPatientId)) {
    console.log(`\nProcessing patient_id=${patientId} (${reservations.length} reservations)...`);

    try {
      // GAS から問診データを取得
      const intakeData = await fetchIntakeFromGAS(patientId);

      if (!intakeData || !intakeData.name) {
        console.log(`⚠️  No name found in GAS for patient_id=${patientId}`);
        noNameCount += reservations.length;
        continue;
      }

      const patientName = intakeData.name;
      console.log(`  Found name: "${patientName}"`);

      // このpatient_idの全予約を更新
      for (const reservation of reservations) {
        const { error: updateError } = await supabase
          .from("reservations")
          .update({ patient_name: patientName })
          .eq("reserve_id", reservation.reserve_id);

        if (updateError) {
          console.error(`  ❌ Error updating reserve_id=${reservation.reserve_id}:`, updateError);
          failCount++;
          continue;
        }

        console.log(`  ✅ Updated reserve_id=${reservation.reserve_id}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing patient_id=${patientId}:`, error.message);
      failCount += reservations.length;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total: ${nullNameReservations.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️  No name in GAS: ${noNameCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

fixReservationsFromGAS();
