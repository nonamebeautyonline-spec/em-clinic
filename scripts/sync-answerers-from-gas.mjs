// scripts/sync-answerers-from-gas.mjs
// GASの問診マスターシートからanswerersテーブルにデータを同期

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

// GASから問診マスターデータを取得
async function fetchMasterFromGAS() {
  console.log("Fetching master data from GAS...");

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

async function syncAnswerersFromGAS() {
  console.log("=== Sync Answerers from GAS ===\n");

  // 1. GASからデータ取得
  const gasRows = await fetchMasterFromGAS();

  // 2. patient_idごとにユニークなマスターデータを作成
  const masterMap = new Map();

  for (const row of gasRows) {
    if (!row.patient_id) continue;

    // 既存レコードがあれば、より新しい情報で上書き
    if (!masterMap.has(row.patient_id) || row.name) {
      masterMap.set(row.patient_id, {
        patient_id: row.patient_id,
        answerer_id: row.answerer_id || null,
        line_id: row.line_id || null,
        name: row.name || null,
        name_kana: row.nameKana || null,
        sex: row.sex || null,
        birthday: row.birth || null,
        tel: row.tel || null
      });
    }
  }

  console.log(`Found ${masterMap.size} unique patient records in GAS\n`);

  // 3. upsertで一括処理（新規作成・更新を自動判定）
  const allRecords = Array.from(masterMap.values());

  console.log(`Upserting ${allRecords.length} records to Supabase...\n`);

  const batchSize = 100;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);

    const { error } = await supabase
      .from("answerers")
      .upsert(batch, {
        onConflict: "patient_id",
      });

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      failCount += batch.length;
    } else {
      successCount += batch.length;
      console.log(`  ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records (累計: ${successCount})`);
    }
  }

  console.log("\n=== Sync Complete ===");
  console.log(`Total: ${masterMap.size} unique patients`);
  console.log(`Success: ${successCount}`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount}`);
  }
}

syncAnswerersFromGAS();
