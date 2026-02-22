// intakeテーブルのpatient_idユニーク制約を削除
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

// Supabase Management API を使ってSQLを実行
// ref ID をURLから抽出
const refId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
console.log("Project ref:", refId);

// 方法: Supabase の pg_net or直接REST経由はSQLを実行できないので、
// supabase CLI の linked project 経由でSQLを実行
// もしくは psql 直接接続

// psqlが使えるか確認
import { execSync } from "child_process";

try {
  // Supabase の DB 接続情報
  // pooler URL: postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
  const dbPassword = envVars.SUPABASE_DB_PASSWORD;

  if (dbPassword) {
    const dbUrl = `postgresql://postgres.${refId}:${encodeURIComponent(dbPassword)}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
    console.log("psqlで接続中...");
    const result = execSync(`psql "${dbUrl}" -c "ALTER TABLE intake DROP CONSTRAINT IF EXISTS intake_patient_id_key;"`, { encoding: "utf-8", timeout: 15000 });
    console.log("結果:", result);
  } else {
    console.log("\nSUPABASE_DB_PASSWORD が .env.local にありません。");
    console.log("Supabaseダッシュボードで以下のSQLを実行してください:\n");
    console.log("ALTER TABLE intake DROP CONSTRAINT IF EXISTS intake_patient_id_key;\n");

    // 代替: REST API経由でrpc呼び出し
    console.log("または、以下のcurlコマンドでも実行できます:");
    console.log(`curl -X POST '${supabaseUrl}/rest/v1/rpc/exec_sql' \\`);
    console.log(`  -H 'apikey: ${serviceKey}' \\`);
    console.log(`  -H 'Authorization: Bearer ${serviceKey}' \\`);
    console.log(`  -H 'Content-Type: application/json' \\`);
    console.log(`  -d '{"query": "ALTER TABLE intake DROP CONSTRAINT IF EXISTS intake_patient_id_key;"}'`);
  }
} catch (e) {
  console.error("エラー:", e.message);
  console.log("\nSupabaseダッシュボードで以下のSQLを実行してください:\n");
  console.log("ALTER TABLE intake DROP CONSTRAINT IF EXISTS intake_patient_id_key;");
}
