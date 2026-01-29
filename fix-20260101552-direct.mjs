// fix-20260101552-direct.mjs
// GASログから取得した情報で直接更新

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

console.log("=== 患者 20260101552 を更新 ===\n");

// GASログから取得した情報
const name = "平田";
const sex = "女";
const birth = "1991-05-10"; // Fri May 10 1991

const { data, error } = await supabase
  .from("intake")
  .update({
    patient_name: name,
    answers: {
      glp_history: "",
      ng_check: "",
      med_yesno: "",
      allergy_yesno: "",
      current_disease_yesno: "",
      entry_route: "",
      氏名: name,
      name: name,
      性別: sex,
      sex: sex,
      生年月日: birth,
      birth: birth,
      カナ: "",
      name_kana: "",
      電話番号: "",
      tel: ""
    }
  })
  .eq("patient_id", "20260101552");

if (error) {
  console.error("❌ 更新失敗:", error);
  process.exit(1);
}

console.log("✅ 更新成功");
console.log("氏名:", name);
console.log("性別:", sex);
console.log("生年月日:", birth);
