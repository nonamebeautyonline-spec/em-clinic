// medical_vocabulary テーブル作成 — Supabase Management API 経由
// supabase CLI ログイン不要版（service_role_key + REST で確認）
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("=== medical_vocabulary テーブル確認・作成 ===\n");

  // 1. テーブルが既に存在するか確認
  const { data, error } = await supabase
    .from("medical_vocabulary")
    .select("id")
    .limit(1);

  if (!error) {
    console.log("テーブルは既に存在します（既存レコード数:", data.length, ")");
    return;
  }

  if (error && !error.message.includes("does not exist")) {
    // テーブルは存在するがRLS等でブロック
    console.log("テーブルはアクセス可能（RLSで空かも）");
    return;
  }

  // 2. テーブルが存在しない場合 → SQL を出力
  console.log("テーブルが存在しません。");
  console.log("Supabase ダッシュボード (SQL Editor) で以下を実行してください:\n");
  console.log("https://" + process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").replace(".supabase.co", "") + ".supabase.com/project/" + process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] + "/sql/new\n");
  console.log(`-- medical_vocabulary テーブル作成
CREATE TABLE IF NOT EXISTS medical_vocabulary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text,
  term text NOT NULL,
  reading text,
  category text DEFAULT 'general',
  specialty text DEFAULT 'common',
  boost_weight numeric DEFAULT 1.5,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_vocab_tenant ON medical_vocabulary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_vocab_specialty ON medical_vocabulary(specialty);
CREATE INDEX IF NOT EXISTS idx_medical_vocab_category ON medical_vocabulary(category);

CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_vocab_unique_term
  ON medical_vocabulary(tenant_id, term, specialty)
  WHERE tenant_id IS NOT NULL;

ALTER TABLE medical_vocabulary ENABLE ROW LEVEL SECURITY;
`);
}

main().catch(console.error);
