// intakeテーブルのpatient_idユニーク制約を削除するスクリプト
// 同一患者に対して複数のintakeレコード（再処方決済カルテ等）を追加するために必要
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("環境変数が不足しています");
  process.exit(1);
}

// Supabase REST APIでは直接SQLを実行できないので、
// Supabaseダッシュボードで以下のSQLを実行してください：
console.log("=== 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください ===\n");
console.log("ALTER TABLE intake DROP CONSTRAINT IF EXISTS intake_patient_id_key;\n");
console.log("確認用:");
console.log("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'intake'::regclass AND conname = 'intake_patient_id_key';");
