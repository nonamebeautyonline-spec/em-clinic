import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

// Service role key for admin operations
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("=== bank_transfer_orders テーブルにカラム追加 ===\n");

const sql = `
ALTER TABLE bank_transfer_orders
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS reorder_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bank_transfer_orders_reorder_id
  ON bank_transfer_orders(reorder_id)
  WHERE reorder_id IS NOT NULL;
`;

console.log("実行SQL:");
console.log(sql);
console.log();

try {
  // Supabase doesn't support raw SQL execution via JS client
  // We need to use Supabase SQL Editor or pg client
  console.log("⚠️  このマイグレーションはSupabase Dashboardで手動実行してください:");
  console.log("   https://supabase.com/dashboard/project/.../editor");
  console.log();
  console.log("または、以下のコマンドでpsql経由で実行:");
  console.log("   cat supabase/migrations/add_mode_reorder_id_to_bank_transfer_orders.sql | psql <connection-string>");
  console.log();
  console.log("マイグレーションファイル:");
  console.log("   supabase/migrations/add_mode_reorder_id_to_bank_transfer_orders.sql");
} catch (e) {
  console.error("❌ エラー:", e);
}
