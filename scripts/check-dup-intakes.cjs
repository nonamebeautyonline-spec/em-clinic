const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: all } = await sb.from("intake")
    .select("patient_id, id, created_at, reserve_id, answerer_id, status, note")
    .order("patient_id")
    .order("created_at", { ascending: true });

  const grouped = {};
  for (const r of (all || [])) {
    if (!grouped[r.patient_id]) grouped[r.patient_id] = [];
    grouped[r.patient_id].push(r);
  }

  const dups = Object.entries(grouped).filter(([, rows]) => rows.length >= 2);
  console.log("重複intake patient数:", dups.length);
  for (const [pid, rows] of dups) {
    console.log("\n--- patient_id:", pid, "(" + rows.length + "件) ---");
    for (const r of rows) {
      const noteStr = r.note ? r.note.substring(0, 30) : "null";
      console.log(
        "  id:", r.id,
        "| created:", (r.created_at || "").substring(0, 19),
        "| reserve_id:", r.reserve_id || "null",
        "| answerer_id:", r.answerer_id || "null",
        "| status:", r.status || "null",
        "| note:", noteStr
      );
    }
  }
})();
