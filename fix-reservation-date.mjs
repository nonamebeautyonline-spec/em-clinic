// fix-reservation-date.mjs
// 予約の日付を修正

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const reserveId = "resv-1768464596770";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`=== Fixing reservation date for ${reserveId} ===\n`);

try {
  const { error } = await supabase
    .from("reservations")
    .update({ reserved_date: "2026-01-30" })
    .eq("reserve_id", reserveId);

  if (error) {
    console.error("❌ Update error:", error);
    process.exit(1);
  }

  console.log(`✓ Successfully updated ${reserveId} to 2026-01-30`);
} catch (err) {
  console.error("❌ Error:", err.message);
}
