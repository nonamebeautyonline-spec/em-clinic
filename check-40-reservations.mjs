// check-40-reservations.mjs
// 指定された40件のreserve_idがSupabaseに存在するか確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const expectedIds = [
  "resv-1766711202919",
  "resv-1768397711599",
  "resv-1768739540960",
  "resv-1768888460628",
  "resv-1768908359598",
  "resv-1769132894118",
  "resv-1769234689666",
  "resv-1769248176161",
  "resv-1769257843223",
  "resv-1769297626606",
  "resv-1769326763519",
  "resv-1769343391816",
  "resv-1769345973107",
  "resv-1769368005650",
  "resv-1769425626294",
  "resv-1769430022197",
  "resv-1769430213410",
  "resv-1769435956198",
  "resv-1769456192149",
  "resv-1769492345278",
  "resv-1769498716767",
  "resv-1769499537929",
  "resv-1769506046004",
  "resv-1769506791317",
  "resv-1769511202031",
  "resv-1769513899606",
  "resv-1769514222850",
  "resv-1769514400086",
  "resv-1769516430143",
  "resv-1769522469816",
  "resv-1769528205282",
  "resv-1769529969039",
  "resv-1769532759990",
  "resv-1769533107917",
  "resv-1769533478466",
  "resv-1769536598111",
  "resv-1769545187966",
  "resv-1769547858894",
  "resv-1769551301655",
  "resv-1769560042653",
];

console.log(`=== Checking ${expectedIds.length} reservations in Supabase ===\n`);

try {
  // intakeテーブルから1/28の全予約を取得
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time")
    .gte("reserved_date", "2026-01-28")
    .lte("reserved_date", "2026-01-28")
    .not("reserved_date", "is", null)
    .order("reserved_time", { ascending: true });

  if (intakeError) {
    console.error("❌ Error:", intakeError);
    process.exit(1);
  }

  console.log(`Found ${intakeData.length} records in intake table for 1/28\n`);

  const foundIds = new Set(intakeData.map((r) => r.reserve_id));
  let missing = [];
  let found = 0;

  for (const id of expectedIds) {
    if (foundIds.has(id)) {
      found++;
    } else {
      missing.push(id);
    }
  }

  console.log(`✓ Found: ${found}/${expectedIds.length}`);
  console.log(`✗ Missing: ${missing.length}\n`);

  if (missing.length > 0) {
    console.log("Missing reserve_ids:");
    missing.forEach((id) => {
      console.log(`  - ${id}`);
    });
    console.log();
  }

  // 逆チェック：intakeにあるがリストにない予約
  const expectedSet = new Set(expectedIds);
  const extraInIntake = intakeData.filter((r) => !expectedSet.has(r.reserve_id));

  if (extraInIntake.length > 0) {
    console.log(`Found ${extraInIntake.length} extra reservation(s) in intake not in the list:`);
    extraInIntake.forEach((r) => {
      console.log(`  - ${r.reserve_id} (${r.patient_name}) ${r.reserved_time}`);
    });
  } else {
    console.log("No extra reservations in intake table");
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
