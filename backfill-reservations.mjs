// backfill-reservations.mjs
// 既存の予約データをSupabaseに同期

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!GAS_RESERVATIONS_URL || !ADMIN_TOKEN) {
  console.error("❌ Missing GAS_RESERVATIONS_URL or ADMIN_TOKEN");
  process.exit(1);
}

const targetDate = "2026-01-28";

console.log(`=== Backfilling reservations for ${targetDate || "all dates"} ===\n`);

try {
  // 1. GASから予約データを取得
  const response = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "backfill_reservations",
      date: targetDate,
      token: ADMIN_TOKEN,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error("❌ GAS error:", data);
    process.exit(1);
  }

  console.log(`✓ Backfill completed`);
  console.log(`  - Total rows in sheet: ${data.total_rows || 0}`);
  console.log(`  - Skipped (different date or canceled): ${data.skipped || 0}`);
  console.log(`  - Processed: ${data.processed || 0} reservations`);
  console.log(`  - Synced to Supabase: ${data.synced || 0} reservations`);
  console.log(`  - Errors: ${data.errors || 0}`);

  if (data.details) {
    console.log("\nDetails:");
    data.details.forEach((d) => {
      console.log(`  ${d}`);
    });
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
