import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

// bank_transfer_ordersの全データ
const { data: btOrders } = await supabase
  .from("bank_transfer_orders")
  .select("id, patient_id, product_code, created_at, confirmed_at")
  .order("created_at", { ascending: false });

console.log(`bank_transfer_orders: ${btOrders?.length || 0}件`);

// ordersテーブルの銀行振込データ
const { data: orders } = await supabase
  .from("orders")
  .select("id, patient_id, product_code, created_at, payment_method")
  .eq("payment_method", "bank_transfer")
  .order("created_at", { ascending: false });

console.log(`orders (bank_transfer): ${orders?.length || 0}件`);

// bank_transfer_ordersにあってordersにないデータを探す
const orderPatientProducts = new Set(
  (orders || []).map(o => `${o.patient_id}_${o.product_code}_${o.created_at?.slice(0, 10)}`)
);

const missingInOrders = (btOrders || []).filter(bt => {
  const key = `${bt.patient_id}_${bt.product_code}_${bt.created_at?.slice(0, 10)}`;
  return !orderPatientProducts.has(key);
});

console.log(`\n--- bank_transfer_ordersにあってordersにないデータ: ${missingInOrders.length}件 ---`);
if (missingInOrders.length > 0) {
  missingInOrders.forEach(bt => {
    console.log(`  ID: ${bt.id}, patient: ${bt.patient_id}, product: ${bt.product_code}, created: ${bt.created_at?.slice(0, 10)}`);
  });
} else {
  console.log("  なし（bank_transfer_ordersは削除可能）");
}
