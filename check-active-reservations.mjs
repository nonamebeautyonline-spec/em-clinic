// check-active-reservations.mjs
// アクティブな予約数を確認（キャンセルを除く）

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Active Reservations Analysis ===\n");

try {
  // 1. 全予約（Supabase）
  const { data: allReservations, count: totalCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact" })
    .order("reserved_date", { ascending: false });

  console.log(`Total reservations in Supabase: ${totalCount}\n`);

  // 2. ステータス別集計
  const byStatus = {};
  allReservations.forEach(r => {
    const status = r.status || "pending";
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  console.log("=== Status Breakdown ===");
  Object.keys(byStatus).forEach(status => {
    console.log(`${status}: ${byStatus[status]} records`);
  });

  // 3. 日付別集計（直近30日）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const today = new Date();

  const dateGroups = {
    "過去": 0,
    "今日以降": 0,
  };

  allReservations.forEach(r => {
    const reservedDate = new Date(r.reserved_date);
    if (reservedDate < thirtyDaysAgo) {
      dateGroups["過去"]++;
    } else {
      dateGroups["今日以降"]++;
    }
  });

  console.log("\n=== Date Range ===");
  Object.keys(dateGroups).forEach(range => {
    console.log(`${range}: ${dateGroups[range]} records`);
  });

  // 4. 最古と最新の予約日
  if (allReservations.length > 0) {
    const oldest = allReservations[allReservations.length - 1];
    const newest = allReservations[0];

    console.log("\n=== Date Range ===");
    console.log(`Oldest: ${oldest.reserved_date} (${oldest.reserve_id})`);
    console.log(`Newest: ${newest.reserved_date} (${newest.reserve_id})`);
  }

  // 5. 今日以降の予約（未来の予約のみ）
  const todayStr = today.toISOString().slice(0, 10);
  const { count: futureCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .gte("reserved_date", todayStr);

  console.log(`\nFuture reservations (>= today): ${futureCount} records`);

} catch (err) {
  console.error("❌ Error:", err.message);
}
