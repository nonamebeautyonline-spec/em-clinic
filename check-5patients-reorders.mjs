// check-5patients-reorders.mjs
// 5人の患者の再処方データを確認

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

const patientIds = ["20251200832", "20251201077", "20260100025", "20260100295"];

console.log("=== 5人の患者の再処方データ確認 ===\n");

for (const pid of patientIds) {
  console.log(`\n========== 患者ID: ${pid} ==========`);

  // reordersテーブル確認
  const { data: reorderData, error: reorderError } = await supabase
    .from("reorders")
    .select("*")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  if (reorderError) {
    console.error("❌ reordersテーブルエラー:", reorderError);
    continue;
  }

  if (reorderData.length === 0) {
    console.log("⚠️  再処方データなし");
  } else {
    console.log(`✅ 再処方データ: ${reorderData.length}件`);
    for (const r of reorderData) {
      console.log(`\n   Reorder ID: ${r.reorder_id}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Approved: ${r.approved ? "はい" : "いいえ"}`);
      console.log(`   Menu: ${r.menu || "(なし)"}`);
      console.log(`   Note: ${r.note || "(なし)"}`);
      console.log(`   Created: ${new Date(r.created_at).toLocaleString("ja-JP")}`);
      console.log(`   Updated: ${r.updated_at ? new Date(r.updated_at).toLocaleString("ja-JP") : "(なし)"}`);
    }
  }

  // intakeテーブルのstatus確認
  const { data: intakeData } = await supabase
    .from("intake")
    .select("status, patient_name")
    .eq("patient_id", pid)
    .single();

  if (intakeData) {
    console.log(`\n   【問診】氏名: ${intakeData.patient_name}, Status: ${intakeData.status}`);
  }
}

console.log("\n=== 完了 ===");
