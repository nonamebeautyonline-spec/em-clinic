// scripts/check-intake-sync-status.mjs
// GASとSupabaseのintakeデータの同期状況を確認

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

console.log("=== GAS-Supabase intake同期状況確認 ===\n");

async function checkSyncStatus() {
  // 1. GASから全問診データ取得（API制限1000件を考慮）
  console.log("【1】GASから問診データ取得中...");

  // 過去90日分を取得（それ以上古いデータは同期不要と判断）
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 90);
  const fromDate = from.toISOString().split("T")[0];
  const toDate = today.toISOString().split("T")[0];

  const url = `${gasIntakeListUrl}?from=${fromDate}&to=${toDate}`;
  const response = await fetch(url, { method: "GET" });
  const gasIntakeData = await response.json();

  if (!Array.isArray(gasIntakeData)) {
    console.log("❌ GASからのデータが配列ではありません");
    return;
  }

  console.log(`✅ GASから${gasIntakeData.length}件取得\n`);

  // 2. Supabaseから全intakeデータ取得
  console.log("【2】Supabase intakeテーブル確認中...");

  const { data: supabaseIntakeData, count } = await supabase
    .from("intake")
    .select("patient_id", { count: "exact" });

  console.log(`✅ Supabaseに${count}件のレコード\n`);

  // 3. 差分確認
  const supabasePatientIds = new Set((supabaseIntakeData || []).map(r => r.patient_id));

  const missingInSupabase = gasIntakeData.filter(row => {
    const patientId = String(row.patient_id || "");
    return patientId && !supabasePatientIds.has(patientId);
  });

  console.log("【3】同期状況:");
  console.log(`  GAS: ${gasIntakeData.length}件（過去90日分）`);
  console.log(`  Supabase: ${count}件（全件）`);
  console.log(`  Supabaseに不足: ${missingInSupabase.length}件\n`);

  if (missingInSupabase.length > 0) {
    console.log("【4】不足しているpatient_id（最初の20件）:");
    missingInSupabase.slice(0, 20).forEach((row, idx) => {
      const patientId = String(row.patient_id || "");
      const name = row.name || row.patient_name || "";
      const submitted = row.submittedAt || row.timestamp || "";
      console.log(`  [${idx + 1}] ${patientId} - ${name} (${submitted})`);
    });

    if (missingInSupabase.length > 20) {
      console.log(`  ... 他${missingInSupabase.length - 20}件`);
    }
  } else {
    console.log("✅ 全てのGASデータがSupabaseに同期されています");
  }
}

checkSyncStatus().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
