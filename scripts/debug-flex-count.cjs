// 患者20260100660 の flex_json 付きメッセージを全件確認
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await sb.from("message_log")
    .select("id, message_type, sent_at, direction, status")
    .eq("patient_id", "20260100660")
    .not("flex_json", "is", null)
    .order("sent_at", { ascending: false });
  console.log("flex_json付きメッセージ数:", (data || []).length);
  for (const r of (data || [])) {
    console.log("  id=" + r.id, r.message_type, r.sent_at, r.direction, r.status);
  }
})();
