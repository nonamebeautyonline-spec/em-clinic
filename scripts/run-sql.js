#!/usr/bin/env node
// Supabase DBに直接接続してSQLファイルを実行するスクリプト
// 使い方: node scripts/run-sql.js <sqlファイルパス>
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// .env.local読み込み
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/run-sql.js <sql-file>");
  process.exit(1);
}

const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /https:\/\/([^.]+)\.supabase\.co/,
  "$1"
);

const client = new Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  const sql = fs.readFileSync(sqlFile, "utf8");
  await client.query(sql);
  console.log(`OK: ${sqlFile}`);
  await client.end();
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
