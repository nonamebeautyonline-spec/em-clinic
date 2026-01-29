// scripts/sync-missing-intake-from-gas.mjs
// GASシートからintakeテーブルへの欠落データを補完

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

  let rows;
  if (gasData.ok && Array.isArray(gasData.rows)) {
    rows = gasData.rows;
  } else if (Array.isArray(gasData)) {
    rows = gasData;
  } else {
    throw new Error("Invalid GAS response");
  }

  console.log(`Fetched ${rows.length} rows from GAS\n`);
  return rows;
}

async function syncMissingIntakeFromGAS() {
  console.log("=== Sync Missing Intake Data from GAS ===\n");

  // 1. GASから全データを取得
  const gasRows = await fetchAllIntakeFromGAS();

  // 2. patient_id をキーにしたマップを作成
  const gasMap = new Map();
  for (const row of gasRows) {
    if (row.patient_id) {
      gasMap.set(row.patient_id, row);
    }
  }

  console.log(`GAS has ${gasMap.size} unique patient records\n`);

  // 3. Supabaseから全intakeデータを取得
  console.log("Fetching all intake data from Supabase...");
  const { data: supabaseIntakes, error: fetchError } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, line_id, sex, birthday, tel");

  if (fetchError) {
    console.error("Error fetching from Supabase:", fetchError);
    process.exit(1);
  }

  console.log(`Supabase has ${supabaseIntakes.length} intake records\n`);

  // 4. Supabaseのpatient_idセットを作成
  const supabasePatientIds = new Set(supabaseIntakes.map(i => i.patient_id));

  // 5. 欠落・不完全なデータを特定
  let missingCount = 0;
  let incompleteCount = 0;
  let upToDateCount = 0;

  const toCreate = [];
  const toUpdate = [];

  for (const [patientId, gasData] of gasMap.entries()) {
    if (!supabasePatientIds.has(patientId)) {
      // 完全に欠落
      missingCount++;
      toCreate.push({
        patient_id: patientId,
        patient_name: gasData.name || null,
        answerer_id: gasData.answerer_id || null,
        line_id: gasData.line_id || null,
        sex: gasData.sex || null,
        birthday: gasData.birth || null,
        tel: gasData.tel || null,
        reserve_id: gasData.reserve_id || null,
        reserved_date: gasData.reserved_date || null,
        reserved_time: gasData.reserved_time || null,
        status: gasData.status || null,
        note: gasData.note || null,
        prescription_menu: gasData.prescription_menu || null,
        answers: {}
      });
    } else {
      // 存在するが、フィールドが不完全かチェック
      const supabaseData = supabaseIntakes.find(i => i.patient_id === patientId);

      const needsUpdate =
        !supabaseData.patient_name ||
        !supabaseData.sex ||
        !supabaseData.birthday ||
        !supabaseData.tel;

      if (needsUpdate) {
        incompleteCount++;
        toUpdate.push({
          patient_id: patientId,
          updates: {
            patient_name: gasData.name || supabaseData.patient_name,
            answerer_id: gasData.answerer_id || supabaseData.answerer_id,
            line_id: gasData.line_id || supabaseData.line_id,
            sex: gasData.sex || supabaseData.sex,
            birthday: gasData.birth || supabaseData.birthday,
            tel: gasData.tel || supabaseData.tel
          }
        });
      } else {
        upToDateCount++;
      }
    }
  }

  console.log("--- Status ---");
  console.log(`Missing in Supabase: ${missingCount}`);
  console.log(`Incomplete in Supabase: ${incompleteCount}`);
  console.log(`Up to date: ${upToDateCount}\n`);

  // 6. 欠落データを作成
  if (toCreate.length > 0) {
    console.log(`Creating ${toCreate.length} missing records...\n`);

    for (const record of toCreate) {
      console.log(`  Creating patient_id=${record.patient_id} (${record.patient_name})`);

      const { error } = await supabase
        .from("intake")
        .insert(record);

      if (error) {
        console.error(`    ❌ Failed:`, error.message);
      } else {
        console.log(`    ✅ Created`);
      }
    }
  }

  // 7. 不完全データを更新
  if (toUpdate.length > 0) {
    console.log(`\nUpdating ${toUpdate.length} incomplete records...\n`);

    for (const { patient_id, updates } of toUpdate) {
      console.log(`  Updating patient_id=${patient_id} (${updates.patient_name})`);

      const { error } = await supabase
        .from("intake")
        .update(updates)
        .eq("patient_id", patient_id);

      if (error) {
        console.error(`    ❌ Failed:`, error.message);
      } else {
        console.log(`    ✅ Updated`);
      }
    }
  }

  console.log("\n=== Sync Complete ===");
}

syncMissingIntakeFromGAS();
