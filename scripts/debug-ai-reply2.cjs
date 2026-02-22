const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1. 20251200128 で検索（完全一致＆部分一致）
  const { data: exact } = await supabase
    .from("patients")
    .select("patient_id, patient_name, line_id, tenant_id")
    .eq("patient_id", "20251200128");
  console.log("exact:", exact);

  // 2. 三井 で検索
  const { data: byName } = await supabase
    .from("patients")
    .select("patient_id, patient_name, line_id, tenant_id")
    .ilike("patient_name", "%三井%");
  console.log("三井:", byName);

  // 3. message_logからline_uidを取得
  const { data: ml } = await supabase
    .from("message_log")
    .select("line_uid")
    .eq("patient_id", "20251200128")
    .limit(1);
  const lineUid = ml?.[0]?.line_uid;
  console.log("line_uid:", lineUid);

  // 4. そのline_uidでpatients検索
  if (lineUid) {
    const { data: byLine } = await supabase
      .from("patients")
      .select("patient_id, patient_name, line_id, tenant_id")
      .eq("line_id", lineUid);
    console.log("patients by line_id:", byLine);
  }

  // 5. ai_reply_settings 全件
  const { data: allSettings } = await supabase
    .from("ai_reply_settings")
    .select("id, tenant_id, is_enabled, mode");
  console.log("\nai_reply_settings全件:", allSettings);

  // 6. webhook内でpatientがどう取得されるか確認（line_uidから）
  // webhook はまず answerers を検索する
  if (lineUid) {
    const { data: answerer } = await supabase
      .from("answerers")
      .select("patient_id, name")
      .eq("line_uid", lineUid)
      .maybeSingle();
    console.log("answerer:", answerer);

    // patientsテーブルもline_idで検索
    const { data: patientByLine } = await supabase
      .from("patients")
      .select("patient_id, patient_name, tenant_id")
      .eq("line_id", lineUid)
      .maybeSingle();
    console.log("patient by line_id:", patientByLine);
  }
}
main().catch(console.error);
