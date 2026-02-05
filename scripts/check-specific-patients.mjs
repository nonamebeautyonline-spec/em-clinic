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

async function main() {
  const patientIds = ["20260101610", "20260200074"];

  console.log("=== 指定患者の全注文データを確認 ===\n");

  for (const patientId of patientIds) {
    console.log(`\n========== 患者ID: ${patientId} ==========`);

    // ordersテーブルから全データ取得
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error:", error.message);
      continue;
    }

    if (!orders || orders.length === 0) {
      console.log("注文なし");
      continue;
    }

    console.log(`注文数: ${orders.length}\n`);

    for (const order of orders) {
      console.log("--- Order ---");
      console.log(`  id: ${order.id}`);
      console.log(`  payment_method: ${order.payment_method}`);
      console.log(`  status: ${order.status}`);
      console.log(`  created_at: ${order.created_at}`);
      console.log(`  paid_at: ${order.paid_at}`);
      console.log(`  updated_at: ${order.updated_at}`);
      console.log(`  shipping_status: ${order.shipping_status}`);
      console.log(`  shipping_date: ${order.shipping_date}`);
      console.log(`  tracking_number: ${order.tracking_number || "(null/empty)"}`);
      console.log(`  product_code: ${order.product_code}`);
      console.log(`  amount: ${order.amount}`);
      console.log("");
    }

    // bank_transfer_ordersも確認
    const { data: btOrders } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", patientId);

    if (btOrders && btOrders.length > 0) {
      console.log("\n--- bank_transfer_orders ---");
      for (const o of btOrders) {
        console.log(JSON.stringify(o, null, 2));
      }
    }
  }

  // 直近のupdated_atを持つ注文（tracking付与は通常updated_atを更新する）
  console.log("\n\n=== 直近24時間以内にupdated_atが更新されたクレカ注文 ===");
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentlyUpdated } = await supabase
    .from("orders")
    .select("id, patient_id, tracking_number, shipping_date, shipping_status, updated_at, payment_method")
    .eq("payment_method", "credit_card")
    .gte("updated_at", oneDayAgo)
    .order("updated_at", { ascending: false })
    .limit(20);

  console.log(`件数: ${recentlyUpdated?.length || 0}`);
  (recentlyUpdated || []).forEach((o, i) => {
    console.log(`  ${i+1}. patient: ${o.patient_id} | tracking: ${o.tracking_number || '-'} | shipping_date: ${o.shipping_date || '-'} | updated: ${o.updated_at}`);
  });
}

main().catch(console.error);
