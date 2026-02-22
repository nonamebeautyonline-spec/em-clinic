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

// line_uidの末尾で検索
const { data: msgs } = await sb
  .from("message_log")
  .select("*")
  .like("line_uid", "%002cfebf")
  .order("sent_at", { ascending: true });

const lineUid = msgs?.[0]?.line_uid;
console.log("LINE UID:", lineUid);
console.log("message_log:", (msgs || []).length, "件");
for (const m of msgs || []) {
  console.log(`  ${m.sent_at} | pid=${m.patient_id} | ${m.event_type || m.direction} | ${(m.content || "").slice(0, 50)}`);
}

if (lineUid) {
  const { data: intakes } = await sb.from("intake").select("patient_id, patient_name, line_id, created_at").eq("line_id", lineUid);
  console.log("\nintake by line_id:", JSON.stringify(intakes, null, 2));

  const pid = `LINE_${lineUid.slice(-8)}`;
  const { data: byPid } = await sb.from("intake").select("patient_id, patient_name, line_id, created_at").eq("patient_id", pid);
  console.log("\nintake by patient_id (LINE_002cfebf):", JSON.stringify(byPid, null, 2));

  const { data: answerer } = await sb.from("answerers").select("*").eq("line_id", lineUid);
  console.log("\nanswerer by line_id:", JSON.stringify(answerer, null, 2));
}
