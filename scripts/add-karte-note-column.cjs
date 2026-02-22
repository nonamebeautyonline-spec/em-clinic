const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");
const { execSync } = require("child_process");

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const [key, ...vp] = t.split("=");
  if (key && vp.length > 0) {
    let v = vp.join("=").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envVars[key.trim()] = v;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const refId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const dbPassword = envVars.SUPABASE_DB_PASSWORD;

const sql = "ALTER TABLE reorders ADD COLUMN IF NOT EXISTS karte_note TEXT;";

if (dbPassword) {
  const dbUrl = `postgresql://postgres.${refId}:${encodeURIComponent(dbPassword)}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
  console.log("psqlで接続中...");
  try {
    const result = execSync(`psql "${dbUrl}" -c "${sql}"`, { encoding: "utf-8", timeout: 15000 });
    console.log("結果:", result);
  } catch (e) {
    console.error("psqlエラー:", e.message);
    console.log("\nSupabaseダッシュボードで以下のSQLを実行してください:");
    console.log(sql);
  }
} else {
  console.log("SUPABASE_DB_PASSWORDが.env.localにありません。");
  console.log("Supabaseダッシュボードで以下のSQLを実行してください:");
  console.log(sql);
}
