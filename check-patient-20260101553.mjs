// check-patient-20260101553.mjs
// 患者 20260101553 のデータを確認

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

console.log("=== 患者 20260101553 のデータ確認 ===\n");

const { data, error } = await supabase
  .from("intake")
  .select("*")
  .eq("patient_id", "20260101553");

if (error) {
  console.error("❌ エラー:", error);
  process.exit(1);
}

if (data.length === 0) {
  console.log("⚠️  Supabaseにデータがありません");
  process.exit(0);
}

const record = data[0];
console.log("Patient ID:", record.patient_id);
console.log("Patient Name:", record.patient_name || "(なし)");
console.log("Reserve ID:", record.reserve_id || "(なし)");
console.log("Reserved Date:", record.reserved_date || "(なし)");
console.log("Reserved Time:", record.reserved_time || "(なし)");
console.log("Status:", record.status || "(なし)");
console.log("Note:", record.note || "(なし)");
console.log("Prescription Menu:", record.prescription_menu || "(なし)");
console.log("Line ID:", record.line_id || "(なし)");
console.log("Answerer ID:", record.answerer_id || "(なし)");
console.log("Created At:", new Date(record.created_at).toLocaleString("ja-JP"));
console.log("Updated At:", record.updated_at ? new Date(record.updated_at).toLocaleString("ja-JP") : "(なし)");

console.log("\n=== Answers ===");
if (record.answers) {
  console.log(JSON.stringify(record.answers, null, 2));
} else {
  console.log("(なし)");
}
