// check-intake-20260128.mjs
// intakeテーブルから1/28のデータを確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Checking 1/28 Intake Data ===\n");

try {
  // 1/28の予約データを取得
  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .gte("reserved_date", "2026-01-28")
    .lte("reserved_date", "2026-01-28")
    .not("reserved_date", "is", null)
    .order("reserved_time", { ascending: true });

  if (error) {
    console.error("❌ Supabase error:", error);
    process.exit(1);
  }

  console.log(`✓ Found ${data.length} intake records for 1/28\n`);

  // 氏名なしをチェック
  const noName = data.filter((r) => !r.patient_name || r.patient_name.trim() === "");
  const noPatientId = data.filter((r) => !r.patient_id);

  console.log("=== Issues ===");
  console.log(`- No patient_name: ${noName.length}`);
  console.log(`- No patient_id: ${noPatientId.length}\n`);

  if (noName.length > 0) {
    console.log("Records without patient_name:");
    noName.forEach((r) => {
      console.log(`  - ${r.reserve_id} (patient_id: ${r.patient_id || "NONE"})`);
    });
    console.log();
  }

  // 指定されたreserveIDを確認
  const targetIds = ["resv-1769514222850", "resv-1769536598111"];
  console.log("=== Checking specific reserve_ids ===");
  targetIds.forEach((id) => {
    const found = data.find((r) => r.reserve_id === id);
    if (found) {
      console.log(`✓ ${id}:`);
      console.log(`  - patient_id: ${found.patient_id || "NONE"}`);
      console.log(`  - patient_name: ${found.patient_name || "NONE"}`);
      console.log(`  - reserved_time: ${found.reserved_time || "NONE"}`);
    } else {
      console.log(`✗ ${id}: NOT FOUND in intake`);
    }
  });
} catch (err) {
  console.error("❌ Error:", err.message);
}
