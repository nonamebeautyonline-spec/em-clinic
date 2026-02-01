// scripts/check-all-reservations-20260100321.mjs
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

const patientId = "20260100321";

console.log(`=== patient_id: ${patientId} の全予約確認 ===\n`);

async function checkAll() {
  // 1. Supabase全予約
  console.log("【1】Supabase reservationsテーブル（全ステータス）:");

  const { data: allSupabaseReservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (!allSupabaseReservations || allSupabaseReservations.length === 0) {
    console.log("  ❌ レコードなし\n");
  } else {
    console.log(`  合計: ${allSupabaseReservations.length}件\n`);
    allSupabaseReservations.forEach(r => {
      console.log(`  ${r.reserve_id}`);
      console.log(`    date/time: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`    status: ${r.status}`);
      console.log(`    created_at: ${r.created_at}\n`);
    });
  }

  // 2. GAS全予約
  console.log("【2】GAS予約シート（全ステータス）:");

  const response = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "getAllReservations", token: adminToken }),
  });
  const data = await response.json();
  const allGasReservations = (data.reservations || []).filter(r => {
    const pid = String(r.patient_id || r.patientId || "");
    return pid === patientId;
  });

  if (allGasReservations.length === 0) {
    console.log("  ❌ レコードなし\n");
  } else {
    console.log(`  合計: ${allGasReservations.length}件\n`);
    allGasReservations.forEach(r => {
      const reserveId = r.reserve_id || r.reserveId;
      const date = r.date || r.reserved_date;
      const time = r.time || r.reserved_time;
      const status = r.status || "";
      const created = r.timestamp || r.created_at;
      console.log(`  ${reserveId}`);
      console.log(`    date/time: ${date} ${time}`);
      console.log(`    status: ${status || "(空=有効)"}`);
      console.log(`    timestamp: ${created}\n`);
    });
  }

  console.log("=== 確認完了 ===");
}

checkAll().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
