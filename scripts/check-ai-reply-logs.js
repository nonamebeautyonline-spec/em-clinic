const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 最新のAI返信
  const { data: aiReplies } = await supabase
    .from("message_log")
    .select("id, patient_id, direction, event_type, message_type, content, status, sent_at, tenant_id")
    .eq("event_type", "ai_reply")
    .order("sent_at", { ascending: false })
    .limit(3);

  if (!aiReplies || aiReplies.length === 0) {
    console.log("AI返信のログなし");
    return;
  }

  console.log("=== AI返信のmessage_logレコード ===");
  aiReplies.forEach((r) => {
    console.log(JSON.stringify({
      id: r.id,
      patient_id: r.patient_id,
      direction: r.direction,
      event_type: r.event_type,
      message_type: r.message_type,
      status: r.status,
      sent_at: r.sent_at,
      tenant_id: r.tenant_id,
      content_preview: (r.content || "").substring(0, 50),
    }));
  });

  // 最新のAI返信患者のメッセージ5件
  const patientId = aiReplies[0].patient_id;
  console.log("\n=== 患者", patientId, "の最新5件 ===");
  const { data: msgs } = await supabase
    .from("message_log")
    .select("id, direction, event_type, message_type, status, sent_at, tenant_id")
    .eq("patient_id", patientId)
    .order("sent_at", { ascending: false })
    .limit(5);
  (msgs || []).forEach((m) => console.log(JSON.stringify(m)));
}

main().catch(console.error);
