// check-sample-patient.mjs
// サンプル患者のデータを詳細確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientId = "20251200911"; // 最初の欠損データ

const { data, error } = await supabase
  .from("intake")
  .select("*")
  .eq("patient_id", patientId)
  .single();

if (error) {
  console.error("❌ エラー:", error);
  process.exit(1);
}

console.log("=== Patient", patientId, "===\n");
console.log("patient_name:", data.patient_name);
console.log("answerer_id:", data.answerer_id);
console.log("\nanswers.氏名:", data.answers?.氏名);
console.log("answers.name:", data.answers?.name);
console.log("answers.answerer_id:", data.answers?.answerer_id);
console.log("\n判定:");
console.log("  patient_nameが空?", !data.patient_name);
console.log("  answerer_idが空?", !data.answerer_id);
console.log("  answers.氏名が空?", !data.answers?.氏名);
console.log("  answers.nameが空?", !data.answers?.name);
