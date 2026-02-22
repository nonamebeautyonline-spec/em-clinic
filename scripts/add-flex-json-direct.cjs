// flex_json カラムを直接追加するスクリプト
// pg モジュールを使って直接 ALTER TABLE を実行
const fs = require("fs");
const path = require("path");

// .env.local を読み込み
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

// Supabase Management API で SQL 実行
// プロジェクト参照IDを取得
const ref = supabaseUrl.replace("https://", "").split(".")[0];
console.log("プロジェクトRef:", ref);

// Supabase の PostgREST 経由では DDL を実行できないため
// pg パッケージで直接接続する

async function main() {
  // pg がインストールされているか確認
  let pg;
  try {
    pg = require("pg");
  } catch {
    console.log("pg パッケージがありません。インストールします...");
    const { execSync } = require("child_process");
    execSync("npm install pg --no-save", { cwd: path.resolve(__dirname, ".."), stdio: "inherit" });
    pg = require("pg");
  }

  // Supabase DB接続情報
  const dbPassword = envVars.SUPABASE_DB_PASSWORD || envVars.DB_PASSWORD;
  if (!dbPassword) {
    console.log("SUPABASE_DB_PASSWORD が .env.local に設定されていません。");
    console.log("Supabase Dashboard → Settings → Database → Connection string で確認してください。");
    console.log("例: SUPABASE_DB_PASSWORD=your-password");
    console.log("");
    console.log("代替方法: Supabase Dashboard の SQL Editor で以下を実行:");
    console.log("  ALTER TABLE message_log ADD COLUMN IF NOT EXISTS flex_json JSONB;");
    console.log("  ALTER TABLE message_log ALTER COLUMN message_type TYPE VARCHAR(50);");
    return;
  }

  const client = new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("DB接続成功");

    // flex_json カラム追加
    console.log("1. flex_json カラム追加...");
    await client.query("ALTER TABLE message_log ADD COLUMN IF NOT EXISTS flex_json JSONB;");
    console.log("   完了");

    // message_type 拡張
    console.log("2. message_type を VARCHAR(50) に拡張...");
    await client.query("ALTER TABLE message_log ALTER COLUMN message_type TYPE VARCHAR(50);");
    console.log("   完了");

    // 確認
    const res = await client.query(
      "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'message_log' AND column_name IN ('flex_json', 'message_type');"
    );
    console.log("\n確認:");
    for (const row of res.rows) {
      console.log("  " + row.column_name + ": " + row.data_type + (row.character_maximum_length ? "(" + row.character_maximum_length + ")" : ""));
    }
  } catch (err) {
    console.error("エラー:", err.message);
  } finally {
    await client.end();
  }
}

main();
