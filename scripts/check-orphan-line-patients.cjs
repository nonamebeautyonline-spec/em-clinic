// message_logにあるがpatientsにないLINE_*ユーザーを調査
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // message_logのLINE_* patient_idを取得
  const { data: msgs } = await sb.from("message_log")
    .select("patient_id, line_uid")
    .like("patient_id", "LINE_%")
    .order("sent_at", { ascending: false });

  const pidMap = new Map();
  for (const m of msgs || []) {
    if (m.patient_id && !pidMap.has(m.patient_id)) {
      pidMap.set(m.patient_id, m.line_uid);
    }
  }

  const msgPids = [...pidMap.keys()];
  console.log("message_logのLINE_*ユニーク数:", msgPids.length);

  // patientsにあるか確認
  const { data: pts } = await sb.from("patients")
    .select("patient_id")
    .in("patient_id", msgPids);
  const ptSet = new Set((pts || []).map(p => p.patient_id));

  const orphans = msgPids.filter(pid => !ptSet.has(pid));
  console.log("patientsに存在しないLINE_*:", orphans.length, "件");

  for (const pid of orphans) {
    console.log(" ", pid, "→ line_uid:", pidMap.get(pid));
  }
})();
