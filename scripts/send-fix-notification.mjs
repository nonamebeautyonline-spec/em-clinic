// 影響を受けた患者にLINEメッセージを送信
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

const message = "予約フォーム・マイページに不具合がありましたが現在改善しております。\nご確認いただけますと幸いです。";

// 影響を受けた患者のpatient_id一覧（数値ID 14人 + PID不一致 1人）
const numericPids = [
  "20260200109", "20260200629", "20260200630", "20260200631",
  "20260200632", "20260200633", "20260200634", "20260200635",
  "20260200636", "20260200637", "20260200638", "20260200639",
  "20260200640", "20260200641", "20260200642",
];

// LINE UIDを収集（重複排除）
const lineUids = new Set();

// 数値ID患者のline_id
for (const pid of numericPids) {
  const { data } = await sb.from("answerers").select("line_id").eq("patient_id", pid).maybeSingle();
  if (data?.line_id) lineUids.add(data.line_id);
}

// orphan LINE UID患者（LINE_仮IDのみ）
const orphanPids = [
  "LINE_d8a3babe", "LINE_3e815dd6", "LINE_9e61e686",
  "LINE_2a244257", "LINE_a5734a31", "LINE_083ea138",
  "LINE_f85d1506", "LINE_895fac05",
];
for (const pid of orphanPids) {
  const { data } = await sb.from("intake").select("line_id").eq("patient_id", pid).maybeSingle();
  if (data?.line_id) lineUids.add(data.line_id);
}

console.log(`送信対象: ${lineUids.size}人\n`);

let sent = 0, failed = 0;
for (const uid of lineUids) {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: uid,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (res.ok) {
      // 名前を取得して表示
      const { data: ans } = await sb.from("answerers").select("name").eq("line_id", uid).maybeSingle();
      const { data: intake } = await sb.from("intake").select("patient_name").eq("line_id", uid).limit(1).maybeSingle();
      const name = ans?.name || intake?.patient_name || uid.slice(-8);
      console.log(`✓ ${name}`);
      sent++;
    } else {
      const text = await res.text();
      console.error(`✗ ${uid.slice(-8)}: ${res.status} ${text}`);
      failed++;
    }
  } catch (e) {
    console.error(`✗ ${uid.slice(-8)}: ${e.message}`);
    failed++;
  }
}

console.log(`\n送信完了: ${sent}件 / 失敗: ${failed}件`);
