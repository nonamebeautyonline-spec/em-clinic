const { readFileSync } = require("fs");
const { resolve } = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const [key, ...vp] = t.split("=");
  if (key && vp.length > 0) {
    let v = vp.join("=").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envVars[key.trim()] = v;
  }
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const pid = "20260100866";
  const { data, error } = await sb
    .from("intake")
    .select("id, patient_id, patient_name, status, created_at, answers")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  console.log("=== intake for " + pid + " ===");
  if (error) { console.error("error:", error); return; }
  for (const row of data || []) {
    const answers = row.answers || {};
    const ngCheck = answers.ng_check;
    console.log("  id=" + row.id + "  status=" + row.status + "  created=" + row.created_at);
    console.log("  ng_check=" + JSON.stringify(ngCheck) + "  hasIntake=" + (!!ngCheck && typeof ngCheck === "string" && ngCheck !== ""));
    console.log("  answer keys:", Object.keys(answers).join(", "));
  }
}

main().catch(console.error);
