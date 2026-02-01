// 51件の pending 予約と GAS問診シートを照合して、問診データがない予約を特定
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

const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;

console.log("=== 余分な予約を特定 ===\n");

// 1. DBから今日のpending予約を取得
const { data: pendingReservations, error: dbError } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time")
  .eq("reserved_date", "2026-01-30")
  .eq("status", "pending")
  .order("reserved_time");

if (dbError) {
  console.error("DBエラー:", dbError.message);
  process.exit(1);
}

console.log(`【1. DB pending予約】${pendingReservations.length}件\n`);

// 2. GAS問診シートから今日の問診データを取得
const gasResponse = await fetch(gasIntakeListUrl + "?from=2026-01-30&to=2026-01-30");
const gasData = await gasResponse.json();

if (!gasData.ok) {
  console.error("GASエラー:", gasData.error);
  process.exit(1);
}

const gasRows = gasData.rows || [];
console.log(`【2. GAS問診データ】${gasRows.length}件\n`);

// 3. GASにある reserve_id のセットを作成
const gasReserveIds = new Set(
  gasRows
    .map(row => String(row.reserveId || row.reserve_id || "").trim())
    .filter(id => id)
);

console.log(`【3. GAS問診シートのreserve_id】${gasReserveIds.size}件\n`);

// 4. DBのpending予約で、GASに存在しないものを探す
const extraReservations = [];

for (const res of pendingReservations) {
  if (!gasReserveIds.has(res.reserve_id)) {
    extraReservations.push(res);
  }
}

console.log(`【4. 問診データがないpending予約】${extraReservations.length}件\n`);

if (extraReservations.length > 0) {
  console.log("以下の予約はDBにpendingとして存在するが、GAS問診シートに問診データがありません:\n");

  for (const res of extraReservations) {
    console.log(`  reserve_id: ${res.reserve_id}`);
    console.log(`  patient_id: ${res.patient_id}`);
    console.log(`  reserved_time: ${res.reserved_time}`);
    console.log();
  }
} else {
  console.log("全てのpending予約に問診データが存在します。");
}

console.log("=== 確認完了 ===");
