// delete-canceled-reservation.mjs
// キャンセルされた予約をreservationsテーブルから削除

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const reserveId = "resv-1768464596770";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`=== Deleting reservation ${reserveId} ===\n`);

try {
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("reserve_id", reserveId);

  if (error) {
    console.error("❌ Delete error:", error);
    process.exit(1);
  }

  console.log(`✓ Successfully deleted ${reserveId}`);
} catch (err) {
  console.error("❌ Error:", err.message);
}
