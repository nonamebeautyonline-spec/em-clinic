const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.resolve("/Users/administer/em-clinic/.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
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
  const res = await client.query(`
    SELECT 
      r.id,
      r.patient_id,
      p.name,
      p.tel,
      p.line_uid,
      r.reservation_date,
      r.reservation_time,
      r.status
    FROM reservations r
    JOIN patients p ON p.id = r.patient_id
    WHERE r.reservation_date = CURRENT_DATE
      AND r.status NOT IN ('cancelled', 'no_show')
    ORDER BY r.reservation_time
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
