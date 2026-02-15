// karte_images テーブル作成スクリプト
// 実行: node scripts/create-karte-images-table.cjs
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("karte_images テーブルを作成中...");

  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS karte_images (
        id BIGSERIAL PRIMARY KEY,
        patient_id TEXT NOT NULL,
        intake_id BIGINT,
        reserve_id TEXT,
        image_url TEXT NOT NULL,
        label TEXT DEFAULT '',
        category TEXT DEFAULT 'progress',
        memo TEXT DEFAULT '',
        taken_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_karte_images_patient ON karte_images(patient_id);
      CREATE INDEX IF NOT EXISTS idx_karte_images_intake ON karte_images(intake_id);
      CREATE INDEX IF NOT EXISTS idx_karte_images_reserve ON karte_images(reserve_id);
    `,
  });

  if (error) {
    // rpc が無い場合は REST API 経由で直接作成を試みる
    console.log("rpc exec_sql が使えないため、直接テーブルを確認します...");

    // テーブル存在確認
    const { data, error: checkErr } = await supabase
      .from("karte_images")
      .select("id")
      .limit(1);

    if (checkErr && checkErr.message.includes("does not exist")) {
      console.log(
        "テーブルが存在しません。Supabase SQL Editor で以下を実行してください:\n"
      );
      console.log(`
CREATE TABLE karte_images (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL,
  intake_id BIGINT,
  reserve_id TEXT,
  image_url TEXT NOT NULL,
  label TEXT DEFAULT '',
  category TEXT DEFAULT 'progress',
  memo TEXT DEFAULT '',
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX idx_karte_images_patient ON karte_images(patient_id);
CREATE INDEX idx_karte_images_intake ON karte_images(intake_id);
CREATE INDEX idx_karte_images_reserve ON karte_images(reserve_id);

-- RLS ポリシー（service_role のみ）
ALTER TABLE karte_images ENABLE ROW LEVEL SECURITY;
      `);
    } else {
      console.log("karte_images テーブルは既に存在します。");
    }
  } else {
    console.log("karte_images テーブルの作成が完了しました。");
  }
}

main().catch(console.error);
