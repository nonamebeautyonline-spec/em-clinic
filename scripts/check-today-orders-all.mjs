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

console.log("=== 今日の日付範囲 ===");
console.log("開始:", startISO);
console.log("終了:", endISO);
console.log();

// 1. 今日の全注文（ordersテーブル）
console.log("=== 今日の全注文（ordersテーブル） ===\n");

const { data: todayOrders, error: ordersError } = await supabase
  .from("orders")
  .select("*")
  .gte("created_at", startISO)
  .lt("created_at", endISO)
  .order("created_at", { ascending: false });

if (ordersError) {
  console.error("エラー:", ordersError);
} else {
  console.log(`合計: ${todayOrders?.length || 0}件\n`);

  if (todayOrders && todayOrders.length > 0) {
    const byPaymentMethod = {};
    todayOrders.forEach(order => {
      const method = order.payment_method || "unknown";
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = [];
      }
      byPaymentMethod[method].push(order);
    });

    Object.entries(byPaymentMethod).forEach(([method, orders]) => {
      console.log(`\n【${method}】 ${orders.length}件`);
      orders.forEach((order, idx) => {
        console.log(`\n[${idx + 1}] ID: ${order.id}`);
        console.log(`  patient_id: ${order.patient_id || "(null)"}`);
        console.log(`  product_code: ${order.product_code || "(null)"}`);
        console.log(`  amount: ${order.amount ? order.amount.toLocaleString() + "円" : "(null)"}`);
        console.log(`  payment_method: ${order.payment_method}`);
        console.log(`  status: ${order.status || "(null)"}`);
        console.log(`  created_at: ${order.created_at}`);
        console.log(`  paid_at: ${order.paid_at || "(null)"}`);
      });
    });

    // 売上集計
    console.log("\n\n=== 今日の売上集計 ===\n");
    Object.entries(byPaymentMethod).forEach(([method, orders]) => {
      const total = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
      console.log(`${method}: ${total.toLocaleString()}円 (${orders.length}件)`);
    });

    const grandTotal = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    console.log(`\n合計: ${grandTotal.toLocaleString()}円 (${todayOrders.length}件)`);
  }
}

// 2. 今日のbank_transferステータスの注文
console.log("\n\n=== 今日のbank_transfer注文（ordersテーブルでpayment_method = 'bank_transfer'） ===\n");

const { data: bankTransferOrders, error: btError } = await supabase
  .from("orders")
  .select("*")
  .eq("payment_method", "bank_transfer")
  .gte("created_at", startISO)
  .lt("created_at", endISO)
  .order("created_at", { ascending: false });

if (btError) {
  console.error("エラー:", btError);
} else {
  console.log(`合計: ${bankTransferOrders?.length || 0}件\n`);

  if (bankTransferOrders && bankTransferOrders.length > 0) {
    bankTransferOrders.forEach((order, idx) => {
      console.log(`[${idx + 1}] ID: ${order.id}`);
      console.log(`  patient_id: ${order.patient_id}`);
      console.log(`  product_code: ${order.product_code}`);
      console.log(`  amount: ${order.amount ? order.amount.toLocaleString() + "円" : "(null)"}`);
      console.log(`  status: ${order.status}`);
      console.log(`  created_at: ${order.created_at}`);
      console.log(`  paid_at: ${order.paid_at || "(null)"}`);
      console.log();
    });
  }
}
