const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const patientId = "20251200128";

  // 1. patient情報
  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id, patient_name, line_id, tenant_id")
    .eq("patient_id", patientId)
    .maybeSingle();
  console.log("patient:", patient);

  // 2. 直近のincomingメッセージ
  const { data: msgs } = await supabase
    .from("message_log")
    .select("id, direction, content, event_type, sent_at")
    .eq("patient_id", patientId)
    .order("sent_at", { ascending: false })
    .limit(10);
  console.log("\n直近メッセージ:");
  for (const m of (msgs || [])) {
    console.log(`  [${m.direction}] ${m.event_type || "null"} | ${m.content?.substring(0, 60)} | ${m.sent_at}`);
  }

  // 3. ai_reply_settings
  const tenantId = patient?.tenant_id;
  let query = supabase.from("ai_reply_settings").select("*");
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  } else {
    query = query.is("tenant_id", null);
  }
  const { data: settings } = await query.maybeSingle();
  console.log("\nai_reply_settings:", {
    is_enabled: settings?.is_enabled,
    mode: settings?.mode,
    min_message_length: settings?.min_message_length,
    tenant_id: settings?.tenant_id,
  });

  // 4. ai_reply_drafts
  const { data: drafts } = await supabase
    .from("ai_reply_drafts")
    .select("id, status, ai_category, created_at, draft_reply")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(5);
  console.log("\nai_reply_drafts:", drafts);

  // 5. テナントの不一致をチェック
  if (tenantId) {
    const { data: settingsNull } = await supabase
      .from("ai_reply_settings")
      .select("id, is_enabled, tenant_id")
      .is("tenant_id", null)
      .maybeSingle();
    console.log("\nai_reply_settings (tenant_id=null):", settingsNull);
  }
}
main().catch(console.error);
