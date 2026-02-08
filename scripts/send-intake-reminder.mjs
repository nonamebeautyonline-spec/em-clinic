// 問診未完了患者への一斉LINE通知 + message_logへ記録
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

const MESSAGE = `ご予約ありがとうございます。
本日マイページに不具合があり、問診項目が表示されない状況がありました。
マイページより問診の提出が可能となっておりますので、恐れ入りますが問診の提出をお願いいたします。`;

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
  // 対象患者を取得
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id, reserve_id, reserved_date, reserved_time, answers, status")
    .not("reserve_id", "is", null)
    .not("reserved_date", "is", null)
    .order("reserved_date", { ascending: true });

  if (error) { console.error("Error:", error.message); return; }

  const targets = data.filter(r => {
    if (r.status === "OK" || r.status === "NG") return false;
    if (!r.line_id) return false;
    const ans = r.answers || {};
    return typeof ans.ng_check !== "string" || ans.ng_check === "";
  });

  console.log(`=== 問診未完了患者への一斉通知 ===`);
  console.log(`対象: ${targets.length}人\n`);
  console.log(`メッセージ:\n${MESSAGE}\n`);
  console.log("-".repeat(60));

  let sent = 0;
  let failed = 0;

  for (const p of targets) {
    process.stdout.write(`${p.patient_name} (${p.patient_id}) ... `);

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
