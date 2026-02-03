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

async function checkPatient() {
  const patientId = "20260101083";

  console.log(`\n=== Checking patient ${patientId} ===\n`);

  // 1. orders テーブル
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Orders error:", ordersError);
    return;
  }

  console.log(`\n--- Orders table (${orders.length} records) ---`);
  orders.forEach((o) => {
    console.log(`ID: ${o.id}`);
    console.log(`  Payment Method: ${o.payment_method}`);
    console.log(`  Product: ${o.product_code}`);
    console.log(`  Amount: ${o.amount}`);
    console.log(`  Created: ${o.created_at}`);
    console.log(`  Paid At: ${o.paid_at}`);
    console.log(`  Status: ${o.status}`);
    console.log();
  });

  // 2. bank_transfer_orders テーブル
  const { data: btOrders, error: btError } = await supabase
    .from("bank_transfer_orders")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (btError) {
    console.error("Bank transfer orders error:", btError);
    return;
  }

  console.log(`\n--- Bank Transfer Orders table (${btOrders.length} records) ---`);
  btOrders.forEach((o) => {
    console.log(`ID: ${o.id}`);
    console.log(`  Product: ${o.product_code}`);
    console.log(`  Amount: ${o.amount}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Created: ${o.created_at}`);
    console.log(`  Confirmed: ${o.confirmed_at}`);
    console.log();
  });

  // 3. マイページAPIのロジックをシミュレート
  console.log("\n--- Simulating Mypage Logic ---\n");

  // bank_transfer payment_method の orders
  const bankTransferOrdersInOrders = orders.filter((o) => o.payment_method === "bank_transfer");
  console.log(`Bank transfer orders in orders table: ${bankTransferOrdersInOrders.length}`);

  if (bankTransferOrdersInOrders.length > 0) {
    console.log("Bank transfer orders:");
    bankTransferOrdersInOrders.forEach(o => {
      console.log(`  - ${o.id}: ${o.product_code}, paid_at: ${o.paid_at}`);
    });
  }

  // bt_ で始まる order ID を抽出
  const existingBankTransferOrderIds = new Set(
    bankTransferOrdersInOrders
      .map((o) => {
        if (o.id.startsWith("bt_")) return o.id.replace("bt_", "");
        return null;
      })
      .filter((id) => id !== null)
  );

  console.log(`\nExtracted BT order IDs from orders table: ${Array.from(existingBankTransferOrderIds).join(", ") || "(none)"}`);

  // bank_transfer_orders をチェック
  console.log(`\n--- Checking ${btOrders.length} bank_transfer_orders ---\n`);
  const includedOrders = [];

  btOrders.forEach((o) => {
    console.log(`\nChecking BT order ${o.id} (${o.product_code}):`);

    // Step 1: ID matching
    if (existingBankTransferOrderIds.has(String(o.id))) {
      console.log(`  ❌ EXCLUDED by ID match (found bt_${o.id} in orders)`);
      return;
    }

    // Step 2: Timestamp + Product matching
    const btCreatedAt = new Date(o.created_at).getTime();
    const btProductCode = String(o.product_code ?? "");

    let foundMatch = false;
    bankTransferOrdersInOrders.forEach((orderRecord) => {
      // ★ 修正: paid_atではなくcreated_atで比較
      const orderCreatedAt = new Date(orderRecord.created_at || "").getTime();
      const timeDiff = Math.abs(btCreatedAt - orderCreatedAt);

      console.log(`  Comparing with order ${orderRecord.id}:`);
      console.log(`    BT created_at: ${o.created_at}, Order created_at: ${orderRecord.created_at}`);
      console.log(`    Time diff: ${timeDiff}ms (${(timeDiff / 1000).toFixed(1)}s)`);
      console.log(`    BT product: ${btProductCode}, Order product: ${orderRecord.product_code}`);

      if (timeDiff < 60000) {
        // 60秒以内
        if (btProductCode === orderRecord.product_code) {
          console.log(`    ❌ EXCLUDED by timestamp+product match (${timeDiff}ms, same product)`);
          foundMatch = true;
        } else if (timeDiff < 1000) {
          console.log(`    ❌ EXCLUDED by strict timestamp match (${timeDiff}ms < 1s, different products)`);
          foundMatch = true;
        } else {
          console.log(`    ⚠️  Within 60s but different products - NOT excluded`);
        }
      } else {
        console.log(`    ✓ Time diff > 60s - NOT excluded`);
      }
    });

    if (!foundMatch) {
      console.log(`  ✅ INCLUDED in mypage (no match found)`);
      includedOrders.push(o);
    }
  });

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Orders table: ${orders.length} total, ${bankTransferOrdersInOrders.length} bank transfer`);
  console.log(`Bank Transfer Orders table: ${btOrders.length} total`);
  console.log(`Would be included from bank_transfer_orders: ${includedOrders.length}`);
  console.log(`\nFinal mypage order count would be: ${orders.length} + ${includedOrders.length} = ${orders.length + includedOrders.length}`);

  if (includedOrders.length > 0) {
    console.log(`\nIncluded bank_transfer_orders:`);
    includedOrders.forEach(o => {
      console.log(`  - ${o.id}: ${o.product_code}`);
    });
  }
}

checkPatient().catch(console.error);
