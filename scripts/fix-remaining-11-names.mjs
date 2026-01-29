// scripts/fix-remaining-11-names.mjs
// 残り11件のpatient_nameをGASから取得して補完
// 重複予約がある場合は手動で確認

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
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

// GASから全問診データを取得
async function fetchAllIntakeFromGAS() {
  console.log("Fetching all intake data from GAS...");

  const response = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`GAS fetch failed: ${response.status}`);
  }

  const gasData = await response.json();

  // GASはokとrowsを返すか、直接配列を返すかのどちらか
  let rows;
  if (gasData.ok && Array.isArray(gasData.rows)) {
    rows = gasData.rows;
  } else if (Array.isArray(gasData)) {
    rows = gasData;
  } else {
    throw new Error("Invalid GAS response");
  }

  console.log(`Fetched ${rows.length} rows from GAS\n`);

  // patient_id をキーにしたマップを作成
  const intakeMap = {};
  for (const row of rows) {
    if (row.patient_id && row.name) {
      intakeMap[row.patient_id] = row.name;
    }
  }

  return intakeMap;
}

async function fixRemaining11Names() {
  console.log("=== Fix Remaining 11 Patient Names ===\n");

  // 対象のpatient_id
  const targetPatientIds = [
    "20260100576", // 9件
    "20260101592", // 1件
    "20251200229", // 1件
  ];

  // GASから全データを取得
  const intakeMap = await fetchAllIntakeFromGAS();

  let successCount = 0;
  let failCount = 0;
  let notFoundCount = 0;

  for (const patientId of targetPatientIds) {
    console.log(`\nProcessing patient_id=${patientId}...`);

    // GASから名前を取得
    const patientName = intakeMap[patientId];

    if (!patientName) {
      console.log(`  ⚠️  Not found in GAS`);
      notFoundCount++;

      // Supabaseでこのpatient_idの予約数を確認
      const { data: reservations } = await supabase
        .from("reservations")
        .select("reserve_id")
        .eq("patient_id", patientId)
        .is("patient_name", null);

      if (reservations && reservations.length > 0) {
        console.log(`  → ${reservations.length} reservations still have null patient_name`);
      }
      continue;
    }

    console.log(`  Found name in GAS: "${patientName}"`);

    // このpatient_idの全予約を更新
    const { data: updated, error: updateError } = await supabase
      .from("reservations")
      .update({ patient_name: patientName })
      .eq("patient_id", patientId)
      .is("patient_name", null)
      .select("reserve_id");

    if (updateError) {
      console.error(`  ❌ Error updating:`, updateError);
      failCount++;
      continue;
    }

    const count = updated ? updated.length : 0;
    console.log(`  ✅ Updated ${count} reservations`);
    successCount += count;
  }

  console.log("\n=== Summary ===");
  console.log(`✅ Success: ${successCount} reservations updated`);
  console.log(`⚠️  Not found in GAS: ${notFoundCount} patients`);
  console.log(`❌ Failed: ${failCount}`);
}

fixRemaining11Names();
