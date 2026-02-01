// scripts/investigate-patient-id-mismatch.mjs
// patient_id不一致の原因調査

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
const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;

console.log("=== patient_id不一致の原因調査 ===\n");

async function investigate() {
  // 1. GASデータ確認
  console.log("【1】GASデータ確認...");

  const response = await fetch(gasIntakeListUrl, { method: "GET" });
  const gasData = await response.json();

  const gasPatientIds = gasData.map(r => String(r.patient_id || ""));
  const uniqueGasPatientIds = new Set(gasPatientIds);

  console.log(`  GAS総件数: ${gasData.length}件`);
  console.log(`  ユニークpatient_id: ${uniqueGasPatientIds.size}件`);
  console.log(`  重複: ${gasData.length - uniqueGasPatientIds.size}件\n`);

  // 2. Supabaseデータ確認（ページング処理で1000件制限を回避）
  console.log("【2】Supabaseデータ確認...");

  let supabaseData = [];
  let hasMore = true;
  let offset = 0;
  const pageSize = 1000;

  while (hasMore) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id")
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Supabaseエラー:", error);
      break;
    }

    if (data && data.length > 0) {
      supabaseData = supabaseData.concat(data);
      offset += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const supabasePatientIds = supabaseData.map(r => r.patient_id);
  const uniqueSupabasePatientIds = new Set(supabasePatientIds);

  console.log(`  Supabase総件数: ${supabaseData.length}件`);
  console.log(`  ユニークpatient_id: ${uniqueSupabasePatientIds.size}件`);
  console.log(`  重複: ${supabaseData.length - uniqueSupabasePatientIds.size}件\n`);

  // 3. GASにあってSupabaseにないpatient_id
  const missingInSupabase = Array.from(uniqueGasPatientIds).filter(pid =>
    pid && pid !== "" && !uniqueSupabasePatientIds.has(pid)
  );

  console.log("【3】GASにあってSupabaseにない patient_id:");
  console.log(`  件数: ${missingInSupabase.length}件`);

  if (missingInSupabase.length > 0) {
    console.log(`  最初の20件:`);
    missingInSupabase.slice(0, 20).forEach((pid, idx) => {
      const gasRecord = gasData.find(r => String(r.patient_id) === pid);
      console.log(`    [${idx + 1}] ${pid} - ${gasRecord?.name || "(名前なし)"}`);
    });
  }

  console.log();

  // 4. Supabaseにあって GASにないpatient_id
  const missingInGas = Array.from(uniqueSupabasePatientIds).filter(pid =>
    pid && pid !== "" && !uniqueGasPatientIds.has(pid)
  );

  console.log("【4】SupabaseにあってGASにない patient_id:");
  console.log(`  件数: ${missingInGas.length}件`);

  if (missingInGas.length > 0) {
    console.log(`  最初の20件:`);
    missingInGas.slice(0, 20).forEach((pid, idx) => {
      console.log(`    [${idx + 1}] ${pid}`);
    });
  }

  console.log();

  // 5. GASの重複patient_id確認
  const gasPatientIdCounts = {};
  gasPatientIds.forEach(pid => {
    if (pid && pid !== "") {
      gasPatientIdCounts[pid] = (gasPatientIdCounts[pid] || 0) + 1;
    }
  });

  const duplicatesInGas = Object.entries(gasPatientIdCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log("【5】GASの重複 patient_id:");
  console.log(`  重複しているpatient_id: ${duplicatesInGas.length}件`);

  if (duplicatesInGas.length > 0) {
    console.log(`  最も重複が多い20件:`);
    duplicatesInGas.slice(0, 20).forEach(([pid, count], idx) => {
      const records = gasData.filter(r => String(r.patient_id) === pid);
      const name = records[0]?.name || "(名前なし)";
      console.log(`    [${idx + 1}] ${pid} (${count}回) - ${name}`);
    });
  }

  console.log("\n=== 調査完了 ===");
}

investigate().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
