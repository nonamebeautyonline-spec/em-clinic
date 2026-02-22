// answersにあるがintakeにないpatient_idを探す
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const { data: allAnswerers } = await sb
  .from("answerers")
  .select("patient_id, name, line_id")
  .not("patient_id", "like", "LINE_%")
  .order("patient_id", { ascending: false })
  .limit(500);

let orphans = [];
for (const a of allAnswerers || []) {
  const { data: intake } = await sb
    .from("intake")
    .select("patient_id")
    .eq("patient_id", a.patient_id)
    .limit(1)
    .maybeSingle();

  if (!intake) {
    orphans.push({ pid: a.patient_id, name: a.name, lineId: a.line_id ? "yes" : "no" });
  }
}

if (orphans.length === 0) {
  console.log("No orphan answerers found (all have matching intake records)");
} else {
  console.log("Orphan answerers (no intake):", orphans.length);
  for (const o of orphans) {
    console.log("  ", o.pid, o.name, "line_id:", o.lineId);
  }
}
