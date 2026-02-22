require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const pids = ["20260100826", "20260200515"];
  for (const pid of pids) {
    const { data } = await sb.from("message_log")
      .select("id, patient_id, message_type, status, created_at")
      .eq("patient_id", pid)
      .eq("message_type", "reservation_canceled");

    console.log(pid + " のキャンセル通知ログ: " + (data || []).length + "件");
    for (const m of (data || [])) {
      console.log("  " + m.created_at + " status=" + m.status);
    }
    console.log("");
  }
})();
