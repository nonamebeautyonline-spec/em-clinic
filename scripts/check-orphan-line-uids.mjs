// message_logにline_uidがあるがintakeにline_idがないユーザーを検出
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

// 1) patient_id が null の message_log（intake作成に失敗した可能性）
const { data: nullPidMsgs } = await sb
  .from("message_log")
  .select("line_uid, content, direction, sent_at, event_type")
  .is("patient_id", null)
  .not("line_uid", "is", null)
  .order("sent_at", { ascending: false })
  .limit(100);

// line_uidごとにグループ化
const uidMap = new Map();
for (const m of nullPidMsgs || []) {
  if (!uidMap.has(m.line_uid)) {
    uidMap.set(m.line_uid, { events: [], firstSeen: m.sent_at });
  }
  uidMap.get(m.line_uid).events.push(m);
  // 最古のsent_atを保持
  if (m.sent_at < uidMap.get(m.line_uid).firstSeen) {
    uidMap.get(m.line_uid).firstSeen = m.sent_at;
  }
}

console.log(`=== patient_id=null の message_log から ${uidMap.size} ユニークLINE UID検出 ===\n`);

const token = envVars.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || envVars.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN;

for (const [uid, info] of uidMap) {
  // このline_uidでintakeがあるか
  const { data: intake } = await sb
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .eq("line_id", uid)
    .limit(1)
    .maybeSingle();

  // answersにあるか
  const { data: answerer } = await sb
    .from("answerers")
    .select("patient_id, name, line_id")
    .eq("line_id", uid)
    .limit(1)
    .maybeSingle();

  // LINEプロフィール
  let displayName = "(取得不可)";
  try {
    const r = await fetch("https://api.line.me/v2/bot/profile/" + uid, {
      headers: { Authorization: "Bearer " + token },
    });
    if (r.ok) { displayName = (await r.json()).displayName || "(名前なし)"; }
    else { displayName = "(blocked/unfollowed)"; }
  } catch (e) {}

  const eventTypes = info.events.map(e => e.event_type || e.direction).join(", ");
  const hasIntake = intake ? `intake: ${intake.patient_id} (${intake.patient_name})` : "intake: なし";
  const hasAnswerer = answerer ? `answerer: ${answerer.patient_id} (${answerer.name})` : "answerer: なし";

  console.log(`LINE UID: ...${uid.slice(-8)} | LINE名: ${displayName}`);
  console.log(`  ${hasIntake} | ${hasAnswerer}`);
  console.log(`  events(${info.events.length}件): ${eventTypes}`);
  console.log(`  初回: ${info.firstSeen}`);
  console.log("");
}
