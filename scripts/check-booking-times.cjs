require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 20260100826 → 12:15枠、20260200515 → 11:45枠
  const slots = ["11:45:00", "12:15:00"];

  for (const time of slots) {
    const { data } = await sb.from("reservations")
      .select("reserve_id, patient_id, patient_name, reserved_time, status, created_at, updated_at")
      .eq("reserved_date", "2026-02-14")
      .eq("reserved_time", time)
      .order("created_at", { ascending: true });

    console.log("=== 2/14 " + time + " (" + (data || []).length + "人) ===");
    for (const r of (data || [])) {
      const created = r.created_at;
      const updated = r.updated_at;
      const mark = r.status === "canceled" ? "❌" : "✅";
      console.log("  " + mark + " " + r.patient_id + " " + (r.patient_name || ""));
      console.log("    status=" + r.status + "  created=" + created + "  updated=" + updated);
      console.log("    reserve_id=" + r.reserve_id);
    }
    console.log("");
  }
})();
