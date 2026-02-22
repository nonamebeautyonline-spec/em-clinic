const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 今日の予約（キャンセル除く）
  const { data: reservations } = await sb
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_time, status")
    .eq("reserved_date", "2026-02-20")
    .neq("status", "canceled");
  console.log("今日の予約（キャンセル除く）:", (reservations || []).length, "件");

  // 当日リマインド（rule_id=2）の sent_log
  const { data: sentLogs } = await sb
    .from("reminder_sent_log")
    .select("*, reservation_id")
    .eq("rule_id", 2);
  console.log("当日リマインド sent_log:", (sentLogs || []).length, "件");

  // 前日リマインド（rule_id=1）の sent_log
  const { data: sentLogs1 } = await sb
    .from("reminder_sent_log")
    .select("id, reservation_id, created_at")
    .eq("rule_id", 1);
  console.log("前日リマインド sent_log:", (sentLogs1 || []).length, "件");

  // message_log の reminder 件数（今日）
  const { data: msgLogs } = await sb
    .from("message_log")
    .select("id, message_type, created_at")
    .eq("message_type", "reminder")
    .gte("created_at", "2026-02-20T00:00:00+09:00");
  console.log("本日の message_log (reminder):", (msgLogs || []).length, "件");

  // 当日リマインドが送られた予約IDと、今日の予約IDを比較
  if (reservations && sentLogs) {
    const todayResIds = new Set(reservations.map(r => r.id));
    const sentResIds = new Set(sentLogs.map(l => l.reservation_id));

    // 今日の予約で当日リマインドが送られなかったもの
    const notSent = reservations.filter(r => !sentResIds.has(r.id));
    console.log("\n当日リマインド未送信:", notSent.length, "件");
    for (const r of notSent) {
      // 患者のLINE ID確認
      const { data: p } = await sb.from("patients").select("line_id").eq("patient_id", r.patient_id).maybeSingle();
      const lineId = p && p.line_id ? (p.line_id.startsWith("LINE_") ? "仮ID" : "あり") : "なし";
      console.log("  ", r.patient_name, r.reserved_time, "LINE:", lineId);
    }

    // sent_logにあるが今日の予約にないもの（別日の予約？）
    const extraSent = sentLogs.filter(l => !todayResIds.has(l.reservation_id));
    if (extraSent.length > 0) {
      console.log("\nsent_logにあるが今日の予約にない:", extraSent.length, "件");
    }
  }
})();
