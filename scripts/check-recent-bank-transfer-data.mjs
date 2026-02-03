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

console.log("=== 最近の銀行振込データ（最新20件） ===\n");

const { data: recentOrders, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(20);

if (error) {
  console.error("エラー:", error);
  process.exit(1);
}

if (!recentOrders || recentOrders.length === 0) {
  console.log("データが見つかりません");
  process.exit(0);
}

console.log(`合計: ${recentOrders.length}件\n`);

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

recentOrders.forEach((order, idx) => {
  const price = productPrices[order.product_code] || 0;
  console.log(`[${idx + 1}] ID: ${order.id}`);
  console.log(`  patient_id: ${order.patient_id || "(null)"}`);
  console.log(`  product_code: ${order.product_code || "(null)"}`);
  console.log(`  価格: ${price.toLocaleString()}円 ${price === 0 ? "⚠️ 価格未設定" : ""}`);
  console.log(`  status: ${order.status}`);
  console.log(`  created_at: ${order.created_at || "(null)"}`);
  console.log(`  submitted_at: ${order.submitted_at || "(null)"}`);
  console.log();
});

// 日付ごとの集計
console.log("\n=== 日付ごとの集計（submitted_atベース） ===\n");

const dateGroups = {};
recentOrders.forEach(order => {
  if (order.submitted_at) {
    const date = order.submitted_at.split("T")[0];
    if (!dateGroups[date]) {
      dateGroups[date] = { count: 0, revenue: 0 };
    }
    dateGroups[date].count++;
    dateGroups[date].revenue += productPrices[order.product_code] || 0;
  }
});

Object.entries(dateGroups)
  .sort(([a], [b]) => b.localeCompare(a))
  .forEach(([date, stats]) => {
    console.log(`${date}: ${stats.count}件, ${stats.revenue.toLocaleString()}円`);
  });

// created_atベースの集計
console.log("\n=== 日付ごとの集計（created_atベース） ===\n");

const createdDateGroups = {};
recentOrders.forEach(order => {
  if (order.created_at) {
    const date = order.created_at.split("T")[0];
    if (!createdDateGroups[date]) {
      createdDateGroups[date] = { count: 0, revenue: 0 };
    }
    createdDateGroups[date].count++;
    createdDateGroups[date].revenue += productPrices[order.product_code] || 0;
  }
});

Object.entries(createdDateGroups)
  .sort(([a], [b]) => b.localeCompare(a))
  .forEach(([date, stats]) => {
    console.log(`${date}: ${stats.count}件, ${stats.revenue.toLocaleString()}円`);
  });
