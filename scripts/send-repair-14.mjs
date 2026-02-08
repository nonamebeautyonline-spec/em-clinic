import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);
const TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const IDS = [
  "20260200565","20260200568","20260200570","20260200572",
  "20260200576","20260200577","20260200580","20260200581",
  "20260200582","20260200583","20260200585","20260200588",
  "20260200591","20260200592",
];

const MESSAGE = `本日のマイページのメンテナンスに伴い、一部の個人情報の再入力が必要となっております。

大変恐れ入りますが、下記より再度ご入力をお願いいたします。

https://app.noname-beauty.jp/repair

※こちらの入力のみで完了です。診察までの追加のお手続きはございません。`;

const { data, error } = await supabase
  .from("intake")
  .select("patient_id, patient_name, line_id")
  .in("patient_id", IDS);

if (error) { console.error(error); process.exit(1); }

let sent = 0, skipped = 0, failed = 0;

for (const r of data) {
  if (!r.line_id) {
    console.log(`SKIP ${r.patient_id} ${r.patient_name || "(空)"} — line_idなし`);
    skipped++;
    continue;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        to: r.line_id,
        messages: [{ type: "text", text: MESSAGE }],
      }),
    });

    if (res.ok) {
      console.log(`OK   ${r.patient_id} ${r.patient_name || "(空)"} → ${r.line_id}`);
      sent++;

      // message_logに記録
      await supabase.from("message_log").insert({
        line_uid: r.line_id,
        patient_id: r.patient_id,
        direction: "outbound",
        message_type: "text",
        content: MESSAGE,
        raw: { source: "repair-notification" },
      });
    } else {
      const body = await res.text();
      console.log(`FAIL ${r.patient_id} ${r.patient_name || "(空)"} — ${res.status} ${body}`);
      failed++;
    }
  } catch (e) {
    console.log(`ERR  ${r.patient_id} ${r.patient_name || "(空)"} — ${e.message}`);
    failed++;
  }
}

console.log(`\n=== 完了: 送信${sent} / スキップ${skipped} / 失敗${failed} ===`);
