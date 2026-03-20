const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/https:\/\/([^.]+)\.supabase\.co/, "$1");
const client = new Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
(async () => {
  await client.connect();
  // テーブル名確認
  const r0 = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE '%tag%'
    ORDER BY table_name
  `);
  console.log("=== tag関連テーブル ===");
  console.table(r0.rows);

  const r1 = await client.query(`
    SELECT * FROM patient_tags WHERE patient_id = '20251200128'
  `);
  console.log("=== patient_tags ===");
  console.table(r1.rows);

  const r2 = await client.query(`
    SELECT mark FROM friend_summaries WHERE patient_id = '20251200128'
  `);
  console.log("=== friend_summaries mark ===");
  console.table(r2.rows);

  await client.end();
})().catch(e => { console.error("Error:", e.message); process.exit(1); });
