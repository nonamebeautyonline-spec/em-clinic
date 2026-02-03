import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPatientRelations() {
  const patientIds = ["20260100327", "20260100725"];

  for (const patientId of patientIds) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`患者ID: ${patientId}`);
    console.log("=".repeat(60));

    // 予約を確認
    const { data: reservations, error: resvError } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    console.log(`\n--- 予約 (${reservations?.length || 0}件) ---`);
    if (reservations && reservations.length > 0) {
      reservations.forEach(r => {
        console.log(`予約ID: ${r.id}`);
        console.log(`  予約日: ${r.reserved_date}`);
        console.log(`  時間: ${r.reserved_time}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  作成日時: ${r.created_at}`);
        console.log();
      });
    } else {
      console.log("予約なし");
    }

    // 注文を確認
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    console.log(`\n--- 注文 (${orders?.length || 0}件) ---`);
    if (orders && orders.length > 0) {
      orders.forEach(o => {
        console.log(`注文ID: ${o.id}`);
        console.log(`  商品: ${o.product_code}`);
        console.log(`  金額: ${o.amount}円`);
        console.log(`  支払方法: ${o.payment_method}`);
        console.log(`  Status: ${o.status}`);
        console.log(`  Payment Status: ${o.payment_status}`);
        console.log(`  作成日時: ${o.created_at}`);
        console.log(`  支払日時: ${o.paid_at || "(未払い)"}`);
        console.log();
      });
    } else {
      console.log("注文なし");
    }

    // bank_transfer_ordersを確認
    const { data: btOrders, error: btError } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    console.log(`\n--- 銀行振込注文 (${btOrders?.length || 0}件) ---`);
    if (btOrders && btOrders.length > 0) {
      btOrders.forEach(o => {
        console.log(`BT注文ID: ${o.id}`);
        console.log(`  商品: ${o.product_code}`);
        console.log(`  Status: ${o.status}`);
        console.log(`  作成日時: ${o.created_at}`);
        console.log(`  確認日時: ${o.confirmed_at || "(未確認)"}`);
        console.log();
      });
    } else {
      console.log("銀行振込注文なし");
    }
  }
}

checkPatientRelations().catch(console.error);
