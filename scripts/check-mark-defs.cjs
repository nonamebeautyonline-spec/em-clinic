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
  // mark_definitions テーブル
  const { data: defs, error } = await sb.from("mark_definitions").select("*").order("sort_order");
  if (error) { console.error("error:", error.message); return; }
  console.log("mark_definitions:");
  defs.forEach(d => {
    console.log(`  id=${d.id}  value="${d.value}"  label="${d.label}"  color="${d.color}"  sort_order=${d.sort_order}`);
  });
}

main().catch(console.error);
