// find-extra-reservation.mjs
// reservationsテーブルにあってintakeテーブルにない予約を見つける

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Finding extra reservation in reservations table ===\n");

try {
  // 1. reservationsテーブルから1/28の全予約を取得
  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("*")
    .gte("reserved_date", "2026-01-28")
    .lte("reserved_date", "2026-01-28")
    .not("reserved_date", "is", null)
    .order("reserved_time", { ascending: true });

  if (resError) {
    console.error("❌ Error fetching reservations:", resError);
    process.exit(1);
  }

  console.log(`Found ${reservations.length} reservations for 1/28 in reservations table\n`);

  // 2. intakeテーブルから1/28の全予約を取得
  const { data: intake, error: intakeError } = await supabase
    .from("intake")
    .select("reserve_id")
    .gte("reserved_date", "2026-01-28")
    .lte("reserved_date", "2026-01-28")
    .not("reserved_date", "is", null);

  if (intakeError) {
    console.error("❌ Error fetching intake:", intakeError);
    process.exit(1);
  }

  console.log(`Found ${intake.length} intake records for 1/28\n`);

  // 3. intakeに無いreserve_idを探す
  const intakeIds = new Set(intake.map((i) => i.reserve_id));
  const extraReservations = reservations.filter(
    (r) => !intakeIds.has(r.reserve_id)
  );

  if (extraReservations.length === 0) {
    console.log("✓ No extra reservations found - all match!");
  } else {
    console.log(`=== Found ${extraReservations.length} extra reservation(s) ===\n`);
    extraReservations.forEach((r) => {
      console.log(`Reserve ID: ${r.reserve_id}`);
      console.log(`  - Patient ID: ${r.patient_id}`);
      console.log(`  - Patient Name: ${r.patient_name}`);
      console.log(`  - Date: ${r.reserved_date}`);
      console.log(`  - Time: ${r.reserved_time}`);
      console.log(`  - Status: ${r.status}`);
      console.log();
    });
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
