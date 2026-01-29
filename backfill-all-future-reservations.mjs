// backfill-all-future-reservations.mjs
// 予約シートから今日以降の全予約をSupabaseに同期

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL || process.env.GAS_MYPAGE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret";

if (!GAS_RESERVATIONS_URL) {
  console.error("❌ Missing GAS_RESERVATIONS_URL");
  process.exit(1);
}

console.log("=== Backfilling All Future Reservations ===\n");

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

console.log(`今日（${todayStr}）以降の全予約をSupabaseに同期します\n`);

try {
  // 今日以降の全予約をバックフィル（日付範囲指定なし）
  const response = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "backfill_all_future_reservations",
      token: ADMIN_TOKEN,
    }),
  });

  if (!response.ok) {
    console.error("❌ GAS request failed:", response.status);
    process.exit(1);
  }

  const data = await response.json();

  console.log("✓ Backfill started");
  console.log("  Check GAS logs for details");
  console.log(`  Response:`, data);

  console.log("\nWait a few seconds and check with:");
  console.log("  node --env-file=.env.local check-future-reservations.mjs");

} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
