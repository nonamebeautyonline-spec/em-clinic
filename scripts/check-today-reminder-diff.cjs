const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // sent_logの予約IDを取得（rule_id=2が当日リマインド）
  const { data: sentLog } = await sb.from("reminder_sent_log")
    .select("reservation_id")
    .eq("rule_id", 2)
    .gte("created_at", "2026-02-20T23:00:00Z")
    .lte("created_at", "2026-02-21T00:00:00Z");
  const sentRIds = new Set((sentLog || []).map(s => s.reservation_id));
  console.log("sent_log件数:", sentRIds.size);

  // 2/21の有効予約
  const { data: res } = await sb.from("reservations")
    .select("id, reserve_id, patient_name, reserved_date, reserved_time, status")
    .eq("reserved_date", "2026-02-21")
    .neq("status", "canceled");
  const resIds = new Set((res || []).map(r => r.id));
  console.log("2/21有効予約:", resIds.size);

  // sent_logにあるけど2/21予約にない
  console.log("\n--- 余分な送信（2/21予約にないのに送信された）---");
  for (const rid of sentRIds) {
    if (!resIds.has(rid)) {
      const { data: r } = await sb.from("reservations")
        .select("id, patient_name, reserved_date, reserved_time, status")
        .eq("id", rid).single();
      console.log(r);
    }
  }

  // 2/21予約にあるけどsent_logにない
  console.log("\n--- 未送信（2/21予約だけどsent_logにない）---");
  for (const r of (res || [])) {
    if (!sentRIds.has(r.id)) {
      console.log(r.patient_name, r.reserved_time);
    }
  }
})();
