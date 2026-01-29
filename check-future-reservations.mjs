// check-future-reservations.mjs
// 今後の全予約を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Future Reservations Check ===\n");

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

console.log(`Today: ${todayStr}\n`);

try {
  // 1. 今日以降の全予約
  const { data: futureReservations, count: futureCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact" })
    .gte("reserved_date", todayStr)
    .order("reserved_date", { ascending: true });

  console.log(`Total future reservations (>= today): ${futureCount}\n`);

  // 2. 日付別集計
  const byDate = {};
  futureReservations.forEach(r => {
    const date = r.reserved_date;
    byDate[date] = (byDate[date] || 0) + 1;
  });

  console.log("=== By Date ===");
  Object.keys(byDate).sort().forEach(date => {
    console.log(`${date}: ${byDate[date]} reservations`);
  });

  // 3. 最も未来の予約日
  if (futureReservations.length > 0) {
    const latest = futureReservations[futureReservations.length - 1];
    console.log(`\nLatest reservation date: ${latest.reserved_date}`);
  }

  // 4. 今後30日間の予約
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);
  const thirtyDaysLaterStr = thirtyDaysLater.toISOString().slice(0, 10);

  const { count: next30DaysCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .gte("reserved_date", todayStr)
    .lte("reserved_date", thirtyDaysLaterStr);

  console.log(`\nNext 30 days reservations: ${next30DaysCount}`);

  // 5. 2月以降の予約
  const { count: februaryAndLaterCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .gte("reserved_date", "2026-02-01");

  console.log(`February 2026 and later: ${februaryAndLaterCount}`);

  console.log("\n=== Analysis ===");
  console.log(`Current Supabase reservations: ${futureCount}`);
  console.log(`Google Sheet total rows: 2,368`);

  if (futureCount < 100) {
    console.log("\n⚠ WARNING: Only 42 future reservations found!");
    console.log("   This seems too few. Expected more upcoming reservations.");
    console.log("   Possible issues:");
    console.log("   - Backfill only processed recent dates (1/28-1/30)");
    console.log("   - Future reservations not synced yet");
    console.log("   - Reservations are being deleted after certain period");
  }

} catch (err) {
  console.error("❌ Error:", err.message);
}
