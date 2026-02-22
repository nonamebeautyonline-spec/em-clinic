const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx === -1) return;
  const key = trimmed.substring(0, idx).trim();
  let value = trimmed.substring(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  envVars[key] = value;
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. flex_json カラム追加
  console.log("1. flex_json カラム追加...");
  const { error: e1 } = await sb.rpc("exec_sql", {
    sql: "ALTER TABLE message_log ADD COLUMN IF NOT EXISTS flex_json JSONB;"
  });
  if (e1) {
    console.log("  RPC失敗:", e1.message);
    // 既に存在するか確認
    const { error: check } = await sb.from("message_log").select("flex_json").limit(1);
    if (check) {
      console.log("  flex_json カラムが存在しません。手動で追加してください。");
      return;
    }
    console.log("  flex_json カラムは既に存在します。");
  } else {
    console.log("  完了");
  }

  // 2. message_type を VARCHAR(50) に拡張
  console.log("2. message_type を VARCHAR(50) に拡張...");
  const { error: e2 } = await sb.rpc("exec_sql", {
    sql: "ALTER TABLE message_log ALTER COLUMN message_type TYPE VARCHAR(50);"
  });
  if (e2) {
    console.log("  RPC失敗:", e2.message);
  } else {
    console.log("  完了");
  }

  // 確認
  const { data, error } = await sb.from("message_log").select("id, flex_json").limit(1);
  console.log("\n確認:", error ? "エラー: " + error.message : "flex_json カラム利用可能");
})();
