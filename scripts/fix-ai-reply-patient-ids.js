// LINE_仮IDで記録されたAI返信のmessage_logを正式IDに修正
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: logs } = await supabase
    .from("message_log")
    .select("id, patient_id, line_uid")
    .eq("event_type", "ai_reply")
    .like("patient_id", "LINE_%");

  console.log("修正対象:", (logs || []).length, "件");

  for (const log of logs || []) {
    const { data: patient } = await supabase
      .from("patients")
      .select("patient_id")
      .eq("line_id", log.line_uid)
      .maybeSingle();

    if (patient && patient.patient_id !== log.patient_id) {
      const { error } = await supabase
        .from("message_log")
        .update({ patient_id: patient.patient_id })
        .eq("id", log.id);
      console.log(`  ${log.id}: ${log.patient_id} → ${patient.patient_id}`, error ? "失敗" : "OK");
    } else {
      console.log(`  ${log.id}: ${log.patient_id} → 正式ID見つからず（未登録患者）`);
    }
  }
}

main().catch(console.error);
