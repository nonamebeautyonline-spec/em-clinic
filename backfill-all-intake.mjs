// backfill-all-intake.mjs
// intakeテーブルの全データ（answers、予約情報など）をバックフィル

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret";

if (!GAS_MYPAGE_URL) {
  console.error("❌ Missing GAS_MYPAGE_URL");
  process.exit(1);
}

console.log("=== Backfilling all intake data ===\n");
console.log("This will update:");
console.log("  - Personal info (name, sex, birth, tel, name_kana)");
console.log("  - Answers (questionnaire data)");
console.log("  - Reservation info (reserved_date, reserved_time)");
console.log("  - answerer_id\n");

try {
  const response = await fetch(GAS_MYPAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "backfill_all_intake",
      token: ADMIN_TOKEN,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error("❌ GAS error:", data);
    process.exit(1);
  }

  console.log("✓ Backfill started");
  console.log("  Check GAS logs for details");
  console.log(`  Message: ${data.message}`);
} catch (err) {
  console.error("❌ Error:", err.message);
}
