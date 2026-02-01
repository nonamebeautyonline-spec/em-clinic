// scripts/sync-missing-reservations-to-db.mjs
// GASにあってSupabaseにない予約を一括同期

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

console.log("=== GAS予約をSupabaseに一括同期 ===\n");

async function syncMissingReservations() {
  // 1. GASから全予約を取得
  console.log("【1】GAS予約シートから全予約取得中...");

  let gasReservations = [];
  try {
    const gasResponse = await fetch(gasReservationsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "getAllReservations",
        token: adminToken,
      }),
    });

    if (!gasResponse.ok) {
      console.log(`❌ GAS API エラー: ${gasResponse.status}`);
      return;
    }

    const gasData = await gasResponse.json();

    if (!gasData.ok || !Array.isArray(gasData.reservations)) {
      console.log("❌ GAS APIレスポンスが不正");
      return;
    }

    gasReservations = gasData.reservations;
    console.log(`✅ GAS予約: ${gasReservations.length}件\n`);
  } catch (error) {
    console.error(`❌ GAS取得エラー: ${error.message}`);
    return;
  }

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

  // 3. reserve_idのセットを作成
  const supabaseReserveIds = new Set(supabaseReservations.map(r => r.reserve_id));

  // 4. GASにあってSupabaseにない予約を抽出
  const missingReservations = gasReservations.filter(gasRes => {
    const reserveId = gasRes.reserve_id || gasRes.reserveId;
    return reserveId && !supabaseReserveIds.has(reserveId);
  });

  console.log(`【3】差分確認: ${missingReservations.length}件が未同期\n`);

  if (missingReservations.length === 0) {
    console.log("✅ すべての予約が同期されています");
    return;
  }

  // 5. Supabaseに挿入するデータを準備
  const recordsToInsert = missingReservations.map(gasRes => {
    const reserveId = gasRes.reserve_id || gasRes.reserveId;
    const patientId = gasRes.patient_id || gasRes.patientId;
    const date = gasRes.date || gasRes.reserved_date;
    const time = gasRes.time || gasRes.reserved_time;
    const gasStatus = gasRes.status || "";
    const timestamp = gasRes.timestamp || gasRes.created_at;

    // GASステータスをSupabaseステータスに変換
    let status = "pending";
    if (gasStatus === "キャンセル" || gasStatus.toLowerCase() === "canceled") {
      status = "canceled";
    }

    return {
      reserve_id: reserveId,
      patient_id: patientId,
      reserved_date: date,
      reserved_time: time,
      status: status,
      created_at: timestamp || new Date().toISOString(),
    };
  });

  // 内訳を表示
  const pendingCount = recordsToInsert.filter(r => r.status === "pending").length;
  const canceledCount = recordsToInsert.filter(r => r.status === "canceled").length;

  console.log("【4】同期対象:");
  console.log(`  pending: ${pendingCount}件`);
  console.log(`  canceled: ${canceledCount}件`);
  console.log(`  合計: ${recordsToInsert.length}件\n`);

  // 6. バッチで挿入（100件ずつ）
  console.log("【5】Supabaseに挿入中...\n");

  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(recordsToInsert.length / batchSize);

    console.log(`  バッチ ${batchNum}/${totalBatches} (${batch.length}件)...`);

    const { data, error } = await supabase
      .from("reservations")
      .upsert(batch, {
        onConflict: "reserve_id",
      });

    if (error) {
      console.error(`  ❌ エラー: ${error.message}`);
      errorCount += batch.length;
    } else {
      console.log(`  ✅ 成功`);
      successCount += batch.length;
    }
  }

  console.log("\n=== 同期完了 ===");
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${errorCount}件`);
  console.log(`合計: ${recordsToInsert.length}件`);
}

syncMissingReservations();
