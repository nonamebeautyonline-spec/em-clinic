// check-today-intake-timing.mjs
// 今日の問診提出のタイミングを確認

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

console.log("=== 2026-01-28 の問診提出状況 ===\n");

const { data, error } = await supabase
  .from("intake")
  .select("patient_id, patient_name, answers, created_at")
  .gte("created_at", "2026-01-28T00:00:00")
  .lte("created_at", "2026-01-28T23:59:59")
  .order("created_at", { ascending: true });

if (error) {
  console.error("❌ エラー:", error);
  process.exit(1);
}

console.log(`合計: ${data.length}件\n`);

let emptyNameCount = 0;
let hasNameCount = 0;

for (const record of data) {
  const createdAt = new Date(record.created_at);
  const jstTime = createdAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const hasName = record.patient_name || record.answers?.氏名 || record.answers?.name;

  if (!hasName) {
    emptyNameCount++;
    console.log(`❌ ${record.patient_id} - ${jstTime} - 氏名なし`);
  } else {
    hasNameCount++;
    console.log(`✅ ${record.patient_id} - ${jstTime} - ${hasName}`);
  }
}

console.log(`\n=== 統計 ===`);
console.log(`氏名あり: ${hasNameCount}件`);
console.log(`氏名なし: ${emptyNameCount}件`);
console.log(`氏名なしの割合: ${((emptyNameCount / data.length) * 100).toFixed(1)}%`);
