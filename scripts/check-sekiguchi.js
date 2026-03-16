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

(async () => {
  // patients.patient_id = 20260202392 の患者情報
  const { data: patient } = await supabase
    .from("patients")
    .select("id, patient_id, name, line_id")
    .eq("patient_id", "20260202392")
    .maybeSingle();

  console.log("患者情報:", patient);

  if (patient) {
    // message_logの検索: patient_idで
    const { data: logs1 } = await supabase
      .from("message_log")
      .select("id, patient_id, line_uid, content, status, direction, created_at")
      .eq("patient_id", String(patient.id))
      .order("created_at", { ascending: false })
      .limit(5);
    console.log("\nmessage_log (patient_id=" + patient.id + "):", logs1);

    // line_uidで検索
    const { data: logs2 } = await supabase
      .from("message_log")
      .select("id, patient_id, line_uid, content, status, direction, created_at")
      .eq("line_uid", patient.line_id)
      .order("created_at", { ascending: false })
      .limit(5);
    console.log("\nmessage_log (line_uid=" + patient.line_id + "):", logs2);
  }

  // トーク画面のAPIがどのようにmessage_logを取得しているか確認用
  // patient_idの形式を確認
})();
