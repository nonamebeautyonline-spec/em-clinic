// check-timeout-4patients.mjs
// タイムアウトした4人のデータを確認

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

const patientIds = ["20260101554", "20260101555", "20260101556", "20260101557"];

console.log("=== タイムアウトした4人のデータ確認 ===\n");

for (const pid of patientIds) {
  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", pid);

  if (error) {
    console.error(`❌ ${pid}: エラー`, error);
    continue;
  }

  if (data.length === 0) {
    console.log(`⚠️  ${pid}: Supabaseにデータがありません（問診提出が完了していない）`);
    continue;
  }

  const record = data[0];
  const hasName = record.patient_name || record.answers?.氏名 || record.answers?.name;
  const hasSex = record.answers?.性別 || record.answers?.sex;
  const hasBirth = record.answers?.生年月日 || record.answers?.birth;

  if (!hasName) {
    console.log(`❌ ${pid}: 氏名なし - 補完が必要`);
    console.log(`   Created: ${new Date(record.created_at).toLocaleString("ja-JP")}`);
  } else {
    console.log(`✅ ${pid}: ${hasName} - データあり`);
    console.log(`   性別: ${hasSex || "(なし)"}`);
    console.log(`   生年月日: ${hasBirth || "(なし)"}`);
    console.log(`   Created: ${new Date(record.created_at).toLocaleString("ja-JP")}`);
  }
  console.log("");
}
