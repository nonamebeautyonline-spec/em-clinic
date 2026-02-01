// scripts/check-20260100576-in-gas-reservations.mjs
// GASの予約シートで20260100576を確認

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

const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

const patientId = "20260100576";
const reserveId = "resv-1769678855708";

async function checkGasReservations() {
  console.log("=== GAS予約シートで20260100576を確認 ===\n");

  // GASから全予約データを取得
  console.log("1. GASから予約データ取得中...");
  const gasResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      token: adminToken,
    }),
  });

  if (!gasResponse.ok) {
    console.error(`❌ GAS API Error: ${gasResponse.status}`);
    const errorText = await gasResponse.text();
    console.error(`Response: ${errorText}`);
    return;
  }

  const gasData = await gasResponse.json();

  if (!gasData.ok || !Array.isArray(gasData.reservations)) {
    console.error("❌ GAS APIレスポンスが不正です:", gasData);
    return;
  }

  console.log(`   GAS総予約数: ${gasData.reservations.length} 件\n`);

  // 該当patient_idの予約を検索
  const patientReservations = gasData.reservations.filter(
    r => String(r.patient_id || "").trim() === patientId
  );

  console.log(`【patient_id: ${patientId} の予約】`);
  console.log(`  件数: ${patientReservations.length} 件\n`);

  if (patientReservations.length > 0) {
    patientReservations.forEach((r, idx) => {
      console.log(`  [${idx + 1}] ${r.reserve_id}`);
      console.log(`      name: ${r.name || 'なし'}`);
      console.log(`      date: ${r.date || 'なし'}`);
      console.log(`      time: ${r.time || 'なし'}`);
      console.log(`      status: ${r.status || '空欄'}`);
      console.log(`      timestamp: ${r.timestamp || 'なし'}`);
      console.log();
    });
  } else {
    console.log(`  ❌ GAS予約シートにデータがありません`);
    console.log(`\n【推測される原因】`);
    console.log(`  - 予約シートから削除された`);
    console.log(`  - patient_idが不一致`);
    console.log(`  - reserve_id (${reserveId}) で検索してみます...\n`);

    // reserve_idで検索
    const byReserveId = gasData.reservations.find(
      r => (r.reserve_id || r.reserveId) === reserveId
    );

    if (byReserveId) {
      console.log(`  ✅ reserve_idでは見つかりました:`);
      console.log(`     reserve_id: ${byReserveId.reserve_id}`);
      console.log(`     patient_id: ${byReserveId.patient_id} ← 不一致！`);
      console.log(`     name: ${byReserveId.name}`);
    } else {
      console.log(`  ❌ reserve_idでも見つかりません`);
      console.log(`\n  → GAS予約シートに存在しないため、カルテに表示されない`);
    }
  }
}

checkGasReservations();
