// check-reserved-dates.mjs
// 40件の予約の reserved_date と reserved_time を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Checking reserved_date and reserved_time ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("reserve_id, patient_name, reserved_date, reserved_time")
    .gte("reserved_date", "2026-01-28")
    .lte("reserved_date", "2026-01-28")
    .not("reserved_date", "is", null)
    .order("reserved_time", { ascending: true });

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log(`Total: ${data.length} records\n`);

  // reserved_date または reserved_time が null の予約をチェック
  const missingDate = data.filter((r) => !r.reserved_date);
  const missingTime = data.filter((r) => !r.reserved_time);

  console.log(`Records with missing reserved_date: ${missingDate.length}`);
  console.log(`Records with missing reserved_time: ${missingTime.length}\n`);

  if (missingDate.length > 0) {
    console.log("Missing reserved_date:");
    missingDate.forEach((r) => {
      console.log(`  - ${r.reserve_id} (${r.patient_name})`);
    });
    console.log();
  }

  if (missingTime.length > 0) {
    console.log("Missing reserved_time:");
    missingTime.forEach((r) => {
      console.log(`  - ${r.reserve_id} (${r.patient_name})`);
    });
    console.log();
  }

  // 日付が "2026-01-28" ではない予約をチェック
  const wrongDate = data.filter((r) => r.reserved_date !== "2026-01-28");
  if (wrongDate.length > 0) {
    console.log(`Records with wrong date (not 2026-01-28): ${wrongDate.length}`);
    wrongDate.forEach((r) => {
      console.log(`  - ${r.reserve_id}: ${r.reserved_date} (${r.patient_name})`);
    });
  }

  // 全件表示（最初の5件と最後の5件）
  console.log("\n=== First 5 reservations ===");
  data.slice(0, 5).forEach((r) => {
    console.log(`${r.reserved_time} - ${r.reserve_id} (${r.patient_name})`);
  });

  console.log("\n=== Last 5 reservations ===");
  data.slice(-5).forEach((r) => {
    console.log(`${r.reserved_time} - ${r.reserve_id} (${r.patient_name})`);
  });
} catch (err) {
  console.error("❌ Error:", err.message);
}
