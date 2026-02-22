const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // ルールID=1 (前日リマインドFLEX) の送信ログを確認
  const { data: logs, error } = await sb
    .from("reminder_sent_log")
    .select("*")
    .eq("rule_id", 1)
    .order("created_at", { ascending: false })
    .limit(100);

  console.log("=== reminder_sent_log (rule_id=1) ===");
  console.log("件数:", (logs || []).length);
  if (error) console.log("error:", error.message);

  if (logs && logs.length > 0) {
    console.log("\n最新10件:");
    logs.slice(0, 10).forEach(l => {
      console.log("  id:", l.id, "reservation_id:", l.reservation_id, "created_at:", l.created_at, "tenant_id:", l.tenant_id);
    });

    // 日付ごとの集計
    const byDate = {};
    for (const l of logs) {
      const d = l.created_at ? l.created_at.substring(0, 10) : "unknown";
      byDate[d] = (byDate[d] || 0) + 1;
    }
    console.log("\n日付別集計:");
    Object.entries(byDate).sort().forEach(([d, c]) => console.log("  ", d, ":", c, "件"));
  }

  // 該当の66件のreservation_idで実際の予約を照合
  if (logs && logs.length > 0) {
    const rids = logs.map(l => l.reservation_id);
    const { data: reservations } = await sb
      .from("reservations")
      .select("id, reserved_date, status")
      .in("id", rids);

    const dateCount = {};
    for (const r of (reservations || [])) {
      const key = r.reserved_date + " (" + r.status + ")";
      dateCount[key] = (dateCount[key] || 0) + 1;
    }
    console.log("\n送信ログに紐づく予約の日付:");
    Object.entries(dateCount).sort().forEach(([d, c]) => console.log("  ", d, ":", c, "件"));
  }

  // message_log でリマインド送信の記録を確認
  const { data: msgLogs } = await sb
    .from("message_log")
    .select("id, patient_id, message_type, created_at, content")
    .eq("message_type", "reminder")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("\n=== message_log (type=reminder) 最新10件 ===");
  console.log("件数:", (msgLogs || []).length);
  (msgLogs || []).forEach(m => {
    console.log("  ", m.created_at, m.patient_id, (m.content || "").substring(0, 40));
  });
})();
