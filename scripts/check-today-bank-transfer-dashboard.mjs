import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
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
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

// 今日の日付範囲を計算（ダッシュボードと同じロジック）
function calculateTodayRange() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNowMs = now.getTime() + jstOffset;
  const jstNow = new Date(jstNowMs);

  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const date = jstNow.getUTCDate();

  // 今日0:00 JST = UTC - 9時間
  const start = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
  const end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

const { startISO, endISO } = calculateTodayRange();

console.log("=== 今日の日付範囲（ダッシュボードと同じ計算） ===");
console.log("開始:", startISO);
console.log("終了:", endISO);
console.log();

// 1. 今日の銀行振込データを全件取得（フィルタなし）
console.log("=== 1. 今日の銀行振込データ（全ステータス） ===");
const { data: allOrders, error: allError } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .gte("submitted_at", startISO)
  .lt("submitted_at", endISO);

if (allError) {
  console.error("エラー:", allError);
} else {
  console.log(`合計: ${allOrders?.length || 0}件`);
  if (allOrders && allOrders.length > 0) {
    console.log("\n詳細:");
    allOrders.forEach((order, idx) => {
      console.log(`\n[${idx + 1}] ID: ${order.id}`);
      console.log(`  patient_id: ${order.patient_id}`);
      console.log(`  product_code: ${order.product_code}`);
      console.log(`  status: ${order.status}`);
      console.log(`  submitted_at: ${order.submitted_at}`);
      console.log(`  created_at: ${order.created_at}`);
    });
  }
}
console.log();

// 2. ステータスフィルタありのデータ
console.log("=== 2. 今日の銀行振込データ（pending_confirmation + confirmed） ===");
const { data: filteredOrders, error: filteredError } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .in("status", ["pending_confirmation", "confirmed"])
  .gte("submitted_at", startISO)
  .lt("submitted_at", endISO);

if (filteredError) {
  console.error("エラー:", filteredError);
} else {
  console.log(`合計: ${filteredOrders?.length || 0}件`);
  if (filteredOrders && filteredOrders.length > 0) {
    console.log("\n詳細:");
    filteredOrders.forEach((order, idx) => {
      console.log(`\n[${idx + 1}] ID: ${order.id}`);
      console.log(`  patient_id: ${order.patient_id}`);
      console.log(`  product_code: ${order.product_code}`);
      console.log(`  status: ${order.status}`);
      console.log(`  submitted_at: ${order.submitted_at}`);
    });

    // 売上計算
    const productPrices = {
      "MJL_2.5mg_1m": 13000,
      "MJL_2.5mg_2m": 25500,
      "MJL_2.5mg_3m": 35000,
      "MJL_5mg_1m": 22850,
      "MJL_5mg_2m": 45500,
      "MJL_5mg_3m": 63000,
      "MJL_7.5mg_1m": 34000,
      "MJL_7.5mg_2m": 65000,
      "MJL_7.5mg_3m": 96000,
    };

    const revenue = filteredOrders.reduce((sum, o) => {
      const price = productPrices[o.product_code] || 0;
      if (price === 0 && o.product_code) {
        console.log(`\n警告: product_code "${o.product_code}" の価格が設定されていません`);
      }
      return sum + price;
    }, 0);

    console.log(`\n計算された売上: ${revenue.toLocaleString()}円`);
  }
}
console.log();

// 3. submitted_atがnullのデータ
console.log("=== 3. submitted_atがnullの銀行振込データ ===");
const { data: nullSubmittedOrders, error: nullError } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .is("submitted_at", null);

if (nullError) {
  console.error("エラー:", nullError);
} else {
  console.log(`合計: ${nullSubmittedOrders?.length || 0}件`);
  if (nullSubmittedOrders && nullSubmittedOrders.length > 0) {
    console.log("\n最新10件:");
    nullSubmittedOrders.slice(0, 10).forEach((order, idx) => {
      console.log(`\n[${idx + 1}] ID: ${order.id}`);
      console.log(`  patient_id: ${order.patient_id}`);
      console.log(`  product_code: ${order.product_code}`);
      console.log(`  status: ${order.status}`);
      console.log(`  created_at: ${order.created_at}`);
    });
  }
}
console.log();

// 4. 今日作成されたデータ（created_atベース）
console.log("=== 4. 今日作成された銀行振込データ（created_atベース） ===");
const { data: createdTodayOrders, error: createdError } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .gte("created_at", startISO)
  .lt("created_at", endISO);

if (createdError) {
  console.error("エラー:", createdError);
} else {
  console.log(`合計: ${createdTodayOrders?.length || 0}件`);
  if (createdTodayOrders && createdTodayOrders.length > 0) {
    console.log("\n詳細:");
    createdTodayOrders.forEach((order, idx) => {
      console.log(`\n[${idx + 1}] ID: ${order.id}`);
      console.log(`  patient_id: ${order.patient_id}`);
      console.log(`  product_code: ${order.product_code}`);
      console.log(`  status: ${order.status}`);
      console.log(`  created_at: ${order.created_at}`);
      console.log(`  submitted_at: ${order.submitted_at || "(null)"}`);
    });
  }
}
