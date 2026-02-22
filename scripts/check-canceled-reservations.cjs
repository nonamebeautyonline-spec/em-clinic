require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // まず20260200515を確認
  const { data: r1 } = await sb.from("reservations").select("reserve_id, status, reserved_date, reserved_time").eq("patient_id", "20260200515");
  console.log("20260200515 reservations:", JSON.stringify(r1, null, 2));
  const { data: i1 } = await sb.from("intake").select("reserve_id, reserved_date, reserved_time, patient_name").eq("patient_id", "20260200515");
  console.log("20260200515 intake:", JSON.stringify(i1, null, 2));

  // 2/14のcanceledチェック
  const { data: intakes } = await sb.from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time")
    .eq("reserved_date", "2026-02-14")
    .not("patient_id", "is", null)
    .not("reserve_id", "is", null);

  if (intakes && intakes.length > 0) {
    const reserveIds = intakes.map(i => i.reserve_id).filter(Boolean);
    const { data: resvs } = await sb.from("reservations").select("reserve_id, status").in("reserve_id", reserveIds);
    const resvMap = {};
    for (const r of resvs || []) resvMap[r.reserve_id] = r.status;

    const problems = intakes.filter(i => {
      const st = resvMap[i.reserve_id];
      return st === "canceled" || st === undefined;
    });
    console.log("\n=== 2/14 canceled or missing: " + problems.length + "件 ===");
    for (const p of problems) {
      const st = resvMap[p.reserve_id] || "(レコードなし)";
      console.log("  " + p.patient_id + " " + p.patient_name + " " + p.reserved_time + " status=" + st);
    }
    console.log("=== 2/14 正常: " + (intakes.length - problems.length) + "件 ===");
  }
})();
