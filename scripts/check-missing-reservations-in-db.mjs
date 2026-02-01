// scripts/check-missing-reservations-in-db.mjs
// GAS予約シートにあってSupabase reservationsテーブルにない予約を確認

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

console.log("=== GAS予約シート vs Supabase reservations 差分確認 ===\n");

async function checkMissingReservations() {
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

  console.log("=== 結果 ===\n");
  console.log(`📊 GASにあってSupabaseにない予約: ${missingReservations.length}件\n`);

  if (missingReservations.length === 0) {
    console.log("✅ 問題なし：すべての予約がSupabaseに同期されています");
    return;
  }

  // 最新の20件を表示
  console.log("❌ 以下の予約がSupabaseに入っていません（最新20件）:\n");

  // 日付でソート（新しい順）
  missingReservations.sort((a, b) => {
    const aDate = new Date(a.timestamp || a.created_at || 0);
    const bDate = new Date(b.timestamp || b.created_at || 0);
    return bDate - aDate;
  });

  const displayCount = Math.min(20, missingReservations.length);
  for (let i = 0; i < displayCount; i++) {
    const r = missingReservations[i];
    const reserveId = r.reserve_id || r.reserveId;
    const patientId = r.patient_id || r.patientId;
    const date = r.date || r.reserved_date;
    const time = r.time || r.reserved_time;
    const status = r.status || "";
    const timestamp = r.timestamp || r.created_at || "";

    console.log(`[${i + 1}] ${reserveId}`);
    console.log(`    patient_id: ${patientId || "不明"}`);
    console.log(`    日時: ${date} ${time}`);
    console.log(`    status: ${status}`);
    console.log(`    作成日時: ${timestamp}`);
    console.log();
  }

  if (missingReservations.length > 20) {
    console.log(`... 他 ${missingReservations.length - 20}件\n`);
  }

  // 5. キャンセル済みかどうかを確認
  const canceledCount = missingReservations.filter(r => {
    const status = r.status || "";
    return status.toLowerCase() === "canceled" || status === "キャンセル";
  }).length;

  const pendingCount = missingReservations.filter(r => {
    const status = r.status || "";
    return status.toLowerCase() === "pending" || status === "";
  }).length;

  console.log("【内訳】");
  console.log(`  キャンセル済み: ${canceledCount}件`);
  console.log(`  pending（有効な予約）: ${pendingCount}件`);

  // 6. 直近7日間の有効な予約で抽出
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentMissing = missingReservations.filter(r => {
    const timestamp = r.timestamp || r.created_at;
    if (!timestamp) return false;

    const createdDate = new Date(timestamp);
    const status = r.status || "";
    const isPending = status.toLowerCase() === "pending" || status === "";

    return createdDate >= sevenDaysAgo && isPending;
  });

  if (recentMissing.length > 0) {
    console.log(`\n【重要】直近7日間の有効な予約で未同期: ${recentMissing.length}件`);
    console.log("以下の予約をSupabaseに追加する必要があります:\n");

    recentMissing.forEach((r, idx) => {
      const reserveId = r.reserve_id || r.reserveId;
      const patientId = r.patient_id || r.patientId;
      console.log(`  [${idx + 1}] ${patientId}: ${reserveId}`);
    });

    console.log("\n対応方法:");
    console.log("1. これらの予約を手動でSupabaseに追加");
    console.log("2. または sync-missing-reservations.mjs スクリプトを作成して一括同期");
  }
}

checkMissingReservations();
