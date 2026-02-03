import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log("\n" + "=".repeat(70));
  console.log("shipping_shares テーブル作成");
  console.log("=".repeat(70));

  const sql = `
-- 発送リスト共有用の一時ストレージテーブル
CREATE TABLE IF NOT EXISTS shipping_shares (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 有効期限切れのレコードを自動削除するインデックス
CREATE INDEX IF NOT EXISTS idx_shipping_shares_expires_at ON shipping_shares(expires_at);

-- RLSを無効化（パスワード認証で保護）
ALTER TABLE shipping_shares DISABLE ROW LEVEL SECURITY;

-- 有効期限切れのレコードを削除する関数
CREATE OR REPLACE FUNCTION delete_expired_shipping_shares()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM shipping_shares WHERE expires_at < NOW();
END;
$$;
  `;

  try {
    console.log("\n[1/1] SQLを実行中...");
    
    const { data, error } = await supabase.rpc("exec_sql", { sql });

    if (error) {
      console.error("\n❌ エラー:", error.message);
      console.error("詳細:", error);
      
      console.log("\n⚠️  Supabase Service Role Keyでは直接SQLを実行できません");
      console.log("Supabase Studioで以下のSQLを実行してください:");
      console.log("\nhttps://supabase.com/dashboard/project/" + process.env.NEXT_PUBLIC_SUPABASE_URL.split("//")[1].split(".")[0] + "/sql");
      console.log("\nSQL:");
      console.log(sql);
      return;
    }

    console.log("\n✅ マイグレーション成功");

  } catch (err) {
    console.error("\n❌ エラー:", err.message);
    
    console.log("\n⚠️  代替方法: Supabase Studioで以下のSQLを実行してください:");
    console.log("\nhttps://supabase.com/dashboard");
    console.log("\nSQL:");
    console.log(sql);
  }
}

applyMigration().catch(console.error);
