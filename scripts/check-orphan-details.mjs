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
const token = envVars.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || envVars.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN;

const orphanPids = [
  "LINE_d8a3babe", "LINE_3e815dd6", "LINE_9e61e686",
  "LINE_2a244257", "LINE_a5734a31", "LINE_083ea138",
  "LINE_f85d1506", "LINE_895fac05",
];

for (const pid of orphanPids) {
  const { data: intake } = await sb.from("intake").select("patient_id, patient_name, line_id, line_display_name").eq("patient_id", pid).maybeSingle();
  if (!intake) { console.log(`${pid}: intake not found`); continue; }

  const { data: msgs } = await sb
    .from("message_log")
    .select("direction, content, event_type, sent_at")
    .eq("line_uid", intake.line_id)
    .order("sent_at", { ascending: true });

  let profileStatus = "unknown";
  try {
    const r = await fetch("https://api.line.me/v2/bot/profile/" + intake.line_id, {
      headers: { Authorization: "Bearer " + token },
    });
    profileStatus = r.ok ? "active" : `${r.status}`;
  } catch (e) {}

  console.log(`--- ${pid} (${intake.line_display_name || intake.patient_name}) ---`);
  console.log(`  LINE profile: ${profileStatus}`);
  console.log(`  message_log: ${(msgs || []).length}件`);
  for (const m of msgs || []) {
    console.log(`    ${m.sent_at} | ${m.event_type || m.direction} | ${(m.content || "").slice(0, 60)}`);
  }
  console.log("");
}
