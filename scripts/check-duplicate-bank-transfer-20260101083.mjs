import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuplicate() {
  const patientId = "20260101083";

  console.log(`\n=== Checking patient ${patientId} ===\n`);

  // 1. ordersテーブルから取得
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
    console.log(`  Status: ${o.status}`);
    console.log(`  Payment Status: ${o.payment_status}`);
    console.log(`  Created At: ${o.created_at}`);
    console.log(`  Paid At: ${o.paid_at}`);
    console.log();
  });

  // 2. bank_transfer_ordersテーブルから取得
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
    console.log(`  Status: ${o.status}`);
    console.log(`  Created At: ${o.created_at}`);
    console.log(`  Confirmed At: ${o.confirmed_at}`);
    console.log();
  });

  // 3. 重複チェックロジックをシミュレート
  console.log("\n--- Duplicate Detection Simulation ---\n");

  const bankTransferOrdersInOrders = orders.filter((o) => o.payment_method === "bank_transfer");
  console.log(`Bank transfer orders in orders table: ${bankTransferOrdersInOrders.length}`);
  bankTransferOrdersInOrders.forEach((o) => {
    console.log(`  - ID: ${o.id}, Created: ${o.created_at}, Paid: ${o.paid_at}`);
  });

  const existingBankTransferOrderIds = new Set(
    bankTransferOrdersInOrders
      .map((o) => {
        if (o.id.startsWith("bt_")) return o.id.replace("bt_", "");
        return null;
      })
      .filter((id) => id !== null)
  );

  console.log(
    `\nExtracted BT order IDs: ${Array.from(existingBankTransferOrderIds).join(", ") || "(none)"}`
  );

  console.log("\n--- Filtering bank_transfer_orders ---\n");
  btOrders.forEach((o) => {
    console.log(`Checking BT order ID ${o.id}:`);

    // IDマッチング
    if (existingBankTransferOrderIds.has(String(o.id))) {
      console.log(`  ❌ Excluded by ID match`);
      return;
    }

    // タイムスタンプマッチング
    const btCreatedAt = new Date(o.created_at).getTime();
    let foundMatch = false;

    bankTransferOrdersInOrders.forEach((orderRecord) => {
      const orderCreatedAt = new Date(orderRecord.paid_at || "").getTime();
      const timeDiff = Math.abs(btCreatedAt - orderCreatedAt);

      if (timeDiff < 1000) {
        console.log(
          `  ❌ Excluded by timestamp match (diff=${timeDiff}ms, order_id=${orderRecord.id})`
        );
        foundMatch = true;
      }
    });

    if (!foundMatch) {
      console.log(`  ✅ Would be included in mypage (no match found)`);
    }
  });
}

checkDuplicate();
