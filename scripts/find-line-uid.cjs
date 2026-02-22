const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const pids = ["20260200115", "20260200570", "20260200580"];

(async () => {
  for (const pid of pids) {
    console.log("=== patient_id:", pid, "===");

    // patients
    const { data: p } = await sb.from("patients").select("name, line_id").eq("patient_id", pid).maybeSingle();
    console.log("  patients.line_id:", p && p.line_id || "(null)");

    // intake
    const { data: intakes } = await sb.from("intake").select("id, line_uid, patient_name").eq("patient_id", pid);
    for (const i of (intakes || [])) {
      console.log("  intake id=" + i.id, "line_uid:", i.line_uid || "(null)", "name:", i.patient_name);
    }

    // reservations
    const { data: reservations } = await sb
      .from("reservations")
      .select("id, line_uid, patient_name, reserved_date")
      .eq("patient_id", pid)
      .order("reserved_date", { ascending: false })
      .limit(3);
    for (const r of (reservations || [])) {
      console.log("  reservation id=" + r.id, "line_uid:", r.line_uid || "(null)", "date:", r.reserved_date);
    }

    // message_log
    const { data: msgs } = await sb
      .from("message_log")
      .select("id, line_uid")
      .eq("patient_id", pid)
      .limit(3);
    for (const m of (msgs || [])) {
      console.log("  message_log id=" + m.id, "line_uid:", m.line_uid || "(null)");
    }

    // scheduled_messages
    const { data: sms } = await sb
      .from("scheduled_messages")
      .select("id, line_uid")
      .eq("patient_id", pid)
      .limit(3);
    for (const s of (sms || [])) {
      console.log("  scheduled_messages id=" + s.id, "line_uid:", s.line_uid || "(null)");
    }

    console.log("");
  }
})();
