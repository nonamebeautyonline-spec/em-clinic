// 問診未完了24人への一斉LINE通知 + message_logへ記録
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);
const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const MESSAGE = `度々申し訳ありません。\nマイページの問診ボタンの表示が改善されましたので再度お試しいただけますと幸いです。`;

const TARGET_IDS = [
  '20260200560','20260200458','20260200453','20260200504','20260200565',
  '20260200568','20260200581','20260200582','20260200583','20260200587',
  '20260200586','20260200562','20260200571','20260200314','20260200579',
  '20260200585','20260200577','20260200588','20260100110','20260200570',
  '20260200572','20260200576','20260200580','20260200346'
];

async function pushMessage(lineUserId, text) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error(`  LINE Push Error ${res.status}: ${err}`);
  }
  return res;
}

async function main() {
  // 対象患者のline_idを取得
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id, reserved_date, reserved_time")
    .in("patient_id", TARGET_IDS)
    .order("reserved_date", { ascending: true });

  if (error) { console.error("Error:", error.message); return; }

  // patient_idごとに最新1件
  const latest = {};
  for (const row of data) {
    if (!latest[row.patient_id]) latest[row.patient_id] = row;
  }

  const targets = TARGET_IDS.map(id => latest[id]).filter(Boolean).filter(r => r.line_id);

  console.log(`=== 問診未完了24人への通知 ===`);
  console.log(`対象: ${targets.length}人\n`);
  console.log(`メッセージ:\n${MESSAGE}\n`);
  console.log("-".repeat(60));

  let sent = 0;
  let failed = 0;

  for (const p of targets) {
    process.stdout.write(`${p.patient_name} (${p.patient_id}) ${p.reserved_date} ${p.reserved_time} ... `);

    try {
      const res = await pushMessage(p.line_id, MESSAGE);
      const status = res.ok ? "sent" : "failed";

      if (res.ok) {
        sent++;
        console.log("OK");
      } else {
        failed++;
        console.log("FAILED");
      }

      // message_logに記録
      await supabase.from("message_log").insert({
        patient_id: p.patient_id,
        line_uid: p.line_id,
        direction: "outgoing",
        event_type: "message",
        message_type: "intake_reminder",
        content: MESSAGE,
        status,
      });
    } catch (e) {
      failed++;
      console.log("ERROR:", e.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`送信完了: ${sent}人成功, ${failed}人失敗`);
}

main().catch(console.error);
