// GAS予約シートと DB を照合して、余分な予約を特定
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

const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;

console.log("=== GAS予約シートとDB照合 ===\n");

// 1. GAS予約シートから今日の予約を取得
console.log("【1. GAS予約シートから取得中...】");
const gasResponse = await fetch(`${gasReservationsUrl}?type=get_slots&date=2026-01-30`);
const gasText = await gasResponse.text();

let gasData;
try {
  gasData = JSON.parse(gasText);
} catch (e) {
  console.error("GAS JSONパースエラー:", e.message);
  console.log("Raw response:", gasText.slice(0, 500));
  process.exit(1);
}

console.log("GAS response:", JSON.stringify(gasData).slice(0, 200));

// GASのデータ構造を確認
if (!gasData.slots && !gasData.reservations && !gasData.ok) {
  console.log("\n別のAPIパラメータを試します...");
  const gasResponse2 = await fetch(`${gasReservationsUrl}?date=2026-01-30`);
  const gasText2 = await gasResponse2.text();
  try {
    gasData = JSON.parse(gasText2);
    console.log("GAS response (試行2):", JSON.stringify(gasData).slice(0, 200));
  } catch (e) {
    console.error("再試行もパースエラー:", e.message);
    process.exit(1);
  }
}

// GASから予約されているreserve_idを抽出
let gasReserveIds = new Set();

if (gasData.slots) {
  // slots形式の場合
  for (const slot of gasData.slots) {
    if (slot.reserveId && slot.status === "reserved") {
      gasReserveIds.add(slot.reserveId);
    }
  }
} else if (gasData.reservations) {
  // reservations形式の場合
  for (const res of gasData.reservations) {
    if (res.reserve_id) {
      gasReserveIds.add(res.reserve_id);
    }
  }
} else if (Array.isArray(gasData)) {
  // 配列形式の場合
  for (const item of gasData) {
    if (item.reserve_id || item.reserveId) {
      gasReserveIds.add(item.reserve_id || item.reserveId);
    }
  }
}

console.log(`\n【GAS予約シートの予約】${gasReserveIds.size}件\n`);

if (gasReserveIds.size === 0) {
  console.error("GASから予約データを取得できませんでした。");
  console.log("取得したデータ:", JSON.stringify(gasData, null, 2).slice(0, 1000));
  process.exit(1);
}

// 2. DBから今日のpending予約を取得
const { data: pendingReservations, error } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time, created_at")
  .eq("reserved_date", "2026-01-30")
  .eq("status", "pending")
  .order("reserved_time");

if (error) {
  console.error("DBエラー:", error.message);
  process.exit(1);
}

console.log(`【2. DB pending予約】${pendingReservations.length}件\n`);

// 3. DBにあってGASにない予約を特定
const extraInDb = [];

for (const res of pendingReservations) {
  if (!gasReserveIds.has(res.reserve_id)) {
    extraInDb.push(res);
  }
}

console.log(`【3. DBにあってGASにない予約（削除候補）】${extraInDb.length}件\n`);

if (extraInDb.length > 0) {
  for (const res of extraInDb) {
    console.log(`  reserve_id: ${res.reserve_id}`);
    console.log(`  patient_id: ${res.patient_id}`);
    console.log(`  reserved_time: ${res.reserved_time}`);
    console.log(`  created_at: ${res.created_at}`);
    console.log();
  }
} else {
  console.log("全てのDB pending予約はGAS予約シートに存在します。");
}

// 4. GASにあってDBにない予約を特定（逆パターン）
const dbReserveIds = new Set(pendingReservations.map(r => r.reserve_id));
const extraInGas = [];

for (const gasId of gasReserveIds) {
  if (!dbReserveIds.has(gasId)) {
    extraInGas.push(gasId);
  }
}

if (extraInGas.length > 0) {
  console.log(`\n【4. GASにあってDBにない予約】${extraInGas.length}件\n`);
  for (const id of extraInGas) {
    console.log(`  reserve_id: ${id}`);
  }
}

console.log("\n=== 照合完了 ===");
