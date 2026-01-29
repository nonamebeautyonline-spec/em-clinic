// check-status-filter.mjs
// statusフィルタで1件が除外されている可能性を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Checking status for 1/28 reservations ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("reserve_id, patient_name, reserved_date, reserved_time, status")
    .eq("reserved_date", "2026-01-28")
    .order("reserved_time", { ascending: true });

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log(`Total: ${data.length} records\n`);

  // statusごとにグループ化
  const byStatus = {};
  data.forEach((r) => {
    const status = r.status || "(empty)";
    if (!byStatus[status]) {
      byStatus[status] = [];
    }
    byStatus[status].push(r);
  });

  console.log("=== Status Breakdown ===");
  Object.keys(byStatus).forEach((status) => {
    console.log(`${status}: ${byStatus[status].length} records`);
  });

  // status = "OK" or "NG" の予約を表示
  const completed = data.filter((r) => r.status === "OK" || r.status === "NG");
  if (completed.length > 0) {
    console.log(`\n=== Completed (OK/NG): ${completed.length} ===`);
    completed.forEach((r) => {
      console.log(`  ${r.reserve_id} (${r.patient_name}) [${r.status}]`);
    });
  }

  // カルテUIでデフォルトフィルタは "pending" なので、OK/NG は表示されない
  const pending = data.filter((r) => !r.status || r.status === "" || r.status === "pending");
  console.log(`\n=== Pending (should be visible): ${pending.length} ===`);
} catch (err) {
  console.error("❌ Error:", err.message);
}
