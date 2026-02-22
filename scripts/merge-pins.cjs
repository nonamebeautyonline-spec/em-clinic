require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data } = await sb.from("admin_users").select("id, pinned_patients");
  const merged = [];
  const seen = new Set();
  for (const row of data || []) {
    for (const pid of row.pinned_patients || []) {
      if (!seen.has(pid)) {
        seen.add(pid);
        merged.push(pid);
      }
    }
  }
  console.log("Merged pins:", merged);

  for (const row of data || []) {
    const { error } = await sb
      .from("admin_users")
      .update({ pinned_patients: merged })
      .eq("id", row.id);
    console.log(row.id, error ? "ERROR: " + error.message : "ok");
  }
})();
