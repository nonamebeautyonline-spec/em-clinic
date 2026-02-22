const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const lineUid = "Ud3b9239f681c04d0fe97ab72b60781c9";

  // 1. line_uid でmessage_log検索（patient_idの分布を見る）
  const { data: msgs } = await supabase
    .from("message_log")
    .select("id, patient_id, direction, content, sent_at")
    .eq("line_uid", lineUid)
    .order("sent_at", { ascending: false })
    .limit(20);

  console.log("=== message_log by line_uid ===");
  for (const m of (msgs || [])) {
    console.log(`  [${m.direction}] pid=${m.patient_id} | ${m.content?.substring(0, 50)} | ${m.sent_at}`);
  }

  // 2. LINE_ で始まるpatient_idを検索
  const { data: linePatients } = await supabase
    .from("patients")
    .select("patient_id, patient_name, line_id, tenant_id")
    .eq("line_id", lineUid);
  console.log("\npatients with this line_id:", linePatients);

  // 3. LINE_で始まるpatientをpatient_idで検索
  const linePatientId = `LINE_${lineUid.slice(-8)}`;
  console.log(`\nExpected LINE_ patient_id: ${linePatientId}`);
  const { data: linePat } = await supabase
    .from("patients")
    .select("patient_id, patient_name, line_id, tenant_id")
    .eq("patient_id", linePatientId);
  console.log("LINE_ patient:", linePat);

  // 4. intake テーブルも確認
  const { data: intakes } = await supabase
    .from("intake")
    .select("id, patient_id, created_at")
    .eq("patient_id", "20251200128")
    .limit(5);
  console.log("\nintake for 20251200128:", intakes);

  // 5. 全patient_idが20251200128を含むテーブルを調べる
  const { data: intakeL } = await supabase
    .from("intake")
    .select("id, patient_id, created_at")
    .eq("patient_id", linePatientId)
    .limit(5);
  console.log(`intake for ${linePatientId}:`, intakeL);
}
main().catch(console.error);
