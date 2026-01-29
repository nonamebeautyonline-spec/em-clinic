// scripts/sync-canceled-reservations-from-gas.mjs
// GASのreservationsシートからキャンセル済み予約を取得し、Supabaseに反映

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

async function syncCanceledReservations() {
  console.log("=== GASのキャンセル済み予約をSupabaseに同期 ===\n");

  // 1. GASから全予約データを取得
  console.log("1. GASから予約データ取得中...");
  const gasResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      token: adminToken,
    }),
    redirect: "follow"
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

  const allReservations = gasData.reservations;
  console.log(`   GAS総予約数: ${allReservations.length} 件\n`);

  // 2. ステータスが「キャンセル」のものを抽出
  const canceledInGas = allReservations.filter(r => r.status === "キャンセル");
  console.log(`2. キャンセル済み予約: ${canceledInGas.length} 件\n`);

  if (canceledInGas.length === 0) {
    console.log("✅ キャンセル済み予約はありません");
    return;
  }

  // 3. Supabaseで更新が必要なものをチェック
  let updatedCount = 0;
  let alreadyCanceledCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (const gasRes of canceledInGas) {
    const reserveId = gasRes.reserve_id || gasRes.reserveId;
    if (!reserveId) continue;

    // Supabaseで該当予約を取得
    const { data: dbRes, error: fetchError } = await supabase
      .from("reservations")
      .select("reserve_id, status")
      .eq("reserve_id", reserveId)
      .maybeSingle();

    if (fetchError) {
      console.error(`❌ [${reserveId}] 取得エラー:`, fetchError.message);
      errorCount++;
      continue;
    }

    if (!dbRes) {
      console.log(`⚠️ [${reserveId}] DBに存在しません`);
      notFoundCount++;
      continue;
    }

    if (dbRes.status === "canceled") {
      console.log(`✓ [${reserveId}] 既にcanceled`);
      alreadyCanceledCount++;
      continue;
    }

    // ステータスを"canceled"に更新
    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status: "canceled" })
      .eq("reserve_id", reserveId);

    if (updateError) {
      console.error(`❌ [${reserveId}] 更新エラー:`, updateError.message);
      errorCount++;
      continue;
    }

    console.log(`✅ [${reserveId}] ${dbRes.status} → canceled`);
    updatedCount++;
  }

  console.log("\n=== 同期完了 ===");
  console.log(`GASのキャンセル済み: ${canceledInGas.length} 件`);
  console.log(`DB更新: ${updatedCount} 件`);
  console.log(`既にcanceled: ${alreadyCanceledCount} 件`);
  console.log(`DBに存在しない: ${notFoundCount} 件`);
  console.log(`エラー: ${errorCount} 件`);
}

syncCanceledReservations();
