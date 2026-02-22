// intakeもanswererもないLINE UIDに仮LINE_レコードを作成
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

const orphanUids = [
  "U01ac0faee9a8e9f51e95c44c002cfebf",  // とよ
  "U1bad28e73bede9a48e9e8eb7a5734a31",  // 𝑨
  "Uf8bf2e3e2e6e97cf5b2e47662a244257",  // N⭐︎
  "U7e3dba8dcfe5c07a0a6b6a669e61e686",  // 🐸
];

// message_logから正確なline_uidを取得
const { data: nullMsgs } = await sb
  .from("message_log")
  .select("line_uid")
  .is("patient_id", null)
  .not("line_uid", "is", null);

const uniqueUids = [...new Set((nullMsgs || []).map(m => m.line_uid))];

let repaired = 0;
for (const uid of uniqueUids) {
  // intake にあるか
  const { data: intake } = await sb.from("intake").select("patient_id").eq("line_id", uid).limit(1).maybeSingle();
  if (intake) continue;

  // answerer にあるか
  const { data: answerer } = await sb.from("answerers").select("patient_id").eq("line_id", uid).limit(1).maybeSingle();
  if (answerer) continue;

  // LINE プロフィール取得
  let displayName = null, pictureUrl = null;
  try {
    const r = await fetch("https://api.line.me/v2/bot/profile/" + uid, {
      headers: { Authorization: "Bearer " + token },
    });
    if (r.ok) {
      const p = await r.json();
      displayName = p.displayName;
      pictureUrl = p.pictureUrl;
    }
  } catch (e) {}

  const patientId = `LINE_${uid.slice(-8)}`;
  const name = displayName || `LINE_${uid.slice(-6)}`;

  const { error } = await sb.from("intake").insert({
    patient_id: patientId,
    patient_name: name,
    line_id: uid,
    line_display_name: displayName,
    line_picture_url: pictureUrl,
  });

  if (error) {
    console.error("Failed:", uid.slice(-8), name, error.message);
  } else {
    console.log("Created:", patientId, name);
    repaired++;
  }

  // message_log の patient_id も更新
  await sb.from("message_log").update({ patient_id: patientId }).eq("line_uid", uid).is("patient_id", null);
}

console.log(`\nDone. Repaired ${repaired} orphan LINE UIDs.`);
