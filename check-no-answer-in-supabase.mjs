// check-no-answer-in-supabase.mjs
// Supabaseのintakeテーブルで call_status="no_answer" のレコードを確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Checking call_status='no_answer' in Supabase ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("reserve_id, patient_id, patient_name, reserved_date, call_status, call_status_updated_at, status")
    .eq("call_status", "no_answer")
    .order("call_status_updated_at", { ascending: false });

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log(`Found ${data.length} records with call_status='no_answer'\n`);

  if (data.length > 0) {
    console.log("=== Records ===");
    data.forEach((r, i) => {
      console.log(`${i + 1}. ${r.reserve_id} - ${r.patient_name || "(no name)"}`);
      console.log(`   reserved_date: ${r.reserved_date || "(none)"}`);
      console.log(`   status: ${r.status || "(pending)"}`);
      console.log(`   call_status_updated_at: ${r.call_status_updated_at || "(none)"}`);
      console.log();
    });
  } else {
    console.log("⚠ No records with call_status='no_answer' found");
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
