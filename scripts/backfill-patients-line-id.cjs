// patients.line_id が null だが他テーブルにLINE UIDがある患者を検出＆埋める
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. patients.line_id が null の患者を取得
  const { data: nullPatients } = await sb
    .from("patients")
    .select("patient_id, name")
    .is("line_id", null);

  console.log("patients.line_id が null:", (nullPatients || []).length, "人");
  if (!nullPatients || nullPatients.length === 0) return;

  const pids = nullPatients.map(p => p.patient_id);
  const nameMap = new Map(nullPatients.map(p => [p.patient_id, p.name]));

  // 2. 各テーブルからLINE UIDを探す
  const found = new Map(); // patient_id -> { uid, source }

  // message_log
  const { data: msgLogs } = await sb
    .from("message_log")
    .select("patient_id, line_uid")
    .in("patient_id", pids)
    .not("line_uid", "is", null)
    .not("line_uid", "like", "LINE_%");
  for (const m of (msgLogs || [])) {
    if (m.line_uid && m.line_uid.startsWith("U")) {
      found.set(m.patient_id, { uid: m.line_uid, source: "message_log" });
    }
  }

  // intake
  const { data: intakes } = await sb
    .from("intake")
    .select("patient_id, line_uid")
    .in("patient_id", pids)
    .not("line_uid", "is", null)
    .not("line_uid", "like", "LINE_%");
  for (const i of (intakes || [])) {
    if (i.line_uid && i.line_uid.startsWith("U") && !found.has(i.patient_id)) {
      found.set(i.patient_id, { uid: i.line_uid, source: "intake" });
    }
  }

  // reservations
  const { data: reservations } = await sb
    .from("reservations")
    .select("patient_id, line_uid")
    .in("patient_id", pids)
    .not("line_uid", "is", null)
    .not("line_uid", "like", "LINE_%");
  for (const r of (reservations || [])) {
    if (r.line_uid && r.line_uid.startsWith("U") && !found.has(r.patient_id)) {
      found.set(r.patient_id, { uid: r.line_uid, source: "reservations" });
    }
  }

  // scheduled_messages
  const { data: schMsgs } = await sb
    .from("scheduled_messages")
    .select("patient_id, line_uid")
    .in("patient_id", pids)
    .not("line_uid", "is", null)
    .not("line_uid", "like", "LINE_%");
  for (const s of (schMsgs || [])) {
    if (s.line_uid && s.line_uid.startsWith("U") && !found.has(s.patient_id)) {
      found.set(s.patient_id, { uid: s.line_uid, source: "scheduled_messages" });
    }
  }

  console.log("LINE UID発見:", found.size, "人\n");

  if (found.size === 0) {
    console.log("埋める対象なし");
    return;
  }

  // 3. patients.line_id を更新
  let updated = 0;
  let errors = 0;
  for (const [pid, info] of found) {
    const { error } = await sb
      .from("patients")
      .update({ line_id: info.uid })
      .eq("patient_id", pid);

    if (error) {
      console.error("  ERROR:", nameMap.get(pid), pid, error.message);
      errors++;
    } else {
      console.log("  UPDATE:", nameMap.get(pid), pid, "←", info.uid, "(from", info.source + ")");
      updated++;
    }
  }

  console.log("\n=== 結果 ===");
  console.log("更新:", updated, "人");
  console.log("エラー:", errors, "人");
})();
