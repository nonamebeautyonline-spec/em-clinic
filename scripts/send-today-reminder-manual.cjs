// 当日リマインド（テキスト）手動送信
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LINE_API = "https://api.line.me/v2/bot/message/push";
const RULE_ID = 2;
const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TARGET_DATE = "2026-02-20";

(async () => {
  const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

  // ルール取得
  const { data: rule } = await sb.from("reminder_rules").select("*").eq("id", RULE_ID).maybeSingle();

  // 予約取得
  const { data: reservations } = await sb
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time")
    .eq("reserved_date", TARGET_DATE)
    .neq("status", "canceled");

  console.log("対象予約:", (reservations || []).length, "件");

  // sent_log確認（既に成功済みは除外 → message_logに記録あるもの）
  const { data: msgLogs } = await sb
    .from("message_log")
    .select("patient_id")
    .eq("message_type", "reminder")
    .gte("created_at", TARGET_DATE + "T00:00:00+09:00");
  const sentPatients = new Set((msgLogs || []).map(m => m.patient_id));

  // 患者LINE ID取得
  const pids = [...new Set((reservations || []).map(r => r.patient_id))];
  const { data: patients } = await sb.from("patients").select("patient_id, name, line_id").in("patient_id", pids);
  const pMap = new Map((patients || []).map(p => [p.patient_id, p]));

  // 日付フォーマット
  const d = new Date(TARGET_DATE + "T00:00:00+09:00");
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${dow})`;

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let alreadySent = 0;

  for (const r of (reservations || [])) {
    const p = pMap.get(r.patient_id);

    if (sentPatients.has(r.patient_id)) {
      alreadySent++;
      continue;
    }

    if (!p || !p.line_id || p.line_id.indexOf("LINE_") === 0) {
      console.log("  SKIP (LINE未連携):", r.patient_name || "不明");
      skipped++;
      continue;
    }

    const timeStr = r.reserved_time.substring(0, 5);
    const text = rule.message_template
      .replace(/\{name\}/g, p.name || r.patient_name || "")
      .replace(/\{date\}/g, dateStr)
      .replace(/\{time\}/g, timeStr)
      .replace(/\{patient_id\}/g, r.patient_id);

    const res = await fetch(LINE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ to: p.line_id, messages: [{ type: "text", text }] }),
    });

    // sent_log（まだなければ）
    await sb.from("reminder_sent_log").upsert({
      tenant_id: TENANT_ID,
      rule_id: RULE_ID,
      reservation_id: r.id,
    }, { onConflict: "rule_id,reservation_id" }).select();

    if (res.ok) {
      await sb.from("message_log").insert({
        tenant_id: TENANT_ID,
        patient_id: r.patient_id,
        line_uid: p.line_id,
        message_type: "reminder",
        content: text,
        status: "sent",
        direction: "outgoing",
      });
      sent++;
      console.log("  OK:", p.name, timeStr);
    } else {
      const errText = await res.text().catch(() => "");
      console.error("  FAIL:", p.name, res.status, errText);
      failed++;
    }
  }

  console.log("\n=== 結果 ===");
  console.log("送信成功:", sent);
  console.log("送信済み:", alreadySent);
  console.log("スキップ:", skipped);
  console.log("失敗:", failed);
})();
