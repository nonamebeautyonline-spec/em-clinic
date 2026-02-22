const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: rules } = await sb.from("reminder_rules").select("*").eq("is_enabled", true);
  console.log("=== ルール ===");
  rules.forEach(r => console.log(r.id, r.name, "type:", r.timing_type, "hour:", r.send_hour, "offset:", r.target_day_offset, "fmt:", r.message_format));

  const { data: reservations } = await sb
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time, status")
    .eq("reserved_date", "2026-02-20")
    .neq("status", "canceled");

  console.log("\n=== 明日(2/20)の予約 ===");
  const resList = reservations || [];
  console.log("件数:", resList.length);
  if (resList.length === 0) return;

  const pids = [...new Set(resList.map(r => r.patient_id))];
  const { data: patients } = await sb.from("patients").select("patient_id, name, line_id").in("patient_id", pids);
  const pMap = new Map((patients || []).map(p => [p.patient_id, p]));

  const flexRule = rules.find(r => r.message_format === "flex");
  let sentSet = new Set();
  if (flexRule) {
    const rids = resList.map(r => r.id);
    const { data: logs } = await sb.from("reminder_sent_log").select("reservation_id").eq("rule_id", flexRule.id).in("reservation_id", rids);
    sentSet = new Set((logs || []).map(l => l.reservation_id));
  }

  let sendable = 0;
  let noLine = 0;
  let alreadySent = 0;

  for (const r of resList) {
    const p = pMap.get(r.patient_id);
    const hasLine = p && p.line_id && p.line_id.indexOf("LINE_") !== 0;
    const sent = sentSet.has(r.id);

    if (sent) { alreadySent++; continue; }
    if (hasLine === false) { noLine++; continue; }
    sendable++;
    console.log("  未送信:", r.patient_name || (p && p.name), r.reserved_time);
  }

  console.log("\n=== 集計 ===");
  console.log("送信済み:", alreadySent);
  console.log("LINE未連携:", noLine);
  console.log("送信対象:", sendable, "人");
})();
