// DBのpending予約とGASアクティブ予約を照合
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 余分なpending予約を特定 ===\n");

// GASログから取得したアクティブな予約ID（キャンセルでないもの）
const gasActiveReservations = [
  "resv-1768464596770",
  "resv-1768540874096",
  "resv-1769117432671",
  "resv-1769266052784",
  "resv-1769432280039",
  "resv-1769491492126",
  "resv-1769517094126",
  "resv-1769520313437",
  "resv-1769525253335",
  "resv-1769526938222",
  "resv-1769570726110",
  "resv-1769574927493",
  "resv-1769600080545",
  "resv-1769607019189",
  "resv-1769616341632",
  "resv-1769638664327",
  "resv-1769639654111",
  "resv-1769657541061",
  "resv-1769662846260",
  "resv-1769667833653",
  "resv-1769669495402",
  "resv-1769672975168",
  "resv-1769673522720",
  "resv-1769673807937",
  "resv-1769675088653",
  "resv-1769675853660",
  "resv-1769676831803",
  "resv-1769679807688",
  "resv-1769679878001",
  "resv-1769681449947",
  "resv-1769685533442",
  "resv-1769687043173",
  "resv-1769688368934",
  "resv-1769694880727",
  "resv-1769700681889",
  "resv-1769705897503",
  "resv-1769720669551",
  "resv-1769729073100",
  "resv-1769729904218",
  "resv-1769733966830",
  "resv-1769739417486",
  "resv-1769740065578",
  "resv-1769743045571",
  "resv-1769743493003",
  "resv-1769748606212",
  "resv-1769749254550",
  "resv-1769753324222",
  "resv-1769755725604",
  "resv-1769760320104",
  "resv-1769760982543"
];

console.log(`【1. GASアクティブ予約】${gasActiveReservations.length}件\n`);

// DBのpending予約を取得
const { data: dbPending, error } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time")
  .eq("reserved_date", "2026-01-30")
  .eq("status", "pending")
  .order("reserved_time");

if (error) {
  console.error("DBエラー:", error.message);
  process.exit(1);
}

console.log(`【2. DB pending予約】${dbPending.length}件\n`);

// GASアクティブ予約のセット
const gasSet = new Set(gasActiveReservations);

// DBにあってGASにない予約
const extraInDb = [];

for (const res of dbPending) {
  if (!gasSet.has(res.reserve_id)) {
    extraInDb.push(res);
  }
}

console.log(`【3. DBにあってGASアクティブにない予約（削除候補）】${extraInDb.length}件\n`);

if (extraInDb.length > 0) {
  for (const res of extraInDb) {
    console.log(`  ❌ reserve_id: ${res.reserve_id}`);
    console.log(`     patient_id: ${res.patient_id}`);
    console.log(`     reserved_time: ${res.reserved_time}`);
    console.log();
  }
} else {
  console.log("全てのDB pending予約はGASアクティブ予約に存在します。");
}

console.log("=== 確認完了 ===");
