// check-0128-no-answer.mjs
// 1/28の予約で call_status="no_answer" のレコードを確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const targetDate = "2026-01-28";

console.log(`=== Checking 1/28 reservations with call_status ===\n`);

try {
  // 1/28の予約を取得
  const { data, error } = await supabase
    .from("intake")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, call_status")
    .eq("reserved_date", targetDate)
    .order("reserved_time", { ascending: true });

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log(`Total records for ${targetDate}: ${data.length}\n`);

  // call_statusがあるレコード
  const withCallStatus = data.filter(r => r.call_status);
  console.log(`Records with call_status: ${withCallStatus.length}\n`);

  if (withCallStatus.length > 0) {
    console.log("=== Records with call_status ===");
    withCallStatus.forEach((r, i) => {
      console.log(`${i + 1}. ${r.reserve_id || "(no reserve_id)"}`);
      console.log(`   Name: ${r.patient_name || "(no name)"}`);
      console.log(`   Time: ${r.reserved_time || "(no time)"}`);
      console.log(`   Status: ${r.status || "(pending)"}`);
      console.log(`   Call Status: ${r.call_status}`);
      console.log();
    });
  }

  // 未診察（statusが空）でcall_statusがno_answerのレコード
  const pendingNoAnswer = data.filter(r => !r.status && r.call_status === "no_answer");
  console.log(`\n=== Pending + no_answer (should show badge): ${pendingNoAnswer.length} ===`);

  if (pendingNoAnswer.length > 0) {
    pendingNoAnswer.forEach((r, i) => {
      console.log(`${i + 1}. ${r.reserve_id} - ${r.patient_name} (${r.reserved_time})`);
    });
  } else {
    console.log("⚠ No records match the badge display condition");
    console.log("   (status empty + call_status=no_answer)");
  }

} catch (err) {
  console.error("❌ Error:", err.message);
}
