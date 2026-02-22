const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await sb.from("message_log")
    .select("id, patient_id, direction, content, sent_at, message_type, event_type")
    .eq("patient_id", "20260200701")
    .order("sent_at", { ascending: true });

  console.log("message_log count:", data?.length || 0);
  if (error) { console.error("error:", error.message); return; }
  if (data) {
    for (const m of data) {
      console.log(`  ${m.id} ${m.direction || "—"} ${m.event_type || m.message_type || "—"} ${m.sent_at} ${(m.content || "").slice(0, 60)}`);
    }
  }
}

main().catch(console.error);
