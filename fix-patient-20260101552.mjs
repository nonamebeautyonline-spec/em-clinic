// fix-patient-20260101552.mjs
// 患者 20260101552 のデータを補完

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
const gasIntakeUrl = envVars.GAS_INTAKE_URL;

if (!supabaseUrl || !supabaseKey || !gasIntakeUrl) {
  console.error("❌ 環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 患者 20260101552 をGASから取得して補完 ===\n");

// GASから問診データを取得
const gasUrl = gasIntakeUrl + "?type=getDashboard&patient_id=20260101552&full=1";
const response = await fetch(gasUrl);
const dashboard = await response.json();

console.log("GASレスポンス:", JSON.stringify(dashboard, null, 2));

if (!dashboard.intake || !dashboard.intake.name) {
  console.log("⚠️ GASにも氏名データがありません");
  process.exit(0);
}

// Supabaseを更新
const { data, error } = await supabase
  .from("intake")
  .update({
    patient_name: dashboard.intake.name,
    answers: {
      ...dashboard.intake.answers,
      氏名: dashboard.intake.name,
      name: dashboard.intake.name,
      性別: dashboard.intake.sex,
      sex: dashboard.intake.sex,
      生年月日: dashboard.intake.birth,
      birth: dashboard.intake.birth,
      カナ: dashboard.intake.name_kana,
      name_kana: dashboard.intake.name_kana,
      電話番号: dashboard.intake.tel,
      tel: dashboard.intake.tel
    }
  })
  .eq("patient_id", "20260101552");

if (error) {
  console.error("❌ 更新失敗:", error);
  process.exit(1);
}

console.log("✅ 更新成功");
console.log("氏名:", dashboard.intake.name);
console.log("性別:", dashboard.intake.sex);
console.log("生年月日:", dashboard.intake.birth);
