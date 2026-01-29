// check-orders-validation.mjs
// ordersテーブルのバリデーション状況を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Orders Validation Check ===\n");

try {
  // 1. 全注文数
  const { count: totalCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  console.log(`Total orders in Supabase: ${totalCount}\n`);

  // 2. Patient IDがない注文
  const { count: noPidCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .or("patient_id.is.null,patient_id.eq.");

  console.log(`Orders without patient_id: ${noPidCount}`);

  // 3. ステータス別（もしstatusカラムがあれば）
  const { data: allOrders } = await supabase
    .from("orders")
    .select("*")
    .limit(10);

  if (allOrders && allOrders.length > 0) {
    console.log("\n=== Sample Order Columns ===");
    const sampleKeys = Object.keys(allOrders[0]);
    console.log(sampleKeys.join(", "));

    // ステータス関連のカラムを探す
    const statusKeys = sampleKeys.filter(k =>
      k.toLowerCase().includes("status") ||
      k.toLowerCase().includes("state") ||
      k.toLowerCase().includes("refund")
    );

    if (statusKeys.length > 0) {
      console.log("\nStatus-related columns:", statusKeys.join(", "));
    }
  }

  // 4. 最近の注文（直近30日）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString();

  const { count: recentCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", fromDate);

  console.log(`\nRecent orders (last 30 days): ${recentCount}`);

  // 5. 今日の注文
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const { count: todayCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStr);

  console.log(`Today's orders: ${todayCount}`);

  console.log("\n=== Summary ===");
  console.log(`Expected (Square webhook sheet): 1,956 rows`);
  console.log(`Actual (Supabase): ${totalCount} records`);
  console.log(`Difference: ${1956 - totalCount} records`);
  console.log("\nPossible reasons for difference:");
  console.log("- Refunds or payment failures");
  console.log("- Orders without patient_id");
  console.log("- Duplicate prevention");
  console.log("- Backfill not executed for certain period");

} catch (err) {
  console.error("❌ Error:", err.message);
}
