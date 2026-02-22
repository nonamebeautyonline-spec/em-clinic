// 送信済み通知をmessage_logに記録
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

const message = "予約フォーム・マイページに不具合がありましたが現在改善しております。\nご確認いただけますと幸いです。";

// 数値ID患者
const numericPids = [
  "20260200109", "20260200629", "20260200630", "20260200631",
  "20260200632", "20260200633", "20260200634", "20260200635",
  "20260200636", "20260200637", "20260200638", "20260200639",
  "20260200640", "20260200641", "20260200642",
];

// LINE_仮ID患者
const orphanPids = [
  "LINE_d8a3babe", "LINE_3e815dd6", "LINE_9e61e686",
  "LINE_2a244257", "LINE_a5734a31", "LINE_083ea138",
  "LINE_f85d1506", "LINE_895fac05",
];

const allPids = [...numericPids, ...orphanPids];
let logged = 0;

for (const pid of allPids) {
  // line_uidを取得
  let lineUid = null;
  const { data: intake } = await sb.from("intake").select("line_id").eq("patient_id", pid).limit(1).maybeSingle();
  lineUid = intake?.line_id;
  if (!lineUid) {
    const { data: ans } = await sb.from("answerers").select("line_id").eq("patient_id", pid).maybeSingle();
    lineUid = ans?.line_id;
  }
  if (!lineUid) continue;

  const { error } = await sb.from("message_log").insert({
    patient_id: pid,
    line_uid: lineUid,
    direction: "outgoing",
    message_type: "individual",
    content: message,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed:", pid, error.message);
  } else {
    logged++;
  }
}

console.log(`Done. Logged ${logged} messages to message_log.`);
