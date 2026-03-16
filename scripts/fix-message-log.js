const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MESSAGE_TEXT = "本日電話の調子が悪く、050-から始まる番号よりおかけします。よろしくお願いいたします。";
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

(async () => {
  // 今回INSERTしたレコードを特定（contentで検索）
  const { data: logs, error } = await supabase
    .from("message_log")
    .select("id, patient_id, line_uid")
    .eq("content", MESSAGE_TEXT)
    .eq("tenant_id", TENANT_ID);

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`該当message_log: ${logs.length}件`);

  // line_uid → patients.line_id → patients.patient_id のマッピングを作成
  const lineIds = [...new Set(logs.map(l => l.line_uid).filter(Boolean))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, patient_id, line_id")
    .in("line_id", lineIds);

  const lineToPatientId = {};
  for (const p of (patients || [])) {
    lineToPatientId[p.line_id] = p.patient_id; // "20260202392" 形式
  }

  // 各レコードのpatient_idを修正
  let updated = 0;
  for (const log of logs) {
    const correctPid = lineToPatientId[log.line_uid];
    if (correctPid && log.patient_id !== correctPid) {
      const { error: uErr } = await supabase
        .from("message_log")
        .update({ patient_id: correctPid })
        .eq("id", log.id);
      if (uErr) console.error(`ID ${log.id} 更新失敗:`, uErr.message);
      else updated++;
    }
  }

  console.log(`✓ ${updated}件のpatient_idを修正`);
  
  // 確認: 関口さん
  const { data: check } = await supabase
    .from("message_log")
    .select("id, patient_id, line_uid, content")
    .eq("patient_id", "20260202392")
    .eq("content", MESSAGE_TEXT);
  console.log("\n関口さんのログ:", check);
})();
