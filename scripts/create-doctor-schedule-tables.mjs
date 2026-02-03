// scripts/create-doctor-schedule-tables.mjs
// Drシフト管理用テーブルの作成・確認スクリプト

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

console.log("=== Drシフト管理テーブル確認 ===\n");

// 各テーブルの存在確認と件数チェック
const tables = ["doctors", "doctor_weekly_rules", "doctor_date_overrides"];

for (const table of tables) {
  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.log(`❌ ${table}: テーブルが存在しません`);
    console.log(`   → migrations/create_doctor_schedule_tables.sql をSupabase SQL Editorで実行してください`);
  } else {
    console.log(`✅ ${table}: ${count}件`);
  }
}

console.log("\n完了");
