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

const pid = "20260200109";
const { data: ans } = await sb.from("answerers").select("*").eq("patient_id", pid).maybeSingle();

let displayName = null, pictureUrl = null;
if (ans.line_id) {
  try {
    const r = await fetch("https://api.line.me/v2/bot/profile/" + ans.line_id, {
      headers: { Authorization: "Bearer " + token },
    });
    if (r.ok) { const p = await r.json(); displayName = p.displayName; pictureUrl = p.pictureUrl; }
  } catch (e) {}
}

const answers = {};
if (ans.name) { answers["氏名"] = ans.name; answers.name = ans.name; }
if (ans.name_kana) { answers["カナ"] = ans.name_kana; answers.name_kana = ans.name_kana; }
if (ans.sex) { answers["性別"] = ans.sex; answers.sex = ans.sex; }
if (ans.birthday) { answers["生年月日"] = ans.birthday; answers.birth = ans.birthday; }

const { error } = await sb.from("intake").insert({
  patient_id: pid, patient_name: ans.name, line_id: ans.line_id,
  line_display_name: displayName, line_picture_url: pictureUrl, answers,
});

if (error) console.error("Failed:", error.message);
else console.log("Created intake for", pid, ans.name, "LINE:", displayName);
