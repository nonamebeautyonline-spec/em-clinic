const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const names = ["島ノ江 友里", "鈴木泰子", "土屋衣織"];

  for (const name of names) {
    const { data } = await sb
      .from("patients")
      .select("patient_id, name, line_id")
      .ilike("name", `%${name.replace(" ", "%")}%`);

    for (const p of (data || [])) {
      console.log(p.name, "| patient_id:", p.patient_id, "| line_id:", p.line_id || "(null)");
    }
  }
})();
