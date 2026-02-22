// medical_vocabulary テーブル作成スクリプト
// 実行: node scripts/create-medical-vocabulary-table.cjs
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("=== medical_vocabulary テーブル作成 ===\n");

  // テーブル作成
  const { error: createError } = await supabase.rpc("exec_sql", {
    sql: `
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

      -- インデックス
      CREATE INDEX IF NOT EXISTS idx_medical_vocab_tenant
        ON medical_vocabulary(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_medical_vocab_specialty
        ON medical_vocabulary(specialty);
      CREATE INDEX IF NOT EXISTS idx_medical_vocab_category
        ON medical_vocabulary(category);

      -- 同一テナント内で同じ用語の重複を防止
      CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_vocab_unique_term
        ON medical_vocabulary(tenant_id, term, specialty)
        WHERE tenant_id IS NOT NULL;

      -- updated_at 自動更新トリガー
      CREATE OR REPLACE FUNCTION update_medical_vocabulary_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_medical_vocabulary_updated_at ON medical_vocabulary;
      CREATE TRIGGER trg_medical_vocabulary_updated_at
        BEFORE UPDATE ON medical_vocabulary
        FOR EACH ROW
        EXECUTE FUNCTION update_medical_vocabulary_updated_at();

      -- RLS 有効化（admin API は supabaseAdmin を使うので影響なし）
      ALTER TABLE medical_vocabulary ENABLE ROW LEVEL SECURITY;
    `,
  });

  if (createError) {
    // exec_sql RPC がない場合は直接 SQL を実行
    if (createError.message.includes("exec_sql")) {
      console.log("exec_sql RPC が見つかりません。Supabase ダッシュボードで以下の SQL を実行してください:\n");
      console.log(`
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

CREATE INDEX IF NOT EXISTS idx_medical_vocab_tenant
  ON medical_vocabulary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_vocab_specialty
  ON medical_vocabulary(specialty);
CREATE INDEX IF NOT EXISTS idx_medical_vocab_category
  ON medical_vocabulary(category);

CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_vocab_unique_term
  ON medical_vocabulary(tenant_id, term, specialty)
  WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_medical_vocabulary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_vocabulary_updated_at ON medical_vocabulary;
CREATE TRIGGER trg_medical_vocabulary_updated_at
  BEFORE UPDATE ON medical_vocabulary
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_vocabulary_updated_at();

ALTER TABLE medical_vocabulary ENABLE ROW LEVEL SECURITY;
      `);
      return;
    }
    console.error("テーブル作成エラー:", createError.message);
    process.exit(1);
  }

  console.log("テーブル作成完了!");

  // 確認
  const { data, error: checkError } = await supabase
    .from("medical_vocabulary")
    .select("id")
    .limit(1);

  if (checkError) {
    console.error("テーブル確認エラー:", checkError.message);
  } else {
    console.log("テーブル確認OK（既存レコード数:", data.length, ")");
  }
}

main().catch(console.error);
