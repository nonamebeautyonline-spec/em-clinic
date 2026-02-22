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

// patient_id=nullのmessage_logを全て、line_uidからintakeのpatient_idで埋める
const { data: nullMsgs } = await sb
  .from("message_log")
  .select("id, line_uid")
  .is("patient_id", null)
  .not("line_uid", "is", null);

let fixed = 0;
const uidCache = new Map();

for (const m of nullMsgs || []) {
  let pid = uidCache.get(m.line_uid);
  if (pid === undefined) {
    const { data: intake } = await sb.from("intake").select("patient_id").eq("line_id", m.line_uid).limit(1).maybeSingle();
    pid = intake?.patient_id || null;
    uidCache.set(m.line_uid, pid);
  }

  if (pid) {
    await sb.from("message_log").update({ patient_id: pid }).eq("id", m.id);
    fixed++;
  }
}

console.log(`Fixed ${fixed} / ${(nullMsgs || []).length} null patient_id message_log entries.`);
