require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 2/14の全予約（canceledも含む）を取得
  const { data: all } = await sb.from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_time, status, updated_at")
    .eq("reserved_date", "2026-02-14")
    .order("reserved_time", { ascending: true });

  if (!all) { console.log("データなし"); return; }

  // スロット別に集計
  const slots = {};
  for (const r of all) {
    const t = r.reserved_time;
    if (!slots[t]) slots[t] = { total: 0, canceled: 0, pending: 0, other: 0, patients: [] };
    slots[t].total++;
    if (r.status === "canceled") slots[t].canceled++;
    else if (r.status === "pending") slots[t].pending++;
    else slots[t].other++;
    slots[t].patients.push({
      pid: r.patient_id,
      name: r.patient_name,
      status: r.status,
      updated: r.updated_at
    });
  }

  console.log("=== 2/14 スロット別 予約状況 ===\n");
  for (const [time, s] of Object.entries(slots).sort()) {
    const flag = s.canceled > 0 ? " ⚠️" : "";
    console.log(`${time}  合計:${s.total}  有効:${s.pending}  キャンセル:${s.canceled}${flag}`);
    for (const p of s.patients) {
      const mark = p.status === "canceled" ? "❌" : "✅";
      console.log(`  ${mark} ${p.pid} ${p.name || "(名前なし)"} status=${p.status} updated=${p.updated}`);
    }
  }

  // 定員設定も確認
  console.log("\n=== 定員設定 ===");
  const { data: rules } = await sb.from("doctor_weekly_rules")
    .select("doctor_id, weekday, capacity, enabled")
    .eq("enabled", true);
  console.log("weekly_rules:", JSON.stringify(rules, null, 2));

  // 2/14のoverride
  const { data: ov } = await sb.from("doctor_date_overrides")
    .select("*")
    .eq("date", "2026-02-14");
  console.log("2/14 overrides:", JSON.stringify(ov, null, 2));
})();
