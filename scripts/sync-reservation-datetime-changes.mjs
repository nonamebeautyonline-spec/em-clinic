// scripts/sync-reservation-datetime-changes.mjs
// GASとSupabaseで予約日時が異なるものを検出して同期

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

console.log("=== 予約日時変更の同期 ===\n");

async function syncDatetimeChanges() {
  // 1. GASから全予約を取得
  console.log("【1】GAS予約シートから全予約取得中...");

  const gasResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      token: adminToken,
    }),
  });

  const gasData = await gasResponse.json();
  const gasReservations = gasData.reservations || [];

  console.log(`✅ GAS予約: ${gasReservations.length}件\n`);

  // 2. Supabaseから全予約を取得（ページネーション対応）
  console.log("【2】Supabase reservationsテーブルから全予約取得中...");

  let supabaseReservations = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("reservations")
      .select("reserve_id, patient_id, reserved_date, reserved_time, status, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.log(`❌ Supabaseエラー: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) break;

    supabaseReservations = supabaseReservations.concat(data);

    if (data.length < limit) break;

    offset += limit;
  }

  console.log(`✅ Supabase予約: ${supabaseReservations.length}件\n`);

  // 3. Supabaseの予約をMapに変換（reserve_id -> レコード）
  const supabaseMap = new Map();
  supabaseReservations.forEach(r => {
    supabaseMap.set(r.reserve_id, r);
  });

  // 4. GASとSupabaseで日時が異なるものを抽出
  console.log("【3】日時の差分を確認中...");

  const datetimeChanges = [];

  for (const gasRes of gasReservations) {
    const reserveId = gasRes.reserve_id || gasRes.reserveId;
    if (!reserveId) continue;

    const supabaseRes = supabaseMap.get(reserveId);
    if (!supabaseRes) continue; // Supabaseにない予約はスキップ（別スクリプトで対応）

    const gasDate = gasRes.date || gasRes.reserved_date;
    const gasTime = gasRes.time || gasRes.reserved_time;
    const supabaseDate = supabaseRes.reserved_date;
    const supabaseTime = (supabaseRes.reserved_time || "").replace(":00", ""); // "12:00:00" -> "12:00"

    // 日時が異なる場合
    if (gasDate !== supabaseDate || gasTime !== supabaseTime) {
      datetimeChanges.push({
        reserve_id: reserveId,
        patient_id: gasRes.patient_id || gasRes.patientId,
        gas_date: gasDate,
        gas_time: gasTime,
        supabase_date: supabaseDate,
        supabase_time: supabaseTime,
      });
    }
  }

  console.log(`📊 日時が異なる予約: ${datetimeChanges.length}件\n`);

  if (datetimeChanges.length === 0) {
    console.log("✅ すべての予約の日時が一致しています");
    return;
  }

  // 5. 最初の20件を表示
  console.log("❌ 以下の予約で日時が異なります（最初の20件）:\n");

  const displayCount = Math.min(20, datetimeChanges.length);
  for (let i = 0; i < displayCount; i++) {
    const change = datetimeChanges[i];
    console.log(`[${i + 1}] ${change.reserve_id} (patient: ${change.patient_id})`);
    console.log(`    GAS:      ${change.gas_date} ${change.gas_time}`);
    console.log(`    Supabase: ${change.supabase_date} ${change.supabase_time}`);
    console.log();
  }

  if (datetimeChanges.length > 20) {
    console.log(`... 他 ${datetimeChanges.length - 20}件\n`);
  }

  // 6. 一括更新
  console.log("【4】Supabaseに日時を更新中...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const change of datetimeChanges) {
    const { error } = await supabase
      .from("reservations")
      .update({
        reserved_date: change.gas_date,
        reserved_time: change.gas_time,
      })
      .eq("reserve_id", change.reserve_id);

    if (error) {
      console.error(`  ❌ [${change.reserve_id}] エラー: ${error.message}`);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log("\n=== 同期完了 ===");
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${errorCount}件`);
  console.log(`合計: ${datetimeChanges.length}件`);
}

syncDatetimeChanges();
