const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: res } = await sb.from("reservations")
    .select("id, reserve_id, patient_id, patient_name, reserved_time, status")
    .eq("reserved_date", "2026-02-20")
    .neq("status", "canceled");
  console.log("予約数（canceled除く）:", (res || []).length);

  const rids = (res || []).map(r => r.reserve_id);
  const { data: intakes } = await sb.from("intake")
    .select("id, reserve_id, patient_id")
    .in("reserve_id", rids);
  console.log("intake件数:", (intakes || []).length);

  // reserve_idごとの件数
  const countByRid = {};
  for (const i of (intakes || [])) {
    countByRid[i.reserve_id] = (countByRid[i.reserve_id] || 0) + 1;
  }
  const dups = Object.entries(countByRid).filter(([, c]) => c > 1);
  if (dups.length > 0) {
    console.log("\n重複intake（reserve_idに2件以上）:");
    for (const [rid, c] of dups) {
      const rows = (intakes || []).filter(i => i.reserve_id === rid);
      const reservation = (res || []).find(r => r.reserve_id === rid);
      console.log("  reserve_id:", rid, "件数:", c, "患者:", reservation ? reservation.patient_name : "?");
      for (const r of rows) console.log("    intake_id:", r.id);
    }
  } else {
    console.log("\n重複intakeなし");
  }

  // intakeがない予約
  const intakeRids = new Set((intakes || []).map(i => i.reserve_id));
  const noIntake = (res || []).filter(r => {
    return !intakeRids.has(r.reserve_id);
  });
  if (noIntake.length > 0) {
    console.log("\nintakeなし予約:", noIntake.length, "件");
    for (const r of noIntake) console.log(" ", r.patient_name, r.reserved_time);
  }
})();
