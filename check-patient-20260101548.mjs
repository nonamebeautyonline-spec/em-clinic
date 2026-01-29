// check-patient-20260101548.mjs
// 患者 20260101548 のデータを確認

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

console.log("=== 患者 20260101548 のデータ確認 ===\n");

const patientId = "20260101548";

try {
  // intakeテーブルを確認
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId);

  if (intakeError) {
    console.error("❌ intake クエリエラー:", intakeError);
  } else {
    console.log(`intake テーブル: ${intakeData.length}件\n`);

    if (intakeData.length > 0) {
      const record = intakeData[0];
      console.log("Patient ID:", record.patient_id);
      console.log("Patient Name:", record.patient_name || "(なし)");
      console.log("Answerer ID:", record.answerer_id || "(なし)");
      console.log("Status:", record.status);
      console.log("Created at:", new Date(record.created_at).toLocaleString("ja-JP"));
      console.log("\nAnswers object:");
      console.log("  氏名:", record.answers?.氏名 || "(なし)");
      console.log("  name:", record.answers?.name || "(なし)");
      console.log("  性別:", record.answers?.性別 || "(なし)");
      console.log("  カナ:", record.answers?.カナ || "(なし)");
      console.log("  電話番号:", record.answers?.電話番号 || "(なし)");
      console.log("  answerer_id:", record.answers?.answerer_id || "(なし)");

      console.log("\n=== 判定 ===");
      const issues = [];
      if (!record.patient_name) issues.push("patient_name");
      if (!record.answerer_id) issues.push("answerer_id");
      if (!record.answers?.氏名 && !record.answers?.name) issues.push("answers.氏名/name");
      if (!record.answers?.性別) issues.push("answers.性別");
      if (!record.answers?.カナ) issues.push("answers.カナ");
      if (!record.answers?.電話番号 && !record.answers?.tel) issues.push("answers.電話番号/tel");

      if (issues.length > 0) {
        console.log("❌ 欠損フィールド:", issues.join(", "));
      } else {
        console.log("✅ 全ての個人情報が揃っています");
      }
    } else {
      console.log("⚠️  intakeテーブルにデータがありません");
    }
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
