// check-ok-issue.mjs
// OKが反映されない患者のデータを確認

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// .env.productionから環境変数を読み込む
const envFile = readFileSync(".env.production", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientIds = ["20260101450", "20260101494", "20260101359"];

console.log("=== OKが反映されない患者のデータ確認 ===\n");

for (const patientId of patientIds) {
  console.log(`\n--- 患者ID: ${patientId} ---`);

  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId);

  if (error) {
    console.error("❌ エラー:", error);
    continue;
  }

  if (data.length === 0) {
    console.log("⚠️  Supabaseにデータがありません");
    continue;
  }

  const record = data[0];
  console.log("Patient Name:", record.patient_name || "(なし)");
  console.log("Reserve ID:", record.reserve_id || "(なし)");
  console.log("Reserved Date:", record.reserved_date || "(なし)");
  console.log("Reserved Time:", record.reserved_time || "(なし)");
  console.log("Status:", record.status || "(なし)");
  console.log("Note:", record.note || "(なし)");
  console.log("Prescription Menu:", record.prescription_menu || "(なし)");
  console.log("Created At:", new Date(record.created_at).toLocaleString("ja-JP"));
  console.log("Updated At:", record.updated_at ? new Date(record.updated_at).toLocaleString("ja-JP") : "(なし)");
}
