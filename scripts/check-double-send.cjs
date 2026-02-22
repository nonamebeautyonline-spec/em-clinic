const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // message_log で当日リマインドが2回送られた患者がいるか確認
  const { data: logs } = await sb
    .from("message_log")
    .select("id, patient_id, message_type, created_at, content")
    .eq("message_type", "reminder")
    .gte("created_at", "2026-02-19T15:00:00Z") // JST 2/20 00:00以降
    .order("created_at", { ascending: true });

  console.log("=== 本日のreminder message_log ===");
  console.log("件数:", (logs || []).length);

  // patient_id でグルーピング
  const byPatient = {};
  for (const l of (logs || [])) {
    if (!byPatient[l.patient_id]) byPatient[l.patient_id] = [];
    byPatient[l.patient_id].push(l.created_at);
  }

  // 2回以上ある患者
  const doubles = Object.entries(byPatient).filter(([_, times]) => times.length > 1);
  console.log("2回以上送信された患者:", doubles.length, "人");
  for (const [pid, times] of doubles) {
    console.log("  ", pid, times);
  }

  // 時刻分布
  if (logs && logs.length > 0) {
    const first = logs[0].created_at;
    const last = logs[logs.length - 1].created_at;
    console.log("\n最初:", first);
    console.log("最後:", last);
  }
})();
