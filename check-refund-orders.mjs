// check-refund-orders.mjs
// 返金された注文を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Refund & Payment Status Check ===\n");

try {
  // 1. 返金ステータス別
  const { data: allOrders } = await supabase
    .from("orders")
    .select("refund_status, payment_status");

  const refundStats = {};
  const paymentStats = {};

  allOrders.forEach(order => {
    const refundStatus = order.refund_status || "none";
    const paymentStatus = order.payment_status || "unknown";

    refundStats[refundStatus] = (refundStats[refundStatus] || 0) + 1;
    paymentStats[paymentStatus] = (paymentStats[paymentStatus] || 0) + 1;
  });

  console.log("=== Refund Status ===");
  Object.keys(refundStats).forEach(status => {
    console.log(`${status}: ${refundStats[status]} orders`);
  });

  console.log("\n=== Payment Status ===");
  Object.keys(paymentStats).forEach(status => {
    console.log(`${status}: ${paymentStats[status]} orders`);
  });

  // 2. 返金がある注文の詳細
  const { data: refundedOrders, count: refundedCount } = await supabase
    .from("orders")
    .select("*", { count: "exact" })
    .not("refund_status", "is", null)
    .neq("refund_status", "none")
    .neq("refund_status", "");

  console.log(`\n=== Orders with refunds: ${refundedCount || 0} ===`);

  if (refundedOrders && refundedOrders.length > 0) {
    refundedOrders.slice(0, 5).forEach((order, i) => {
      console.log(`${i + 1}. Patient ID: ${order.patient_id}`);
      console.log(`   Amount: ${order.amount}, Refunded: ${order.refunded_amount || 0}`);
      console.log(`   Status: ${order.refund_status}`);
      console.log(`   Date: ${order.refunded_at || "N/A"}`);
      console.log();
    });
  }

  console.log("\n=== Analysis ===");
  console.log(`Total in Supabase: 1,809 orders`);
  console.log(`In Square sheet: 1,956 rows`);
  console.log(`Difference: 147 rows`);
  console.log("\nPossible explanations:");
  console.log("- Orders without patient_id were excluded during sync");
  console.log("- Payment failures were excluded");
  console.log("- Duplicate orders were deduplicated");
  console.log("- Some rows in sheet are headers/test data");

} catch (err) {
  console.error("❌ Error:", err.message);
}
