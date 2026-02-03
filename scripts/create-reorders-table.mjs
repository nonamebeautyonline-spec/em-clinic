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

console.log("=== reordersテーブル作成 ===\n");

// テーブルが既に存在するか確認
const { data: existingTable, error: checkError } = await supabase
  .from("reorders")
  .select("id")
  .limit(1);

if (!checkError) {
  console.log("✅ reordersテーブルは既に存在します");

  // カラム構造を確認
  const { data: sampleData } = await supabase
    .from("reorders")
    .select("*")
    .limit(1);

  if (sampleData && sampleData.length > 0) {
    console.log("\nカラム:", Object.keys(sampleData[0]).join(", "));
  }

  // 件数確認
  const { count } = await supabase
    .from("reorders")
    .select("*", { count: "exact", head: true });

  console.log(`件数: ${count}件`);
  process.exit(0);
}

console.log("reordersテーブルが存在しません。作成します...\n");

// Supabase Dashboard でテーブルを作成するためのSQL
const createTableSQL = `
-- Supabase Dashboard の SQL Editor で実行してください:

CREATE TABLE IF NOT EXISTS reorders (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id VARCHAR(20) NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  note TEXT,
  line_uid VARCHAR(100),
  lstep_uid VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  gas_row_number INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reorders_patient_id ON reorders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reorders_status ON reorders(status);
CREATE INDEX IF NOT EXISTS idx_reorders_timestamp ON reorders(timestamp DESC);
`;

console.log("以下のSQLをSupabase DashboardのSQL Editorで実行してください:");
console.log("=".repeat(60));
console.log(createTableSQL);
console.log("=".repeat(60));

console.log("\n実行後、このスクリプトを再度実行して確認してください。");
