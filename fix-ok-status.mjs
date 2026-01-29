// fix-ok-status.mjs
// シートでOKになっているのにSupabaseに反映されていない患者を修正

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

// シートでOKになっている患者（手動で確認した値を入力）
const updates = [
  {
    patient_id: "20260101367",
    status: "OK",
    note: `2026年1月28日18時45分
GLP-1 使用歴
使用歴なし
嘔気・嘔吐や低血糖に関する副作用の説明を行った。
使用方法に関して説明を実施し、パンフレットの案内を行った。
以上より上記の用量の処方を行う方針とした。`,
    prescription_menu: "2.5mg"
  },
  {
    patient_id: "20260101547",
    status: "OK",
    note: `2026年1月28日18時45分
GLP-1 使用歴
使用歴なし
嘔気・嘔吐や低血糖に関する副作用の説明を行った。
使用方法に関して説明を実施し、パンフレットの案内を行った。
以上より上記の用量の処方を行う方針とした。`,
    prescription_menu: "2.5mg"
  },
];

console.log("=== Supabaseのステータスを手動で更新 ===\n");

for (const update of updates) {
  console.log(`患者ID: ${update.patient_id}`);

  const { data, error } = await supabase
    .from("intake")
    .update({
      status: update.status,
      note: update.note,
      prescription_menu: update.prescription_menu,
      updated_at: new Date().toISOString()
    })
    .eq("patient_id", update.patient_id);

  if (error) {
    console.error(`  ❌ エラー:`, error);
  } else {
    console.log(`  ✅ 更新成功`);
  }
}

console.log("\n=== 完了 ===");
console.log("カルテ画面を再読み込みして確認してください。");
