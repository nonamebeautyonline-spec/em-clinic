// scripts/check-today-pending-reservations.mjs
// 今日のpending予約の差分を確認

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

const today = "2026-01-30";

console.log(`=== 今日（${today}）のpending予約差分確認 ===\n`);

async function checkTodayPendingReservations() {
  // 1. GASから今日のpending予約を取得
  console.log("【1】GAS予約シートから今日のpending予約取得中...");

  const gasResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      token: adminToken,
    }),
  });

  const gasData = await gasResponse.json();
  const allGasReservations = gasData.reservations || [];

  // 今日 & pending（statusが空 or "pending"）
  const gasTodayPending = allGasReservations.filter(r => {
    const date = r.date || r.reserved_date;
    const status = (r.status || "").trim().toLowerCase();
    const isPending = status === "" || status === "pending";
    return date === today && isPending;
  });

  console.log(`✅ GAS今日のpending予約: ${gasTodayPending.length}件\n`);

  // 2. Supabaseから今日のpending予約を取得
  console.log("【2】Supabase reservationsから今日のpending予約取得中...");

  const { data: supabaseTodayPending, error } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, reserved_date, reserved_time, status, created_at")
    .eq("reserved_date", today)
    .eq("status", "pending");

  if (error) {
    console.log(`❌ Supabaseエラー: ${error.message}`);
    return;
  }

  console.log(`✅ Supabase今日のpending予約: ${supabaseTodayPending.length}件\n`);

  // 3. 差分確認
  const supabaseReserveIds = new Set(supabaseTodayPending.map(r => r.reserve_id));

  const missingReservations = gasTodayPending.filter(r => {
    const reserveId = r.reserve_id || r.reserveId;
    return reserveId && !supabaseReserveIds.has(reserveId);
  });

  console.log(`📊 差分: ${missingReservations.length}件がSupabaseに存在しない\n`);

  if (missingReservations.length === 0) {
    console.log("✅ 差分なし：すべての今日のpending予約がSupabaseに同期されています");
    return;
  }

  console.log("❌ 以下のpending予約がSupabaseに存在しません:\n");

  missingReservations.forEach((r, idx) => {
    const reserveId = r.reserve_id || r.reserveId;
    const patientId = r.patient_id || r.patientId;
    const time = r.time || r.reserved_time;

    console.log(`[${idx + 1}] ${reserveId}`);
    console.log(`    patient_id: ${patientId}`);
    console.log(`    time: ${time}`);
    console.log();
  });
}

checkTodayPendingReservations();
